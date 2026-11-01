import { Ytdl, chooseFormat, Client } from '@distube/ytdl-core';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { Readable } from 'stream';
import songModel from '../models/songModel.js';
import playlistModel from '../models/playlistModel.js';
import { uploadVideoFast } from './songController.js';

// In-memory format cache to make stream resolutions instant (TTL 2 hours)
const streamCache = new Map();

// Helper to fetch YouTube video info safely and quickly across cloud environments like Render
// Single Ytdl instance with VisionOS (ultra-fast, no player needed for music) + TV (bypasses bot verification) + WebEmbedded
export const fetchYouTubeInfo = async (videoId) => {
    try {
        const ytdl = new Ytdl({
            clients: [Client.VisionOS, Client.Tv, Client.WebEmbedded],
            timeoutMs: 14000,
        });
        const info = await ytdl.getInfo(videoId);
        if (info && Array.isArray(info.formats) && info.formats.length > 0) {
            return info;
        }
    } catch (err) {
        console.warn(`[YouTube Resolver] Fast multi-client failed for ${videoId}:`, err.message);
    }

    // Fallback: try TV client alone if bot verification was triggered
    try {
        const ytdlTv = new Ytdl({
            clients: [Client.Tv],
            timeoutMs: 12000,
        });
        const info = await ytdlTv.getInfo(videoId);
        if (info && Array.isArray(info.formats) && info.formats.length > 0) {
            return info;
        }
    } catch (tvErr) {
        console.warn(`[YouTube Resolver] TV fallback failed for ${videoId}:`, tvErr.message);
    }

    // Ultimate fallback to default client
    const ytdlDefault = new Ytdl({ timeoutMs: 20000 });
    return await ytdlDefault.getInfo(videoId);
};

// Helper to extract 11-char YouTube Video ID from any URL or raw ID
export const extractVideoId = (input) => {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const patterns = [
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([\w-]{11})/,
        /youtube\.com\/playlist\?list=([\w-]+)/,
    ];
    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
};

// 1. Resolve YouTube URL into Playable Song Metadata & Direct Stream
export const resolveYouTube = async (req, res) => {
    try {
        const { url, query } = req.body;
        const target = url || query;

        if (!target) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid YouTube URL or video ID",
            });
        }

        const videoId = extractVideoId(target);
        if (!videoId) {
            return res.status(400).json({
                success: false,
                message: "Could not extract a valid YouTube video ID from the provided link",
            });
        }

        const now = Date.now();
        const cached = streamCache.get(videoId);

        // Check if stream format in cache is still fresh (< 2 hours old)
        let formatUrl = cached && (now - cached.timestamp < 2 * 60 * 60 * 1000) ? cached.url : null;
        let details = cached ? cached.details : null;

        if (!formatUrl || !details) {
            const info = await fetchYouTubeInfo(videoId);

            // Select highest quality audio-only format
            const format = chooseFormat(info.formats, {
                filter: (f) => f.hasAudio && !f.hasVideo,
                quality: 'highestaudio',
            }) || chooseFormat(info.formats, {
                filter: (f) => f.hasAudio,
                quality: 'highestaudio',
            });

            if (!format || !format.url) {
                return res.status(422).json({
                    success: false,
                    message: "No playable audio format could be extracted from this YouTube video",
                });
            }

            formatUrl = format.url;
            const lengthSec = parseInt(info.videoDetails.lengthSeconds, 10) || 180;
            const mins = Math.floor(lengthSec / 60);
            const secs = lengthSec % 60;
            const duration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            const thumbs = info.videoDetails.thumbnails || [];
            const image = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            details = {
                title: info.videoDetails.title || "YouTube Track",
                artist: info.videoDetails.author?.name || "YouTube Artist",
                duration,
                durationMillis: lengthSec * 1000,
                image,
                bitrate: format.audioBitrate ? format.audioBitrate * 1000 : 128000,
            };

            // Save to memory cache
            streamCache.set(videoId, {
                url: formatUrl,
                details,
                timestamp: now,
            });
        }

        // Upsert into MongoDB song collection so it has a valid permanent ID and works everywhere in the app
        let songDoc = await songModel.findOne({ youtubeVideoId: videoId });

        if (!songDoc) {
            songDoc = await songModel.create({
                name: details.title,
                desc: `YouTube Track by ${details.artist}`,
                album: "YouTube Music",
                artist: details.artist,
                image: details.image,
                file: formatUrl,
                originalFile: formatUrl,
                streamUrl96k: formatUrl,
                streamUrl128k: formatUrl,
                duration: details.duration,
                durationMillis: details.durationMillis,
                bitrate: details.bitrate,
                youtubeVideoId: videoId,
                isYoutubeSong: true,
                isPlaylistOnly: false,
            });
        } else {
            // Refresh stream URL in case original Google token expired
            songDoc.file = formatUrl;
            songDoc.originalFile = formatUrl;
            songDoc.streamUrl96k = formatUrl;
            songDoc.streamUrl128k = formatUrl;
            if (details.image) songDoc.image = details.image;
            if (details.duration) songDoc.duration = details.duration;
            await songDoc.save();
        }

        return res.json({
            success: true,
            message: `Ready to play: ${details.title}`,
            song: songDoc,
            directStreamUrl: formatUrl,
        });
    } catch (error) {
        console.error("YouTube Resolve Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to resolve YouTube audio stream",
        });
    }
};

// 2. Proxy Stream Endpoint for smooth Range seeking & fallback
export const proxyStream = async (req, res) => {
    try {
        const { videoId } = req.params;
        if (!videoId) {
            return res.status(400).send("videoId required");
        }

        let streamUrl = null;
        const cached = streamCache.get(videoId);
        if (cached && (Date.now() - cached.timestamp < 60 * 60 * 1000)) {
            streamUrl = cached.url;
        }

        const getFreshFormat = async () => {
            const info = await fetchYouTubeInfo(videoId);
            const format = chooseFormat(info.formats, {
                filter: (f) => f.hasAudio && !f.hasVideo,
                quality: 'highestaudio',
            }) || chooseFormat(info.formats, {
                filter: (f) => f.hasAudio,
                quality: 'highestaudio',
            });
            if (format?.url) {
                streamCache.set(videoId, { url: format.url, details: {}, timestamp: Date.now() });
                return format.url;
            }
            return null;
        };

        if (!streamUrl) {
            streamUrl = await getFreshFormat();
        }

        if (!streamUrl) {
            return res.status(404).send("Stream not found");
        }

        const headers = {};
        if (req.headers.range) {
            headers.range = req.headers.range;
        }

        let upstream = await fetch(streamUrl, { headers });

        // If upstream expired (403 Forbidden), evict cache and retry once with fresh stream
        if (upstream.status === 403 || !upstream.ok) {
            console.log(`[ProxyStream] Stream expired/rejected (HTTP ${upstream.status}) for ${videoId}, re-fetching fresh format...`);
            streamCache.delete(videoId);
            streamUrl = await getFreshFormat();
            if (streamUrl) {
                upstream = await fetch(streamUrl, { headers });
            }
        }

        if (!upstream || !upstream.ok) {
            return res.status(upstream?.status || 500).send("Upstream audio stream unavailable");
        }

        res.status(upstream.status);
        for (const [key, val] of upstream.headers.entries()) {
            if (['content-range', 'content-length', 'content-type', 'accept-ranges'].includes(key.toLowerCase())) {
                res.setHeader(key, val);
            }
        }

        if (upstream.body) {
            Readable.fromWeb(upstream.body).pipe(res);
        } else {
            res.end();
        }
    } catch (error) {
        console.error("YouTube Proxy Stream Error:", error.message);
        if (!res.headersSent) {
            res.status(500).send("Stream error: " + error.message);
        }
    }
};

// 3. Direct Fast Device Download Endpoint (Streams as .mp3 attachment for one-click downloading)
export const downloadYouTube = async (req, res) => {
    try {
        const { videoId } = req.params;
        if (!videoId) {
            return res.status(400).send("videoId required");
        }

        let streamUrl = null;
        let title = "YouTube Audio Track";

        const cached = streamCache.get(videoId);
        if (cached && (Date.now() - cached.timestamp < 2 * 60 * 60 * 1000)) {
            streamUrl = cached.url;
            title = cached.details?.title || title;
        } else {
            const info = await fetchYouTubeInfo(videoId);
            const format = chooseFormat(info.formats, {
                filter: (f) => f.hasAudio && !f.hasVideo,
                quality: 'highestaudio',
            }) || chooseFormat(info.formats, {
                filter: (f) => f.hasAudio,
                quality: 'highestaudio',
            });
            if (format?.url) {
                streamUrl = format.url;
                title = info.videoDetails?.title || title;
                streamCache.set(videoId, {
                    url: format.url,
                    details: { title },
                    timestamp: Date.now(),
                });
            }
        }

        if (!streamUrl) {
            return res.status(404).send("Audio stream not found");
        }

        const safeFilename = title.replace(/[^\w\s.-]/gi, '').trim().replace(/\s+/g, '_') || 'YouTube_Song';
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        const upstream = await fetch(streamUrl);
        if (!upstream.ok) {
            return res.status(upstream.status).send("Failed to stream upstream audio");
        }

        const contentLength = upstream.headers.get('content-length');
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        if (upstream.body) {
            Readable.fromWeb(upstream.body).pipe(res);
        } else {
            res.end();
        }
    } catch (error) {
        console.error("YouTube Download Error:", error.message);
        if (!res.headersSent) {
            res.status(500).send("Download error: " + error.message);
        }
    }
};

// 3. Admin YouTube Import to Playlist or as Single Track
export const importYouTubeAdmin = async (req, res) => {
    try {
        const {
            url,
            name,
            artist,
            desc,
            destinationType,
            playlistId,
            album,
            videoStartTime,
            videoEndTime,
            videoSongDelay,
            fullscreenImage,
            imageDisplayMode,
        } = req.body;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, message: "YouTube URL is required" });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ success: false, message: "Invalid YouTube URL or video ID" });
        }

        const files = req.files || [];
        const customImageFile = Array.isArray(files) ? files.find(f => f.fieldname === 'image') : req.files?.image?.[0];
        const videoFile = Array.isArray(files) ? files.find(f => f.fieldname === 'video') : req.files?.video?.[0];

        // 1. Resolve YouTube stream & metadata
        let formatUrl = null;
        let details = null;
        const cached = streamCache.get(videoId);
        if (cached && (Date.now() - cached.timestamp < 2 * 60 * 60 * 1000)) {
            formatUrl = cached.url;
            details = cached.details;
        } else {
            const info = await fetchYouTubeInfo(videoId);
            const format = chooseFormat(info.formats, {
                filter: (f) => f.hasAudio && !f.hasVideo,
                quality: 'highestaudio',
            }) || chooseFormat(info.formats, {
                filter: (f) => f.hasAudio,
                quality: 'highestaudio',
            });

            if (!format || !format.url) {
                return res.status(422).json({ success: false, message: "Could not extract playable audio from this YouTube link" });
            }

            formatUrl = format.url;
            const lengthSec = parseInt(info.videoDetails.lengthSeconds, 10) || 180;
            const mins = Math.floor(lengthSec / 60);
            const secs = lengthSec % 60;
            const duration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            const thumbs = info.videoDetails.thumbnails || [];
            const image = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            details = {
                title: info.videoDetails.title || "YouTube Track",
                artist: info.videoDetails.author?.name || "YouTube Artist",
                desc: (info.videoDetails.description || "").slice(0, 180),
                duration,
                durationMillis: lengthSec * 1000,
                image,
                bitrate: format.audioBitrate ? format.audioBitrate * 1000 : 128000,
            };

            streamCache.set(videoId, { url: formatUrl, details, timestamp: Date.now() });
        }

        // 2. Custom Artwork Image handling
        let finalImageUrl = details.image;
        if (customImageFile) {
            try {
                const imgUpload = await cloudinary.uploader.upload(customImageFile.path, {
                    resource_type: "image",
                    folder: "pulsesound/covers",
                    format: "webp",
                    transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto:good" }],
                });
                finalImageUrl = imgUpload.secure_url;
            } catch (err) {
                console.error("Custom artwork upload error:", err.message);
            } finally {
                try { fs.unlinkSync(customImageFile.path); } catch (_) {}
            }
        }

        // 3. Optional Video Canvas handling
        let videoUrl = "";
        let videoPublicId = "";
        if (videoFile) {
            try {
                const vUpload = await uploadVideoFast(videoFile.path);
                videoUrl = vUpload?.secure_url || "";
                videoPublicId = vUpload?.public_id || "";
            } catch (vErr) {
                console.error("Video canvas upload error:", vErr.message);
            } finally {
                try { fs.unlinkSync(videoFile.path); } catch (_) {}
            }
        }

        // 4. Resolve Album or Playlist
        const isAddToPlaylist = destinationType === 'playlist' && Boolean(playlistId);
        let targetPlaylist = null;
        let albumName = album || "Single";

        if (isAddToPlaylist) {
            targetPlaylist = await playlistModel.findById(playlistId);
            if (!targetPlaylist) {
                return res.status(404).json({ success: false, message: "Target playlist not found" });
            }
            albumName = targetPlaylist.name;
        }

        const isFullscreen = Boolean(
            fullscreenImage === true ||
            fullscreenImage === 'true' ||
            imageDisplayMode === 'fullscreen'
        );

        // 5. Create Song Document
        const newSong = new songModel({
            name: (name || details.title).trim(),
            desc: (desc || details.desc || `YouTube track by ${artist || details.artist}`).trim(),
            album: albumName,
            artist: (artist || details.artist).trim(),
            image: finalImageUrl,
            file: formatUrl,
            originalFile: formatUrl,
            streamUrl96k: formatUrl,
            streamUrl128k: formatUrl,
            duration: details.duration,
            durationMillis: details.durationMillis,
            bitrate: details.bitrate,
            youtubeVideoId: videoId,
            isYoutubeSong: true,
            isPlaylistOnly: isAddToPlaylist,
            playlistId: isAddToPlaylist ? targetPlaylist._id : undefined,
            video: videoUrl,
            videoPublicId: videoPublicId,
            videoStartTime: Number(videoStartTime) || 0,
            videoEndTime: Number(videoEndTime) || 0,
            videoSongDelay: Number(videoSongDelay) || 5,
            fullscreenImage: isFullscreen,
            imageDisplayMode: isFullscreen ? 'fullscreen' : 'regular',
        });

        await newSong.save();

        // 6. If added to playlist, push song ID and save playlist
        if (isAddToPlaylist && targetPlaylist) {
            targetPlaylist.songs = [...(targetPlaylist.songs || []), newSong._id];
            await targetPlaylist.save();
        }

        return res.json({
            success: true,
            message: isAddToPlaylist
                ? `Track "${newSong.name}" imported and added to playlist "${targetPlaylist.name}"!`
                : `Track "${newSong.name}" imported as a Single song!`,
            song: newSong,
            playlist: targetPlaylist,
        });
    } catch (error) {
        console.error("Admin YouTube Import Error:", error.message);
        return res.status(500).json({ success: false, message: error.message || "Failed to import YouTube track" });
    }
};

