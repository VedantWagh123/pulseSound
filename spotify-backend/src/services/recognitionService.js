import fs from 'fs';
import songModel from '../models/songModel.js';

// Helper to escape regex special characters
const escapeRegex = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Identify audio sample using AudD Music Recognition API
 */
const identifyWithAudD = async (filePath) => {
  const token = process.env.AUDD_API_TOKEN || 'test';
  
  if (!fs.existsSync(filePath)) {
    throw new Error('Audio sample file not found on server disk.');
  }

  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'audio/m4a' });
  const formData = new FormData();
  formData.append('file', blob, 'sample.m4a');
  formData.append('api_token', token);
  formData.append('return', 'apple_music,spotify,deezer');

  const response = await fetch('https://api.audd.io/', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`AudD recognition HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status === 'error') {
    // If error code is related to fingerprint or audio not recognizable
    if (data.error?.error_code === 300) {
      return { match: false, reason: 'unrecognized_audio', message: 'Could not detect a clear music fingerprint. Try playing the song louder or moving closer to the speaker.' };
    }
    throw new Error(data.error?.error_message || 'AudD service returned an error');
  }

  if (!data.result) {
    return { match: false, reason: 'not_found', message: 'No matching song found in global music database.' };
  }

  const res = data.result;
  
  // Extract high-resolution artwork
  let artworkUrl = '';
  if (res.spotify?.album?.images?.length > 0) {
    artworkUrl = res.spotify.album.images[0].url;
  } else if (res.apple_music?.artwork?.url) {
    artworkUrl = res.apple_music.artwork.url.replace('{w}', '600').replace('{h}', '600');
  }

  // Extract duration string
  let durationStr = '3:00';
  if (res.spotify?.duration_ms) {
    const totalSec = Math.floor(res.spotify.duration_ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    durationStr = `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  return {
    match: true,
    provider: 'audd',
    songTitle: res.title || 'Unknown Title',
    artist: res.artist || 'Unknown Artist',
    album: res.album || 'Unknown Album',
    releaseDate: res.release_date || '',
    duration: durationStr,
    artworkUrl,
    confidence: 96,
    externalLinks: {
      spotify: res.spotify?.external_urls?.spotify || '',
      appleMusic: res.apple_music?.url || '',
      youtube: '',
      songLink: res.song_link || '',
    },
  };
};

/**
 * Cross-reference recognized song with the PULSE SOUND local catalog
 */
const crossMatchWithPulseCatalog = async (recognizedData) => {
  if (!recognizedData.match) return recognizedData;

  const { songTitle, artist } = recognizedData;

  try {
    const cleanTitle = songTitle.trim().replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').trim();
    const cleanArtist = artist.trim();

    const titleRegex = new RegExp(escapeRegex(cleanTitle), 'i');
    const artistRegex = new RegExp(escapeRegex(cleanArtist), 'i');

    // 1. Try matching both title and artist
    let matchedTrack = await songModel.findOne({
      $and: [
        { name: { $regex: titleRegex } },
        { $or: [{ artist: { $regex: artistRegex } }, { desc: { $regex: artistRegex } }] },
      ],
    });

    // 2. If no exact match, try matching title alone
    if (!matchedTrack && cleanTitle.length > 2) {
      matchedTrack = await songModel.findOne({
        name: { $regex: titleRegex },
      });
    }

    if (matchedTrack) {
      return {
        ...recognizedData,
        inPulseSound: true,
        pulseSongId: matchedTrack._id,
        pulseTrack: {
          id: matchedTrack._id,
          _id: matchedTrack._id,
          name: matchedTrack.name,
          artist: matchedTrack.artist || 'Pulse Artist',
          desc: matchedTrack.desc,
          album: matchedTrack.album,
          image: matchedTrack.image,
          file: matchedTrack.file,
          duration: matchedTrack.duration,
          video: matchedTrack.video || '',
          fullscreenImage: matchedTrack.fullscreenImage || false,
          imageDisplayMode: matchedTrack.imageDisplayMode || 'regular',
        },
      };
    }
  } catch (err) {
    console.warn('⚠️ [PulseFind] Catalog cross-match check notice:', err.message);
  }

  return {
    ...recognizedData,
    inPulseSound: false,
    pulseSongId: null,
    pulseTrack: null,
  };
};

/**
 * Main identify function
 */
export const recognizeAudioFile = async (filePath) => {
  try {
    // 1. Send sample to AudD
    const result = await identifyWithAudD(filePath);

    // 2. Cross-match with local catalog
    const enrichedResult = await crossMatchWithPulseCatalog(result);

    return enrichedResult;
  } finally {
    // 3. Immediately clean up temporary recorded audio file from disk
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      console.warn('⚠️ [PulseFind] Could not delete temp audio sample:', cleanupErr.message);
    }
  }
};

