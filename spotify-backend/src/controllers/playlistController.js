import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import playlistModel from '../models/playlistModel.js';
import songModel from '../models/songModel.js';
import { uploadAudioFast, uploadVideoFast } from './songController.js';

const addPlaylist = async (req, res) => {
    try {
        const { name, desc, theory } = req.body;
        const color = req.body.bgColour || req.body.bgColor || "#7C3AED";

        if (!name || !desc) {
            return res.status(400).json({
                success: false,
                message: "Playlist name and description are required",
            });
        }

        const files = req.files || [];

        // 1. Find the playlist cover image
        const playlistCoverFile = files.find(f => f.fieldname === 'image' || f.fieldname === 'playlistImage');
        let imageUrl = '';
        if (playlistCoverFile) {
            const imageUpload = await cloudinary.uploader.upload(playlistCoverFile.path, {
                resource_type: "image",
                folder: "pulsesound/playlists",
                format: "webp",
                transformation: [{ width: 1000, height: 1000, crop: "limit", quality: "auto:good" }],
            });
            imageUrl = imageUpload.secure_url;
        } else if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('http')) {
            imageUrl = req.body.image;
        } else {
            return res.status(400).json({
                success: false,
                message: "Playlist thumbnail image is required (file upload or image URL)",
            });
        }

        // 2. Parse any pre-existing song IDs if sent
        let existingSongIds = [];
        if (req.body.songs) {
            try {
                if (Array.isArray(req.body.songs)) {
                    existingSongIds = req.body.songs;
                } else if (typeof req.body.songs === 'string') {
                    const parsed = JSON.parse(req.body.songs);
                    existingSongIds = Array.isArray(parsed) ? parsed : [parsed];
                }
            } catch (_) {
                if (typeof req.body.songs === 'string') {
                    existingSongIds = req.body.songs.split(',').map(s => s.trim()).filter(Boolean);
                }
            }
        }

        // 3. Create the Playlist Document first so we have playlist._id
        const playlist = new playlistModel({
            name: name.trim(),
            desc: desc.trim(),
            theory: (theory || '').trim(),
            bgColour: color,
            bgColor: color,
            image: imageUrl,
            songs: existingSongIds,
            isPublic: true,
        });
        await playlist.save();

        // 4. Parse custom uploaded songs metadata
        let uploadedSongsMeta = [];
        if (req.body.songsMetadata) {
            try {
                uploadedSongsMeta = typeof req.body.songsMetadata === 'string'
                    ? JSON.parse(req.body.songsMetadata)
                    : req.body.songsMetadata;
            } catch (err) {
                console.log('Error parsing songsMetadata:', err.message);
            }
        }

        // SMART TRICK: Parallel Chunked Uploads for Instant Ingestion!
        // All songs, covers, and video canvases in the playlist are uploaded concurrently!
        const songTasks = uploadedSongsMeta.map(async (songMeta, i) => {
            const songName = (songMeta.name || `Track ${i + 1}`).trim();
            const songArtist = (songMeta.artist || "Pulse Artist").trim();
            const songDesc = (songMeta.desc || desc || "").trim();

            const audioFile = files.find(f => f.fieldname === `audio_${i}`);
            if (!audioFile) return null;

            const songImageFile = files.find(f => f.fieldname === `songImage_${i}`);
            const videoFile = files.find(f => f.fieldname === `video_${i}` || f.fieldname === `songVideo_${i}`);

            // Parallel uploads for audio, image, and video canvas
            const [audioUpload, sImgUpload, vUpload] = await Promise.all([
                uploadAudioFast(audioFile.path),
                songImageFile
                    ? cloudinary.uploader.upload(songImageFile.path, {
                        resource_type: "image",
                        folder: "pulsesound/covers",
                        format: "webp",
                        transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto:good" }],
                    })
                    : Promise.resolve(null),
                videoFile
                    ? uploadVideoFast(videoFile.path)
                    : Promise.resolve(null),
            ]);

            // Clean up temporary local files
            try { fs.unlink(audioFile.path, () => {}); } catch (_) {}
            if (songImageFile) { try { fs.unlink(songImageFile.path, () => {}); } catch (_) {} }
            if (videoFile) { try { fs.unlink(videoFile.path, () => {}); } catch (_) {} }

            let songImageUrl = imageUrl;
            if (sImgUpload) {
                songImageUrl = sImgUpload.secure_url;
            } else if (songMeta.imageUrl) {
                songImageUrl = songMeta.imageUrl;
            }

            let videoUrl = vUpload?.secure_url || songMeta.videoUrl || songMeta.video || "";
            let videoPublicId = vUpload?.public_id || "";

            let duration = "3:00";
            let durationMillis = 180000;
            if (audioUpload && audioUpload.duration) {
                const totalSeconds = Math.round(audioUpload.duration);
                durationMillis = totalSeconds * 1000;
                const mins = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                duration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            }

            const isSongFullscreen = Boolean(
                songMeta.fullscreenImage === true ||
                songMeta.fullscreenImage === 'true' ||
                songMeta.imageDisplayMode === 'fullscreen'
            );

            const videoStartTime = Number(songMeta.videoStartTime) || 0;
            const videoEndTime = Number(songMeta.videoEndTime) || 0;
            const videoSongDelay = songMeta.videoSongDelay !== undefined && songMeta.videoSongDelay !== ''
                ? Number(songMeta.videoSongDelay)
                : 5;

            const newSong = new songModel({
                name: songName,
                desc: songDesc,
                album: name.trim(),
                artist: songArtist,
                image: songImageUrl,
                file: audioUpload.secure_url,
                video: videoUrl,
                videoPublicId: videoPublicId,
                videoStartTime,
                videoEndTime,
                videoSongDelay,
                streamUrl96k: audioUpload.secure_url,
                streamUrl128k: audioUpload.secure_url,
                originalFile: audioUpload.secure_url,
                publicId: audioUpload.public_id,
                fileSize: audioUpload.bytes || 0,
                duration,
                durationMillis,
                bitrate: audioUpload.bit_rate || 128000,
                isPlaylistOnly: true,
                playlistId: playlist._id,
                fullscreenImage: isSongFullscreen,
                imageDisplayMode: isSongFullscreen ? 'fullscreen' : 'regular',
            });

            await newSong.save();
            return newSong._id;
        });

        const createdSongResults = await Promise.all(songTasks);
        const createdSongIds = createdSongResults.filter(Boolean);

        // Attach all created exclusive songs to playlist
        if (createdSongIds.length > 0) {
            playlist.songs = [...existingSongIds, ...createdSongIds];
            await playlist.save();
        }

        const populatedPlaylist = await playlistModel.findById(playlist._id).populate('songs');
        const totalCount = Array.isArray(populatedPlaylist?.songs) ? populatedPlaylist.songs.length : 0;

        res.json({
            success: true,
            message: `Public Playlist "${name}" Created Successfully with ${totalCount} songs! 🎵`,
            playlist: populatedPlaylist,
        });
    } catch (error) {
        console.error("Error adding playlist:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const listPlaylist = async (req, res) => {
    try {
        const playlists = await playlistModel.find({}).populate('songs').sort({ _id: -1 });

        const processed = await Promise.all(playlists.map(async (pl) => {
            const pObj = pl.toObject ? pl.toObject() : { ...pl };

            // 1. Filter out any null, undefined, or missing references from populated songs
            let validSongs = Array.isArray(pObj.songs) ? pObj.songs.filter(Boolean) : [];

            // 2. Self-healing: Find any songs in MongoDB that point to this playlist by playlistId or album name
            const linkedSongs = await songModel.find({
                $or: [
                    { playlistId: pl._id },
                    { album: pl.name },
                ]
            });

            const existingIds = new Set(validSongs.map(s => String(s._id || s.id)));
            let hasNewLinks = false;

            for (const ls of linkedSongs) {
                const lsId = String(ls._id);
                if (!existingIds.has(lsId)) {
                    existingIds.add(lsId);
                    validSongs.push(ls.toObject ? ls.toObject() : ls);
                    hasNewLinks = true;
                }
            }

            // Sync MongoDB playlist document if any discrepancy existed
            const currentSongIdCount = Array.isArray(pl.songs) ? pl.songs.length : 0;
            if (hasNewLinks || currentSongIdCount !== validSongs.length) {
                await playlistModel.updateOne(
                    { _id: pl._id },
                    { $set: { songs: validSongs.map(s => s._id) } }
                ).catch((err) => console.log('Auto-healing playlist error:', err.message));
            }

            // 3. Process URLs for all valid songs
            pObj.songs = validSongs.map((song) => {
                if (!song || typeof song !== 'object') return song;
                const sObj = song.toObject ? song.toObject() : { ...song };
                if (!sObj.streamUrl96k && sObj.publicId) {
                    sObj.streamUrl96k = cloudinary.url(sObj.publicId, {
                        resource_type: 'video',
                        format: 'mp3',
                        bit_rate: '96k',
                        secure: true,
                    });
                }
                if (!sObj.streamUrl128k && sObj.publicId) {
                    sObj.streamUrl128k = cloudinary.url(sObj.publicId, {
                        resource_type: 'video',
                        format: 'mp3',
                        bit_rate: '128k',
                        secure: true,
                    });
                }
                return sObj;
            });

            return pObj;
        }));

        res.json({ success: true, playlists: processed });
    } catch (error) {
        console.error("Error listing playlists:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const removePlaylist = async (req, res) => {
    try {
        const id = req.body.id || req.body._id;
        if (!id) {
            return res.status(400).json({ success: false, message: "Playlist ID is required" });
        }

        await playlistModel.findByIdAndDelete(id);
        // Also remove any songs exclusive to this playlist
        await songModel.deleteMany({ playlistId: id, isPlaylistOnly: true });

        res.json({ success: true, message: "Playlist Removed Successfully" });
    } catch (error) {
        console.error("Error removing playlist:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPlaylist = async (req, res) => {
    try {
        const { id } = req.params;
        const playlist = await playlistModel.findById(id).populate('songs');
        if (!playlist) {
            return res.status(404).json({ success: false, message: "Playlist not found" });
        }

        let validSongs = Array.isArray(playlist.songs) ? playlist.songs.filter(Boolean) : [];
        const linkedSongs = await songModel.find({
            $or: [
                { playlistId: playlist._id },
                { album: playlist.name }
            ]
        });
        const existingIds = new Set(validSongs.map(s => String(s._id || s.id)));
        for (const ls of linkedSongs) {
            const lsId = String(ls._id);
            if (!existingIds.has(lsId)) {
                existingIds.add(lsId);
                validSongs.push(ls.toObject ? ls.toObject() : ls);
            }
        }
        const pObj = playlist.toObject ? playlist.toObject() : { ...playlist };
        pObj.songs = validSongs;
        res.json({ success: true, playlist: pObj });
    } catch (error) {
        console.error("Error getting playlist:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updatePlaylist = async (req, res) => {
    try {
        const id = req.body.id || req.body._id;
        if (!id) {
            return res.status(400).json({ success: false, message: "Playlist ID is required" });
        }

        const playlist = await playlistModel.findById(id);
        if (!playlist) {
            return res.status(404).json({ success: false, message: "Playlist not found" });
        }

        const { name, desc, theory, bgColour, bgColor } = req.body;
        if (name && name.trim()) playlist.name = name.trim();
        if (desc !== undefined) playlist.desc = desc.trim();
        if (theory !== undefined) playlist.theory = theory.trim();
        const color = bgColour || bgColor;
        if (color) {
            playlist.bgColour = color;
            playlist.bgColor = color;
        }

        const files = req.files || [];

        // 1. Cover Image Update if uploaded
        const playlistCoverFile = files.find(f => f.fieldname === 'image' || f.fieldname === 'playlistImage');
        if (playlistCoverFile) {
            const imageUpload = await cloudinary.uploader.upload(playlistCoverFile.path, {
                resource_type: "image",
                folder: "pulsesound/playlists",
                format: "webp",
                transformation: [{ width: 1000, height: 1000, crop: "limit", quality: "auto:good" }],
            });
            playlist.image = imageUpload.secure_url;
        } else if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('http')) {
            playlist.image = req.body.image;
        }

        // 2. Parse Remaining Existing Song IDs
        let remainingSongIds = [];
        if (req.body.existingSongIds !== undefined) {
            try {
                const parsed = typeof req.body.existingSongIds === 'string'
                    ? JSON.parse(req.body.existingSongIds)
                    : req.body.existingSongIds;
                const arr = Array.isArray(parsed) ? parsed : [parsed];
                remainingSongIds = arr.map(s => {
                    if (!s) return null;
                    if (typeof s === 'object') return String(s._id || s.id);
                    return String(s);
                }).filter(s => s && s !== 'undefined' && s !== 'null');
            } catch (_) {
                if (typeof req.body.existingSongIds === 'string') {
                    remainingSongIds = req.body.existingSongIds
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s && s !== 'undefined' && s !== 'null');
                }
            }
        } else {
            // If existingSongIds not explicitly sent, keep current songs
            remainingSongIds = (playlist.songs || []).map(s => String(s)).filter(Boolean);
        }

        // Clean up removed playlist-exclusive songs ONLY if explicit existingSongIds array was sent
        const originalSongIds = (playlist.songs || []).map(s => String(s)).filter(Boolean);
        if (req.body.existingSongIds !== undefined && originalSongIds.length > 0) {
            const removedSongIds = originalSongIds.filter(sId => !remainingSongIds.includes(sId));
            if (removedSongIds.length > 0) {
                await songModel.deleteMany({
                    _id: { $in: removedSongIds },
                    isPlaylistOnly: true,
                });
            }
        }

        // 3. Process Any Newly Uploaded Songs
        let uploadedSongsMeta = [];
        if (req.body.songsMetadata) {
            try {
                uploadedSongsMeta = typeof req.body.songsMetadata === 'string'
                    ? JSON.parse(req.body.songsMetadata)
                    : req.body.songsMetadata;
            } catch (err) {
                console.log('Error parsing songsMetadata in updatePlaylist:', err.message);
            }
        }

        // SMART TRICK: Parallel Chunked Uploads for Instant Ingestion in Update Playlist!
        const songTasks = uploadedSongsMeta.map(async (songMeta, i) => {
            const songName = (songMeta.name || `Track ${i + 1}`).trim();
            const songArtist = (songMeta.artist || "Pulse Artist").trim();
            const songDesc = (songMeta.desc || playlist.desc || "").trim();

            const audioFile = files.find(f => f.fieldname === `audio_${i}`);
            if (!audioFile) return null;

            const songImageFile = files.find(f => f.fieldname === `songImage_${i}`);
            const videoFile = files.find(f => f.fieldname === `video_${i}` || f.fieldname === `songVideo_${i}`);

            // Parallel uploads for audio, image, and video
            const [audioUpload, sImgUpload, vUpload] = await Promise.all([
                uploadAudioFast(audioFile.path),
                songImageFile
                    ? cloudinary.uploader.upload(songImageFile.path, {
                        resource_type: "image",
                        folder: "pulsesound/covers",
                        format: "webp",
                        transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto:good" }],
                    })
                    : Promise.resolve(null),
                videoFile
                    ? uploadVideoFast(videoFile.path)
                    : Promise.resolve(null),
            ]);

            // Clean up temporary local files
            try { fs.unlink(audioFile.path, () => {}); } catch (_) {}
            if (songImageFile) { try { fs.unlink(songImageFile.path, () => {}); } catch (_) {} }
            if (videoFile) { try { fs.unlink(videoFile.path, () => {}); } catch (_) {} }

            let songImageUrl = playlist.image;
            if (sImgUpload) {
                songImageUrl = sImgUpload.secure_url;
            } else if (songMeta.imageUrl) {
                songImageUrl = songMeta.imageUrl;
            }

            let videoUrl = vUpload?.secure_url || songMeta.videoUrl || songMeta.video || "";
            let videoPublicId = vUpload?.public_id || "";

            let duration = "3:00";
            let durationMillis = 180000;
            if (audioUpload && audioUpload.duration) {
                const totalSeconds = Math.round(audioUpload.duration);
                durationMillis = totalSeconds * 1000;
                const mins = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                duration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            }

            const isSongFullscreen = Boolean(
                songMeta.fullscreenImage === true ||
                songMeta.fullscreenImage === 'true' ||
                songMeta.imageDisplayMode === 'fullscreen'
            );

            const videoStartTime = Number(songMeta.videoStartTime) || 0;
            const videoEndTime = Number(songMeta.videoEndTime) || 0;
            const videoSongDelay = songMeta.videoSongDelay !== undefined && songMeta.videoSongDelay !== ''
                ? Number(songMeta.videoSongDelay)
                : 5;

            const newSong = new songModel({
                name: songName,
                desc: songDesc,
                album: playlist.name,
                artist: songArtist,
                image: songImageUrl,
                file: audioUpload.secure_url,
                video: videoUrl,
                videoPublicId: videoPublicId,
                videoStartTime,
                videoEndTime,
                videoSongDelay,
                streamUrl96k: audioUpload.secure_url,
                streamUrl128k: audioUpload.secure_url,
                originalFile: audioUpload.secure_url,
                publicId: audioUpload.public_id,
                fileSize: audioUpload.bytes || 0,
                duration,
                durationMillis,
                bitrate: audioUpload.bit_rate || 128000,
                isPlaylistOnly: true,
                playlistId: playlist._id,
                fullscreenImage: isSongFullscreen,
                imageDisplayMode: isSongFullscreen ? 'fullscreen' : 'regular',
            });

            await newSong.save();
            return newSong._id;
        });

        const createdSongResults = await Promise.all(songTasks);
        const createdSongIds = createdSongResults.filter(Boolean);

        // Process any video uploads or timing updates for remaining existing songs
        let existingTimings = {};
        if (req.body.existingSongTimings) {
            try {
                existingTimings = typeof req.body.existingSongTimings === 'string'
                    ? JSON.parse(req.body.existingSongTimings)
                    : req.body.existingSongTimings;
            } catch (_) {}
        }

        // Process any image artwork replacements, video canvas, or timings in parallel for remaining existing songs
        await Promise.all(remainingSongIds.map(async (sId) => {
            const existingVideoFile = files.find(f => f.fieldname === `existing_video_${sId}`);
            const existingImageFile = files.find(f => f.fieldname === `existing_image_${sId}`);
            const updateFields = {};

            let imgUpload = null;
            let vUpload = null;

            if (existingImageFile) {
                try {
                    imgUpload = await cloudinary.uploader.upload(existingImageFile.path, {
                        resource_type: "image",
                        folder: "pulsesound/covers",
                        format: "webp",
                        transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto:good" }],
                    });
                } catch (e) {
                    console.error(`Failed to upload existing image for song ${sId}:`, e.message);
                } finally {
                    try { fs.unlinkSync(existingImageFile.path); } catch (_) {}
                }
            }

            if (existingVideoFile) {
                try {
                    vUpload = await uploadVideoFast(existingVideoFile.path);
                } catch (e) {
                    console.error(`Failed to upload existing video for song ${sId}:`, e.message);
                } finally {
                    try { fs.unlinkSync(existingVideoFile.path); } catch (_) {}
                }
            }

            if (imgUpload && imgUpload.secure_url) {
                updateFields.image = imgUpload.secure_url;
            }
            if (vUpload && vUpload.secure_url) {
                updateFields.video = vUpload.secure_url;
                updateFields.videoPublicId = vUpload.public_id || "";
            }

            if (existingTimings[sId]) {
                const t = existingTimings[sId];
                if (t.videoStartTime !== undefined) updateFields.videoStartTime = Number(t.videoStartTime) || 0;
                if (t.videoEndTime !== undefined) updateFields.videoEndTime = Number(t.videoEndTime) || 0;
                if (t.videoSongDelay !== undefined) updateFields.videoSongDelay = Number(t.videoSongDelay) || 5;
            }

            if (Object.keys(updateFields).length > 0) {
                await songModel.findByIdAndUpdate(sId, updateFields);
            }
        }));

        // 4. Update playlist songs with remaining IDs + newly created IDs
        playlist.songs = [...remainingSongIds, ...createdSongIds];
        await playlist.save();

        const populatedPlaylist = await playlistModel.findById(playlist._id).populate('songs');

        res.json({
            success: true,
            message: `Playlist "${playlist.name}" updated successfully!`,
            playlist: populatedPlaylist,
        });
    } catch (error) {
        console.error("Error updating playlist:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const addSongToPlaylist = async (req, res) => {
    try {
        const { songId, playlistId } = req.body;
        if (!songId || !playlistId) {
            return res.status(400).json({ success: false, message: "songId and playlistId are required" });
        }

        const playlist = await playlistModel.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ success: false, message: "Playlist not found" });
        }

        const song = await songModel.findById(songId);
        if (!song) {
            return res.status(404).json({ success: false, message: "Song not found" });
        }

        // If a video file is uploaded, upload to Cloudinary and attach to the song!
        const files = req.files || [];
        const videoFile = Array.isArray(files)
            ? files.find(f => f.fieldname === 'video')
            : req.files?.video?.[0];

        if (videoFile) {
            try {
                const videoUpload = await uploadVideoFast(videoFile.path);
                if (videoUpload && videoUpload.secure_url) {
                    song.video = videoUpload.secure_url;
                    song.videoPublicId = videoUpload.public_id || "";
                }
            } catch (vErr) {
                console.error("Error uploading video in addSongToPlaylist:", vErr.message);
            } finally {
                try { fs.unlinkSync(videoFile.path); } catch (_) {}
            }
            await song.save();
        }

        if (req.body.videoStartTime !== undefined) {
            song.videoStartTime = Number(req.body.videoStartTime) || 0;
            await song.save();
        }
        if (req.body.videoEndTime !== undefined) {
            song.videoEndTime = Number(req.body.videoEndTime) || 0;
            await song.save();
        }
        if (req.body.videoSongDelay !== undefined) {
            song.videoSongDelay = Number(req.body.videoSongDelay) || 5;
            await song.save();
        }

        // Update image display mode if provided
        if (req.body.imageDisplayMode || req.body.fullscreenImage !== undefined) {
            const isFullscreen = Boolean(
                req.body.fullscreenImage === true ||
                req.body.fullscreenImage === 'true' ||
                req.body.imageDisplayMode === 'fullscreen'
            );
            song.fullscreenImage = isFullscreen;
            song.imageDisplayMode = isFullscreen ? 'fullscreen' : 'regular';
        }

        // Ensure bidirectional reference on song
        if (!song.playlistId) {
            song.playlistId = playlist._id;
        }
        await song.save();

        // Add song to playlist if not already present
        const songIdStr = String(song._id);
        const exists = (playlist.songs || []).some(s => String(s) === songIdStr);
        if (!exists) {
            playlist.songs.push(song._id);
            await playlist.save();
        }

        const updatedPlaylist = await playlistModel.findById(playlistId).populate('songs');

        res.json({
            success: true,
            message: `Song "${song.name}" added to playlist "${playlist.name}" successfully!`,
            song,
            playlist: updatedPlaylist,
        });
    } catch (error) {
        console.error("Error adding song to playlist:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export { addPlaylist, listPlaylist, removePlaylist, getPlaylist, updatePlaylist, addSongToPlaylist };
