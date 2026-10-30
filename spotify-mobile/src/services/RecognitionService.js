import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { getCandidateHosts } from '../config/api';

const LOCAL_HISTORY_KEY = '@pulse_find_local_history';

/**
 * Get active working backend URL for recognition API
 */
export const getActiveBackendHost = async () => {
  const hosts = getCandidateHosts();
  for (const host of hosts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${host}/`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);
      if (res && res.ok) {
        return host;
      }
    } catch (_) {}
  }
  return hosts[0] || 'https://pulsesound.onrender.com';
};

/**
 * Check if microphone recording permission is granted
 */
export const checkMicrophonePermission = async () => {
  try {
    const res = await getRecordingPermissionsAsync();
    return res.granted;
  } catch (err) {
    console.warn('[PulseFind] Error checking mic permission:', err.message);
    return false;
  }
};

/**
 * Request microphone recording permission
 */
export const requestMicrophonePermission = async () => {
  try {
    const res = await requestRecordingPermissionsAsync();
    return res.granted;
  } catch (err) {
    console.warn('[PulseFind] Error requesting mic permission:', err.message);
    return false;
  }
};

/**
 * Configure audio mode for microphone recording
 */
export const prepareAudioSessionForRecording = async () => {
  try {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
  } catch (err) {
    console.log('[PulseFind] Audio mode configuration notice:', err.message);
  }
};

/**
 * Send captured audio sample to backend recognition API
 */
export const identifyAudioSample = async (audioUri) => {
  if (!audioUri) {
    throw new Error('No audio sample recording available.');
  }

  const host = await getActiveBackendHost();
  const endpoint = `${host}/api/recognition/identify`;

  console.log(`🎙️ [PulseFind] Uploading sample to ${endpoint}`);

  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    name: 'pulse_sample.m4a',
    type: 'audio/m4a',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    if (!json.success) {
      throw new Error(json.message || 'Recognition service failed to process audio sample.');
    }

    if (json.match && json.data) {
      // Save to local cache
      await saveToLocalHistory(json.data);
    }

    return json;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Recognition request timed out. Please check your internet connection.');
    }
    throw err;
  }
};

/**
 * Save identified song to local history
 */
export const saveToLocalHistory = async (songData) => {
  try {
    const existing = await getLocalHistory();
    const entry = {
      id: songData.historyId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      songTitle: songData.songTitle,
      artist: songData.artist,
      album: songData.album,
      releaseDate: songData.releaseDate,
      duration: songData.duration,
      artworkUrl: songData.artworkUrl,
      confidence: songData.confidence || 95,
      inPulseSound: songData.inPulseSound || false,
      pulseSongId: songData.pulseSongId || null,
      pulseTrack: songData.pulseTrack || null,
      externalLinks: songData.externalLinks || {},
      recognizedAt: new Date().toISOString(),
    };

    // Filter out duplicates with same title & artist
    const filtered = existing.filter(
      (item) =>
        !(item.songTitle.toLowerCase() === entry.songTitle.toLowerCase() &&
          item.artist.toLowerCase() === entry.artist.toLowerCase())
    );

    const updated = [entry, ...filtered].slice(0, 50);
    await AsyncStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[PulseFind] Error saving to local history:', err.message);
  }
};

/**
 * Retrieve local recognition history
 */
export const getLocalHistory = async () => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (err) {
    return [];
  }
};

/**
 * Delete a single history item
 */
export const deleteLocalHistoryItem = async (historyId) => {
  try {
    const current = await getLocalHistory();
    const updated = current.filter((item) => item.id !== historyId);
    await AsyncStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));

    // Also attempt background delete from server
    try {
      const host = await getActiveBackendHost();
      fetch(`${host}/api/recognition/history/${historyId}`, { method: 'DELETE' }).catch(() => {});
    } catch (_) {}

    return updated;
  } catch (err) {
    console.warn('[PulseFind] Error deleting history item:', err.message);
    return [];
  }
};

/**
 * Clear all recognition history
 */
export const clearAllRecognitionHistory = async () => {
  try {
    await AsyncStorage.removeItem(LOCAL_HISTORY_KEY);
    try {
      const host = await getActiveBackendHost();
      fetch(`${host}/api/recognition/history/clear`, { method: 'DELETE' }).catch(() => {});
    } catch (_) {}
    return true;
  } catch (err) {
    return false;
  }
};

