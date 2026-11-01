import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { Platform, AppState, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { albumsData } from '../assets/assets';
import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { fetchLiveBackendData, deduplicateSongs, isMockOrLegacySong, startKeepAlive } from '../config/api';
import {
  getStoredDownloads,
  reconcileDownloads,
  getLocalTrackUri,
  downloadTrack,
  exportTrackToDeviceStorage,
  downloadPlaylist,
  removeDownloadedTrack,
  clearAllDownloads,
  getStorageStats,
  getCacheStats,
  clearStreamingCache,
  cacheStreamingSong,
  reconcileStreamingCache,
  getCacheIndex,
  precacheSong,
  precacheNextTracks,
  syncLikedSongsCache,
  isSongCached,
  refreshCachedSongIds,
  getEstimatedTrackSizeMB,
  getEstimatedPlaylistSizeMB,
  subscribeDownloads,
  isSongDownloading,
  getSongDownloadProgress,
  getDownloadSettings,
  saveDownloadSettings,
} from '../services/DownloadManager';

const PlayerContext = createContext();

function parseDurationToMillis(durationStr) {
  if (!durationStr) return 180000;
  const parts = durationStr.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return (mins * 60 + secs) * 1000;
  }
  return 180000;
}

// 9-Band Audio Customizer & Equalizer Definitions
export const DEFAULT_EQ_BANDS = [
  { freq: '32Hz', label: 'Sub', gain: 0 },
  { freq: '64Hz', label: 'Bass', gain: 0 },
  { freq: '125Hz', label: 'Low', gain: 0 },
  { freq: '250Hz', label: 'Mid-L', gain: 0 },
  { freq: '500Hz', label: 'Mid', gain: 0 },
  { freq: '1kHz', label: 'Mid-H', gain: 0 },
  { freq: '2kHz', label: 'Pres', gain: 0 },
  { freq: '4kHz', label: 'Brill', gain: 0 },
  { freq: '16kHz', label: 'Air', gain: 0 },
];

export const SPEED_8D_PERIODS = {
  Slow: 12000,
  Medium: 8000,
  Fast: 5000,
  Hyper: 3000,
};

export const AUDIO_PRESETS = {
  Balanced: {
    name: 'Balanced',
    bass: 0,
    vocals: 0,
    treble: 0,
    balance: 0,
    intensity: 100,
    subBass: 0,
    spatial360: false,
    spatialDepth: 75,
    audio8D: false,
    speed8D: 'Medium',
    headphoneBoost: false,
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    desc: 'Studio Reference • Natural uncolored playback',
    icon: 'disc-outline',
  },
  'Bass Boost': {
    name: 'Bass Boost',
    bass: 8,
    vocals: 0,
    treble: 2,
    balance: 0,
    intensity: 90,
    subBass: 7,
    spatial360: false,
    spatialDepth: 75,
    audio8D: false,
    speed8D: 'Medium',
    headphoneBoost: true,
    bands: [8, 7, 5, 2, 0, 0, 1, 2, 2],
    desc: 'Deep 808 sub-bass punch & club low-end',
    icon: 'flame-outline',
  },
  'Vocal Clarity': {
    name: 'Vocal Clarity',
    bass: -2,
    vocals: 7,
    treble: 5,
    balance: 0,
    intensity: 85,
    subBass: 0,
    spatial360: false,
    spatialDepth: 75,
    audio8D: false,
    speed8D: 'Medium',
    headphoneBoost: false,
    bands: [-3, -1, 1, 4, 7, 6, 5, 3, 1],
    desc: 'Intelligible broadcast vocal separation',
    icon: 'mic-outline',
  },
  'Soft / Relax': {
    name: 'Soft / Relax',
    bass: 3,
    vocals: -2,
    treble: -4,
    balance: 0,
    intensity: 60,
    subBass: 2,
    spatial360: true,
    spatialDepth: 60,
    audio8D: false,
    speed8D: 'Slow',
    headphoneBoost: false,
    bands: [3, 2, 1, -1, -2, -1, 0, -2, -4],
    desc: 'Warm mellow tone with rolled-off highs',
    icon: 'leaf-outline',
  },
  '360 Immersion': {
    name: '360 Immersion',
    bass: 3,
    vocals: 2,
    treble: 4,
    balance: 0,
    intensity: 100,
    subBass: 3,
    spatial360: true,
    spatialDepth: 85,
    audio8D: false,
    speed8D: 'Medium',
    headphoneBoost: false,
    bands: [3, 2, 1, 1, 2, 3, 4, 5, 4],
    desc: 'Concert hall 360° surround field',
    icon: 'planet-outline',
  },
  '8D Headphone': {
    name: '8D Headphone',
    bass: 4,
    vocals: 2,
    treble: 3,
    balance: 0,
    intensity: 100,
    subBass: 5,
    spatial360: true,
    spatialDepth: 80,
    audio8D: true,
    speed8D: 'Medium',
    headphoneBoost: true,
    bands: [4, 3, 1, 0, 2, 2, 3, 4, 3],
    desc: 'Hypnotic binaural ear-to-ear orbiting',
    icon: 'headset-outline',
  },
  Custom: {
    name: 'Custom',
    bass: 0,
    vocals: 0,
    treble: 0,
    balance: 0,
    intensity: 100,
    subBass: 0,
    spatial360: false,
    spatialDepth: 75,
    audio8D: false,
    speed8D: 'Medium',
    headphoneBoost: false,
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    desc: 'User custom audio profile',
    icon: 'options-outline',
  },
};

export const DEFAULT_AUDIO_EFFECTS = {
  enabled: true,
  preset: 'Balanced',
  bass: 0,        // -10 to +10 dB
  vocals: 0,      // -10 to +10 dB
  treble: 0,      // -10 to +10 dB
  balance: 0,     // -100 to +100 (0 = Center)
  intensity: 100, // 0 to 100%
  headphoneBoost: false, // Budget Headphone Optimizer (Sub-Bass + Vocal Air)
  subBass: 0,            // 0 to 10 dB Sub-Bass Exciter
  spatial360: false,     // 360° Spatial Surround Sound
  spatialDepth: 75,      // 20% to 100% Virtual Stage Depth
  audio8D: false,        // 8D Binaural Rotating Audio
  speed8D: 'Medium',     // 'Slow' | 'Medium' | 'Fast' | 'Hyper'
  bands: DEFAULT_EQ_BANDS,
};

export const EQ_PRESETS = {
  Flat: {
    name: 'Flat',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    enhancers: { bassBoost: 0, clarity: 0, ambience: 0, surround: 0, dynamicBoost: 0 },
    desc: 'Studio Reference • Natural uncolored playback',
    icon: 'disc-outline',
  },
  'Bass Boost': {
    name: 'Bass Boost',
    bands: [9, 8, 6, 3, 0, 0, 1, 2, 2],
    enhancers: { bassBoost: 85, clarity: 40, ambience: 20, surround: 35, dynamicBoost: 60 },
    desc: 'Deep 808 sub-bass punch & club low-end',
    icon: 'flame-outline',
  },
  Pop: {
    name: 'Pop',
    bands: [-1, 2, 4, 5, 4, 3, 4, 5, 3],
    enhancers: { bassBoost: 45, clarity: 75, ambience: 35, surround: 45, dynamicBoost: 55 },
    desc: 'Crisp upfront vocals & punchy bright rhythm',
    icon: 'sparkles-outline',
  },
  Rock: {
    name: 'Rock',
    bands: [6, 5, 3, -1, -2, 1, 4, 6, 7],
    enhancers: { bassBoost: 65, clarity: 70, ambience: 40, surround: 50, dynamicBoost: 75 },
    desc: 'Heavy drive, scooped mids & punchy drums',
    icon: 'musical-notes-outline',
  },
  'Electronic / EDM': {
    name: 'Electronic / EDM',
    bands: [8, 7, 4, 1, -1, 2, 5, 7, 8],
    enhancers: { bassBoost: 80, clarity: 80, ambience: 50, surround: 65, dynamicBoost: 70 },
    desc: 'Sub-bass rumble & shimmering synth top-end',
    icon: 'flash-outline',
  },
  'Hip-Hop': {
    name: 'Hip-Hop',
    bands: [9, 8, 5, 2, 0, 2, 3, 4, 2],
    enhancers: { bassBoost: 85, clarity: 65, ambience: 30, surround: 40, dynamicBoost: 65 },
    desc: 'Massive bottom-end with articulate vocal flow',
    icon: 'radio-outline',
  },
  'Vocal Booster': {
    name: 'Vocal Booster',
    bands: [-4, -2, 1, 4, 7, 7, 5, 2, 0],
    enhancers: { bassBoost: 20, clarity: 95, ambience: 30, surround: 25, dynamicBoost: 50 },
    desc: 'Intelligible broadcast vocal separation',
    icon: 'mic-outline',
  },
  Classical: {
    name: 'Classical',
    bands: [3, 2, 1, 0, 0, 2, 3, 4, 3],
    enhancers: { bassBoost: 25, clarity: 65, ambience: 80, surround: 70, dynamicBoost: 35 },
    desc: 'Concert hall spatial depth & acoustic warmth',
    icon: 'color-palette-outline',
  },
  Jazz: {
    name: 'Jazz',
    bands: [4, 4, 2, 1, 2, 2, 3, 2, 1],
    enhancers: { bassBoost: 40, clarity: 60, ambience: 60, surround: 50, dynamicBoost: 40 },
    desc: 'Smooth brass, warm upright bass & velvety tone',
    icon: 'wine-outline',
  },
  Acoustic: {
    name: 'Acoustic',
    bands: [3, 3, 1, 1, 3, 4, 4, 5, 4],
    enhancers: { bassBoost: 30, clarity: 75, ambience: 55, surround: 45, dynamicBoost: 45 },
    desc: 'Natural string vibration & organic air',
    icon: 'leaf-outline',
  },
};

export const PlayerProvider = ({ children }) => {
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState(albumsData);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(180000);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [publicPlaylists, setPublicPlaylists] = useState([]);

  // Modern Audio Effects State (Essential Controls + Presets + Multi-band EQ)
  const defaultEqBands = DEFAULT_EQ_BANDS;
  const [audioEffects, setAudioEffects] = useState(DEFAULT_AUDIO_EFFECTS);
  const audioEffectsRef = useRef(DEFAULT_AUDIO_EFFECTS);
  audioEffectsRef.current = audioEffects;
  const [isAudioEffectsSaved, setIsAudioEffectsSaved] = useState(true);

  // Real-time Beat-Detection & Audio Energy State for Beat-Synced Visualizations
  const [audioEnergy, setAudioEnergy] = useState(0.25);
  const [bassEnergy, setBassEnergy] = useState(0.22);
  const [midEnergy, setMidEnergy] = useState(0.25);
  const [trebleEnergy, setTrebleEnergy] = useState(0.20);
  const [beatCount, setBeatCount] = useState(0);
  const rollingEnergyAvgRef = useRef(0.25);
  const rollingBassAvgRef = useRef(0.22);
  const lastBeatTimeRef = useRef(0);

  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [eqPreset, setEqPreset] = useState('Flat');
  const [eqBands, setEqBands] = useState(DEFAULT_EQ_BANDS);
  const [eqEnhancers, setEqEnhancers] = useState({
    bassBoost: 0,
    clarity: 0,
    ambience: 0,
    surround: 0,
    dynamicBoost: 0,
  });
  const [isEqEnabled, setIsEqEnabled] = useState(true);

  // Functional Preferences & Profile Settings
  const [audioQuality, setAudioQuality] = useState('Hi-Fi (320k)');
  const [normalizeVolume, setNormalizeVolume] = useState(true);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(true);
  const [crossfadeDuration, setCrossfadeDuration] = useState(6);
  const [offlineMode, setOfflineMode] = useState(false);
  const [downloadQuality, setDownloadQuality] = useState('96k');
  const [downloadedSongs, setDownloadedSongs] = useState({});
  const [downloadProgressMap, setDownloadProgressMap] = useState({});
  const [activeDownloadCount, setActiveDownloadCount] = useState(0);
  const [storageStats, setStorageStats] = useState({
    freeMB: '0',
    freeGB: '0',
    usedMB: '0',
    count: 0,
    isLowStorage: false,
  });
  const [cacheStats, setCacheStats] = useState({ count: 0, usedMB: '0.0' });
  const [cachedSongIds, setCachedSongIds] = useState([]);
  const [followingCount, setFollowingCount] = useState(14);
  const [isSyncingBackend, setIsSyncingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState('offline');

  // Playlists & Liked Songs Real-time State
  const [likedSongIds, setLikedSongIds] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  // In-App Notifications & Alert Center State
  const [notifications, setNotifications] = useState([]);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [inAppToast, setInAppToast] = useState(null);
  const toastTimerRef = useRef(null);

  // PULSE FIND Music Recognition & Floating Bubble State
  const [isPulseFindOpen, setIsPulseFindOpen] = useState(false);
  const [isPulseBubbleVisible, setIsPulseBubbleVisible] = useState(true);
  const [isPulseFindLocked, setIsPulseFindLocked] = useState(true); // Locked while under development
  const [isPulseLockedModalOpen, setIsPulseLockedModalOpen] = useState(false);

  // YouTube Stream & Import Feature State
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [initialYouTubeUrl, setInitialYouTubeUrl] = useState('');
  const openYouTubeImporter = (url = '') => {
    setInitialYouTubeUrl(url);
    setIsYouTubeModalOpen(true);
  };

  // Load persisted in-app notifications, liked songs, and synced offline catalogue on startup
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        const rawNotifs = await AsyncStorage.getItem('@pulse_sound_inapp_notifications');
        if (rawNotifs) {
          const parsed = JSON.parse(rawNotifs);
          if (Array.isArray(parsed)) {
            // Cleanse corrupted or blank notifications from storage
            const validNotifs = parsed.filter(
              (n) => n && typeof n === 'object' && ((n.title && n.title.trim()) || (n.message && n.message.trim()) || (n.songName && n.songName.trim()))
            );
            setNotifications(validNotifs);
          }
        }
      } catch (_) {}

      try {
        const rawLikes = await AsyncStorage.getItem('@pulse_sound_liked_song_ids');
        if (rawLikes) {
          const parsed = JSON.parse(rawLikes);
          if (Array.isArray(parsed)) {
            const cleanLikes = parsed.filter(
              (id) => String(id) !== '0' && String(id) !== '1' && String(id) !== '2'
            );
            setLikedSongIds(cleanLikes);
            AsyncStorage.setItem('@pulse_sound_liked_song_ids', JSON.stringify(cleanLikes)).catch(() => {});
          }
        }
      } catch (_) {}

      try {
        const rawSongs = await AsyncStorage.getItem('@pulse_sound_synced_songs_cache');
        if (rawSongs) {
          const parsed = JSON.parse(rawSongs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleanCachedSongs = parsed.filter((s) => !isMockOrLegacySong(s));
            setSongs(cleanCachedSongs);
            if (cleanCachedSongs.length > 0) {
              AsyncStorage.setItem('@pulse_sound_synced_songs_cache', JSON.stringify(cleanCachedSongs)).catch(() => {});
            } else {
              AsyncStorage.removeItem('@pulse_sound_synced_songs_cache').catch(() => {});
            }
          } else {
            setSongs([]);
            AsyncStorage.removeItem('@pulse_sound_synced_songs_cache').catch(() => {});
          }
        }
      } catch (_) {}

      // Restore cached catalogue in AsyncStorage immediately for instant 0ms startup
      try {
        const rawCat = await AsyncStorage.getItem('@pulse_sound_cached_catalogue');
        if (rawCat) {
          const parsedCat = JSON.parse(rawCat);
          if (parsedCat) {
            if (Array.isArray(parsedCat.songs)) {
              const cleanCatSongs = parsedCat.songs.filter((s) => !isMockOrLegacySong(s));
              parsedCat.songs = cleanCatSongs;
              AsyncStorage.setItem('@pulse_sound_cached_catalogue', JSON.stringify(parsedCat)).catch(() => {});
            }
            if (Array.isArray(parsedCat.playlists) && parsedCat.playlists.length > 0) {
              setPublicPlaylists(parsedCat.playlists);
              publicPlaylistsRef.current = parsedCat.playlists;
            }
          }
        }
      } catch (_) {}

      // Restore last played track so MiniPlayer preview is immediately ready on home screen
      try {
        const rawLastTrack = await AsyncStorage.getItem('@pulse_sound_last_played_track');
        if (rawLastTrack) {
          const parsedTrack = JSON.parse(rawLastTrack);
          if (parsedTrack && !isMockOrLegacySong(parsedTrack)) {
            setCurrentTrack((curr) => curr || parsedTrack);
          }
        }
      } catch (_) {}

      // Permanently remove legacy mock track keys from storage
      try {
        await AsyncStorage.multiRemove([
          '@pulse_sound_predefined_songs',
          '@pulse_sound_mock_tracks',
        ]);
      } catch (_) {}

      try {
        const rawEffects = await AsyncStorage.getItem('@pulse_sound_audio_effects_v2');
        if (rawEffects) {
          const parsed = JSON.parse(rawEffects);
          if (parsed && typeof parsed === 'object') {
            const merged = { ...DEFAULT_AUDIO_EFFECTS, ...parsed };
            setAudioEffects(merged);
            audioEffectsRef.current = merged;
            setIsAudioEffectsSaved(true);
            applyAudioEffects(merged);
          }
        }
      } catch (_) {}
    };
    loadPersistedState();
  }, []);

  const showInAppToast = (data) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setInAppToast(data);
    toastTimerRef.current = setTimeout(() => {
      setInAppToast(null);
    }, 3800);
  };

  const dismissInAppToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setInAppToast(null);
  };

  const addNotification = ({ type = 'info', title = '', message = '', song = null }) => {
    // Robust text resolution so notifications are NEVER blank
    const sName = song?.name || song?.title || song?.songTitle || song?.pulseTrack?.name || '';
    const sArtist = song?.artist || song?.desc || 'Pulse Artist';
    const sImage = song?.image || song?.coverImage || song?.albumImage || null;

    let finalTitle = title && typeof title === 'string' && title.trim() ? title.trim() : '';
    if (!finalTitle) {
      if (type === 'download') finalTitle = 'Song Downloaded';
      else if (type === 'like') finalTitle = 'Song Liked';
      else if (type === 'autocache') finalTitle = 'Track Cached Offline';
      else finalTitle = 'PULSE Notification';
    }

    let finalMessage = message && typeof message === 'string' && message.trim() ? message.trim() : '';
    if (!finalMessage) {
      if (sName) {
        if (type === 'download') finalMessage = `"${sName}" is downloaded and ready for offline playback.`;
        else if (type === 'like') finalMessage = `"${sName}" added to your Liked Songs.`;
        else finalMessage = `Update regarding "${sName}".`;
      } else {
        if (type === 'download') finalMessage = 'Track is ready for 100% offline playback.';
        else if (type === 'like') finalMessage = 'Track added to your favorites.';
        else finalMessage = 'Activity update in your music library.';
      }
    }

    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type, // 'download' | 'like' | 'autocache'
      title: finalTitle,
      message: finalMessage,
      songId: song ? (song._id || song.id) : null,
      songName: sName,
      songArtist: sArtist,
      songImage: sImage,
      song: song || null,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => {
      // Discard any previous blank/corrupt items
      const validPrev = (prev || []).filter(
        (n) => n && typeof n === 'object' && ((n.title && n.title.trim()) || (n.message && n.message.trim()) || (n.songName && n.songName.trim()))
      );
      const updated = [newNotif, ...validPrev.slice(0, 39)];
      AsyncStorage.setItem('@pulse_sound_inapp_notifications', JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    showInAppToast(newNotif);
    return newNotif;
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      AsyncStorage.setItem('@pulse_sound_inapp_notifications', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    AsyncStorage.removeItem('@pulse_sound_inapp_notifications').catch(() => {});
  };

  const removeNotification = (id) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      AsyncStorage.setItem('@pulse_sound_inapp_notifications', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  // Strict Auto-Cache references & listeners
  const listenedSongsRef = useRef(new Set());
  const autoCacheInProgress = useRef(new Set());
  const likedSongIdsRef = useRef(likedSongIds);
  likedSongIdsRef.current = likedSongIds;
  const downloadedSongsRef = useRef(downloadedSongs);
  downloadedSongsRef.current = downloadedSongs;
  const cachedSongIdsRef = useRef(cachedSongIds);
  cachedSongIdsRef.current = cachedSongIds;

  // Strict Auto-Cache: Only caches if user listens to the song AND has liked it.
  // Strictly prevents duplicate caching if already downloaded or cached.
  const triggerStrictAutoCache = async (song) => {
    if (!song) return;
    const songId = String(song._id || song.id);
    if (!songId) return;

    // Strict duplicate check:
    // 1. Is it currently in the middle of caching?
    if (autoCacheInProgress.current.has(songId)) return;

    // 2. Is it already permanently downloaded?
    if (downloadedSongsRef.current && downloadedSongsRef.current[songId]) return;

    // 3. Is it already in cache?
    if (cachedSongIdsRef.current.includes(songId) || isSongCached(songId)) return;

    // 4. Bundled local tracks are already bundled on device package
    if (typeof song.file === 'number') return;

    autoCacheInProgress.current.add(songId);
    try {
      const cachedUri = await cacheStreamingSong(song);
      if (cachedUri) {
        const cIds = await refreshCachedSongIds();
        setCachedSongIds(cIds);
        refreshStorageInfo();
      }
    } catch (err) {
      console.log('Strict auto cache error:', err?.message);
    } finally {
      autoCacheInProgress.current.delete(songId);
    }
  };

  // Toggle Like Song with automatic background pre-caching for offline access
  const toggleLikeSong = (songId) => {
    setLikedSongIds((prev) => {
      const isCurrentlyLiked = prev.includes(songId) || prev.includes(Number(songId));
      const next = isCurrentlyLiked
        ? prev.filter((id) => id !== songId && id !== Number(songId))
        : [...prev, songId];

      AsyncStorage.setItem('@pulse_sound_liked_song_ids', JSON.stringify(next)).catch(() => {});

      const found = (songsRef.current || []).find(
        (s) => String(s._id || s.id) === String(songId) || String(s.id) === String(songId)
      );

      // When user likes a song:
      if (!isCurrentlyLiked && found) {
        // 1. In-App Notification & Toast
        addNotification({
          type: 'like',
          title: 'Song Liked',
          message: `"${found.name}" added to your Liked Songs.`,
          song: found,
        });

        // 2. Automatically cache to local device storage for 100% offline playback
        triggerStrictAutoCache(found);
      }

      return next;
    });
  };

  const isSongLiked = (songId) => likedSongIds.includes(songId);

  // Create new Playlist
  const createPlaylist = (name, initialSongId = null) => {
    const gradients = [
      ['#EC4899', '#8B5CF6'],
      ['#3B82F6', '#1E1B4B'],
      ['#10B981', '#064E3B'],
      ['#F59E0B', '#B45309'],
      ['#8B5CF6', '#4C1D95'],
      ['#06B6D4', '#0E7490'],
    ];
    const randomGrad = gradients[Math.floor(Math.random() * gradients.length)];
    const newId = `pl-${Date.now()}`;
    const newPlaylist = {
      id: newId,
      name: name && name.trim() ? name.trim() : `My Playlist #${playlists.length + 1}`,
      desc: 'Created by you • Pulse Music',
      songIds: initialSongId !== null && initialSongId !== undefined ? [initialSongId] : [],
      gradient: randomGrad,
      createdAt: 'Just now',
    };
    setPlaylists((prev) => [newPlaylist, ...prev]);
    return newPlaylist;
  };

  // Delete Playlist
  const deletePlaylist = (playlistId) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(null);
    }
  };

  // Add song to Playlist
  const addSongToPlaylist = (playlistId, songId) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          if (pl.songIds.includes(songId)) return pl;
          return { ...pl, songIds: [...pl.songIds, songId] };
        }
        return pl;
      })
    );
  };

  // Remove song from Playlist
  const removeSongFromPlaylist = (playlistId, songId) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          return { ...pl, songIds: pl.songIds.filter((id) => id !== songId) };
        }
        return pl;
      })
    );
  };

  // Toggle song in Playlist
  const toggleSongInPlaylist = (playlistId, songId) => {
    let wasAdded = false;
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          if (pl.songIds.includes(songId)) {
            wasAdded = false;
            return { ...pl, songIds: pl.songIds.filter((id) => id !== songId) };
          } else {
            wasAdded = true;
            return { ...pl, songIds: [...pl.songIds, songId] };
          }
        }
        return pl;
      })
    );
    return wasAdded;
  };

  // Last synced IDs cache to prevent unnecessary state re-renders during background polling
  const lastSyncedSongIdsRef = useRef('');
  const lastSyncedAlbumIdsRef = useRef('');
  const lastSyncedPlaylistIdsRef = useRef('');

  // Sync with live MongoDB & Cloudinary backend (Quick Live Sync)
  const refreshBackendData = async (silent = false) => {
    if (!silent) setIsSyncingBackend(true);
    try {
      const data = await fetchLiveBackendData();
      if (data && data.success) {
        setBackendStatus('online');

        // Check and sync backend albums
        if (Array.isArray(data.albums)) {
          const currentAlbumIds = data.albums.map((a) => a._id || a.id).join(',');
          if (currentAlbumIds !== lastSyncedAlbumIdsRef.current) {
            lastSyncedAlbumIdsRef.current = currentAlbumIds;
            setAlbums((prev) => {
              const localFallback = prev.filter((a) => !a.isBackend);
              return [...data.albums, ...localFallback];
            });
          }
        }

        // Check and sync backend songs
        if (Array.isArray(data.songs)) {
          // Permanently filter out any predefined mock songs or marathi songs
          const cleanBackendSongs = data.songs.filter((s) => !isMockOrLegacySong(s));

          const currentSongIds = cleanBackendSongs.map((s) => s._id || s.id).join(',');
          const hasStaleMockInState = (songsRef.current || []).some(isMockOrLegacySong);
          if (currentSongIds !== lastSyncedSongIdsRef.current || hasStaleMockInState) {
            lastSyncedSongIdsRef.current = currentSongIds;
            setSongs(cleanBackendSongs);
            AsyncStorage.setItem('@pulse_sound_synced_songs_cache', JSON.stringify(cleanBackendSongs)).catch(() => {});
          }

          // Check if currentTrack exists in standalone songs or in any public playlist
          const allKnownSongs = [
            ...cleanBackendSongs,
            ...(Array.isArray(data.playlists) ? data.playlists.flatMap((p) => Array.isArray(p.songs) ? p.songs.filter(Boolean) : []) : [])
          ];

          // Safely enrich or update currentTrack without ever interrupting active playlist playback
          setCurrentTrack((prev) => {
            if (!prev) return prev;
            const isPlayingFromPlaylist = activeQueueSourceRef.current && activeQueueSourceRef.current.startsWith('playlist:');
            if (isPlayingFromPlaylist) {
              // Never replace with an external song when user is listening to a playlist!
              const updated = allKnownSongs.find(
                (s) => String(s._id || s.id) === String(prev._id || prev.id) ||
                  (s.name && prev.name && s.name.trim().toLowerCase() === prev.name.trim().toLowerCase())
              );
              if (updated && (updated.video !== prev.video || updated.file !== prev.file || updated.image !== prev.image)) {
                return { ...prev, ...updated };
              }
              return prev;
            }

            const stillExists = allKnownSongs.some(
              (s) => String(s._id || s.id) === String(prev._id || prev.id)
            );
            if (!stillExists && prev.isBackend) {
              return cleanBackendSongs.length > 0 ? cleanBackendSongs[0] : null;
            }
            const updated = cleanBackendSongs.find(
              (s) => String(s._id || s.id) === String(prev._id || prev.id) ||
                (s.name && s.name.trim().toLowerCase() === prev.name?.trim().toLowerCase())
            );
            if (updated && (updated.video !== prev.video || updated.file !== prev.file || updated.image !== prev.image)) {
              return { ...prev, ...updated };
            }
            return prev;
          });
        }

        // Check and sync backend public playlists
        if (Array.isArray(data.playlists)) {
          // If data.playlists is empty on transient sync but we already have public playlists, never wipe them!
          if (data.playlists.length === 0 && publicPlaylistsRef.current && publicPlaylistsRef.current.length > 0) {
            // Keep current playlists rock solid
          } else {
            // Compare fingerprint of playlist IDs + songs count + song IDs so additions/modifications are immediately detected!
            const currentPlaylistFingerprint = data.playlists
              .map((p) => `${p._id || p.id}:${Array.isArray(p.songs) ? p.songs.length : 0}:${(p.songs || []).map(s => (s && typeof s === 'object' ? s._id || s.id : s)).join('-')}`)
              .join(';');

            if (currentPlaylistFingerprint !== lastSyncedPlaylistIdsRef.current) {
              lastSyncedPlaylistIdsRef.current = currentPlaylistFingerprint;
              setPublicPlaylists(data.playlists);
              publicPlaylistsRef.current = data.playlists;

              // Also keep selectedPlaylist fresh if user currently has this playlist open!
              setSelectedPlaylist((prev) => {
                if (!prev) return prev;
                const prevId = String(prev._id || prev.id);
                const fresh = data.playlists.find((p) => String(p._id || p.id) === prevId);
                if (fresh) {
                  return { ...prev, ...fresh };
                }
                return prev;
              });
            }
          }
        }

        return {
          success: true,
          songsCount: data.songs?.length || 0,
          albumsCount: data.albums?.length || 0,
          playlistsCount: data.playlists?.length || 0,
        };
      } else {
        setBackendStatus('offline');
        return { success: false };
      }
    } catch (err) {
      console.log('Backend sync error:', err?.message);
      return { success: false, error: err?.message };
    } finally {
      if (!silent) setIsSyncingBackend(false);
    }
  };

  // Continuous Quick-Sync Engine:
  // 1. Initial immediate sync on mount
  // 2. Continuous lightweight background polling every 4 seconds
  // 3. AppState change listener (instant sync when switching back to app)
  useEffect(() => {
    refreshBackendData(false);

    // Auto-poll every 8 seconds for instant admin updates without network congestion
    const pollInterval = setInterval(() => {
      refreshBackendData(true);
    }, 8000);

    // AppState listener for app focus
    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshBackendData(true);
      }
    });

    return () => {
      clearInterval(pollInterval);
      if (appStateSub && typeof appStateSub.remove === 'function') {
        appStateSub.remove();
      }
    };
  }, []);

  // Initialize offline downloads reconciliation, storage stats, and real-time subscription
  useEffect(() => {
    let isSubscribed = true;

    const initDownloads = async () => {
      try {
        const [cIds, verified] = await Promise.all([
          reconcileStreamingCache(),
          reconcileDownloads(),
        ]);
        if (isSubscribed) {
          setDownloadedSongs(verified);
          setCachedSongIds(cIds);

          const [stats, cStats, cacheIdx, settings] = await Promise.all([
            getStorageStats().catch(() => null),
            getCacheStats().catch(() => null),
            getCacheIndex().catch(() => null),
            getDownloadSettings().catch(() => null),
          ]);
          if (isSubscribed) {
            if (stats) setStorageStats(stats);
            if (cStats) setCacheStats(cStats);
            if (settings?.quality) setDownloadQuality(settings.quality);
            if (cacheIdx) {
              const cachedSongObjects = Object.values(cacheIdx)
                .map((e) => e.song)
                .filter((s) => s && !isMockOrLegacySong(s));
              if (cachedSongObjects.length > 0) {
                setSongs((prev) => deduplicateSongs([...cachedSongObjects, ...prev]));
              }
            }
          }
        }
      } catch (err) {
        console.log('Error initializing downloads:', err?.message);
      }
    };

    initDownloads();

    const unsub = subscribeDownloads(async ({ activeCount, progressMap }) => {
      if (!isSubscribed) return;
      setActiveDownloadCount(activeCount);
      setDownloadProgressMap(progressMap);

      try {
        const currentStored = await getStoredDownloads();
        setDownloadedSongs(currentStored);
        const stats = await getStorageStats();
        setStorageStats(stats);
        const cStats = await getCacheStats();
        setCacheStats(cStats);
        const cIds = await refreshCachedSongIds();
        setCachedSongIds(cIds);
      } catch (_) {}
    });

    return () => {
      isSubscribed = false;
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Audio Player References & State
  const nativePlayerRef = useRef(null);
  const statusSubRef = useRef(null);
  const timerRef = useRef(null);
  const isRepeatRef = useRef(isRepeat);
  isRepeatRef.current = isRepeat;
  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const songsRef = useRef(songs);
  songsRef.current = songs;
  const [activeQueue, setActiveQueue] = useState([]);
  const activeQueueRef = useRef([]);
  activeQueueRef.current = activeQueue;
  const activeQueueSourceRef = useRef('global');
  const publicPlaylistsRef = useRef(publicPlaylists);
  publicPlaylistsRef.current = publicPlaylists;
  const userPlaylistsRef = useRef(playlists);
  userPlaylistsRef.current = playlists;
  const selectedPlaylistRef = useRef(selectedPlaylist);
  selectedPlaylistRef.current = selectedPlaylist;

  // Returns currently active playback queue. Strictly isolated so playlist songs ONLY cycle within that playlist!
  const getEffectiveTrackList = () => {
    if (activeQueueRef.current && activeQueueRef.current.length > 0) {
      const clean = activeQueueRef.current.filter((s) => !isMockOrLegacySong(s));
      if (clean.length > 0) return clean;
    }

    const queueSource = activeQueueSourceRef.current || '';
    if (queueSource.startsWith('playlist:')) {
      const plId = queueSource.replace('playlist:', '');
      const foundPl =
        (publicPlaylistsRef.current || []).find((p) => String(p._id || p.id) === String(plId)) ||
        (userPlaylistsRef.current || []).find((p) => String(p.id || p._id) === String(plId)) ||
        (selectedPlaylistRef.current && String(selectedPlaylistRef.current._id || selectedPlaylistRef.current.id) === String(plId) ? selectedPlaylistRef.current : null);

      if (foundPl && Array.isArray(foundPl.songs) && foundPl.songs.length > 0) {
        const plTracks = foundPl.songs.filter(Boolean).filter((s) => !isMockOrLegacySong(s));
        if (plTracks.length > 0) {
          activeQueueRef.current = plTracks;
          return plTracks;
        }
      }
    }

    return (songsRef.current || []).filter((s) => !isMockOrLegacySong(s));
  };
  const normalizeVolumeRef = useRef(normalizeVolume);
  normalizeVolumeRef.current = normalizeVolume;
  const crossfadeEnabledRef = useRef(crossfadeEnabled);
  crossfadeEnabledRef.current = crossfadeEnabled;
  const crossfadeDurationRef = useRef(crossfadeDuration);
  crossfadeDurationRef.current = crossfadeDuration;
  const eqBandsRef = useRef(eqBands);
  eqBandsRef.current = eqBands;
  const eqEnhancersRef = useRef(eqEnhancers);
  eqEnhancersRef.current = eqEnhancers;
  const isEqEnabledRef = useRef(isEqEnabled);
  isEqEnabledRef.current = isEqEnabled;
  const audioQualityRef = useRef(audioQuality);
  audioQualityRef.current = audioQuality;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const playbackPositionRef = useRef(playbackPosition);
  playbackPositionRef.current = playbackPosition;
  const playbackDurationRef = useRef(playbackDuration);
  playbackDurationRef.current = playbackDuration;
  const hasCrossfadedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const crossfadeTimerRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const secondaryPlayerRef = useRef(null);
  const crossfadeStateRef = useRef({
    isCrossfading: false,
    incomingTrack: null,
    triggeredForTrackId: null,
  });
  const crossfadeIntervalRef = useRef(null);

  // Web Audio DSP references for Web / browser playback
  const webAudioCtxRef = useRef(null);
  const webFiltersRef = useRef([]);
  const webBassBoostRef = useRef(null);
  const webPunchBassRef = useRef(null);
  const webMudCutRef = useRef(null);
  const webClarityRef = useRef(null);
  const webHeadphoneSubRef = useRef(null);
  const webHeadphoneClarityRef = useRef(null);
  const webSpatialDelayRef = useRef(null);
  const webSpatialGainRef = useRef(null);
  const webPannerRef = useRef(null);
  const webCompressorRef = useRef(null);
  const webMasterGainRef = useRef(null);

  // 8D Orbital rotation engine state
  const rotation8DIntervalRef = useRef(null);
  const angle8DRef = useRef(0);

  // Safe Web Audio Graph initialization
  const lastAttachedMediaRef = useRef(null);
  const ensureWebAudioDSP = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!webAudioCtxRef.current) {
        webAudioCtxRef.current = new AudioCtxClass();
      }
      const ctx = webAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        const unlock = () => {
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          window.removeEventListener('click', unlock);
          window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock);
        window.addEventListener('touchstart', unlock);
        ctx.resume().catch(() => {});
      }

      // Check for HTMLAudioElement on web
      const audioElement =
        nativePlayerRef.current?.media ||
        (typeof document !== 'undefined' ? document.querySelector('audio') : null);

      if (audioElement && lastAttachedMediaRef.current !== audioElement) {
        lastAttachedMediaRef.current = audioElement;
        try {
          audioElement.crossOrigin = 'anonymous';
          const source = ctx.createMediaElementSource(audioElement);

          const freqs = [32, 64, 125, 250, 500, 1000, 2000, 4000, 16000];
          const filters = freqs.map((f, i) => {
            const filter = ctx.createBiquadFilter();
            if (i === 0) {
              filter.type = 'lowshelf';
            } else if (i === freqs.length - 1) {
              filter.type = 'highshelf';
            } else {
              filter.type = 'peaking';
              filter.Q.value = 1.4;
            }
            filter.frequency.value = f;
            filter.gain.value = eqBandsRef.current[i]?.gain || 0;
            return filter;
          });
          webFiltersRef.current = filters;

          // 3-Stage Studio Low-End Processing Engine (Sub-Rumble + Kick Punch + Anti-Mud Dip)
          // Stage 1: Sub-Bass Lowshelf at 55Hz (Deep physical sub rumble)
          const subBass = ctx.createBiquadFilter();
          subBass.type = 'lowshelf';
          subBass.frequency.value = 55;
          subBass.gain.value = ((eqEnhancersRef.current?.bassBoost || 0) / 100) * 13;
          webBassBoostRef.current = subBass;

          // Stage 2: Kick-Punch Definition Filter at 110Hz (Tight transient knock)
          const punchBass = ctx.createBiquadFilter();
          punchBass.type = 'peaking';
          punchBass.frequency.value = 110;
          punchBass.Q.value = 1.2;
          punchBass.gain.value = ((eqEnhancersRef.current?.bassBoost || 0) / 100) * 7;
          webPunchBassRef.current = punchBass;

          // Stage 3: Dynamic Vocal & Instrument Anti-Mud Filter at 260Hz
          // Keeps vocals and guitars sparkling clean even at 100% Bass Boost
          const mudCut = ctx.createBiquadFilter();
          mudCut.type = 'peaking';
          mudCut.frequency.value = 260;
          mudCut.Q.value = 1.3;
          mudCut.gain.value = 0;
          webMudCutRef.current = mudCut;

          // Studio Vocal Clarity Highshelf at 4800Hz (crystal transparent air)
          const clarity = ctx.createBiquadFilter();
          clarity.type = 'highshelf';
          clarity.frequency.value = 4800;
          clarity.gain.value = ((eqEnhancersRef.current?.clarity || 0) / 100) * 10;
          webClarityRef.current = clarity;

          // Budget Headphone Sub-Bass Exciter (65Hz lowshelf for cheap earphones)
          const headphoneSub = ctx.createBiquadFilter();
          headphoneSub.type = 'lowshelf';
          headphoneSub.frequency.value = 65;
          headphoneSub.gain.value = 0;
          webHeadphoneSubRef.current = headphoneSub;

          // Budget Headphone Clarity / Vocal Presence Filter (4200Hz peaking)
          const headphoneClarity = ctx.createBiquadFilter();
          headphoneClarity.type = 'peaking';
          headphoneClarity.frequency.value = 4200;
          headphoneClarity.Q.value = 1.1;
          headphoneClarity.gain.value = 0;
          webHeadphoneClarityRef.current = headphoneClarity;

          // 360 Spatial Delay & Wet Gain Node (Binaural Room Simulation)
          let spatialDelay = null;
          let spatialGain = null;
          if (typeof ctx.createDelay === 'function') {
            spatialDelay = ctx.createDelay();
            spatialDelay.delayTime.value = 0.018; // 18ms acoustic room reflections
            spatialGain = ctx.createGain();
            spatialGain.gain.value = 0;
            webSpatialDelayRef.current = spatialDelay;
            webSpatialGainRef.current = spatialGain;
          }

          // 8D Ear-to-Ear Stereo Panner Node
          let panner = null;
          if (typeof ctx.createStereoPanner === 'function') {
            panner = ctx.createStereoPanner();
            panner.pan.value = 0;
            webPannerRef.current = panner;
          }

          // Studio Dynamics Compressor / Soft Limiter (prevents digital clipping, glues acoustics)
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -18;
          comp.knee.value = 20;
          comp.ratio.value = 3.5;
          comp.attack.value = 0.003;
          comp.release.value = 0.16;
          webCompressorRef.current = comp;

          // Master Gain Node with analog headroom
          const master = ctx.createGain();
          master.gain.value = 1.0;
          webMasterGainRef.current = master;

          // Connect DSP chain:
          // source -> filters -> subBass -> punchBass -> mudCut -> clarity -> headphoneSub -> headphoneClarity -> [360 spatial delay / comp] -> panner -> master -> destination
          let current = source;
          filters.forEach((flt) => {
            current.connect(flt);
            current = flt;
          });
          current.connect(subBass);
          subBass.connect(punchBass);
          punchBass.connect(mudCut);
          mudCut.connect(clarity);
          clarity.connect(headphoneSub);
          headphoneSub.connect(headphoneClarity);

          // Spatial 360 parallel reflection branch
          if (spatialDelay && spatialGain) {
            headphoneClarity.connect(spatialDelay);
            spatialDelay.connect(spatialGain);
            spatialGain.connect(comp);
          }

          headphoneClarity.connect(comp);

          if (panner) {
            comp.connect(panner);
            panner.connect(master);
          } else {
            comp.connect(master);
          }
          master.connect(ctx.destination);
        } catch (connErr) {
          // Cross-origin fallback or already attached
        }
      }
    } catch (_) {}
  };

  // Cancel any active mashup crossfade cleanly and dispose secondary resources
  const cancelCrossfade = () => {
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    if (crossfadeTimerRef.current) {
      clearTimeout(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    if (secondaryPlayerRef.current) {
      try {
        secondaryPlayerRef.current.pause();
        if (typeof secondaryPlayerRef.current.remove === 'function') {
          secondaryPlayerRef.current.remove();
        }
      } catch (_) {}
      secondaryPlayerRef.current = null;
    }
    crossfadeStateRef.current = {
      isCrossfading: false,
      incomingTrack: null,
      triggeredForTrackId: null,
    };
    hasCrossfadedRef.current = false;
    isTransitioningRef.current = false;
  };

  // Complete mashup crossfade: cleanly promote incoming player to primary and release outgoing player
  const completeMashupCrossfade = (nextTrack) => {
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    if (crossfadeTimerRef.current) {
      clearTimeout(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }

    const outgoing = nativePlayerRef.current;
    const incoming = secondaryPlayerRef.current;

    // Release outgoing player
    if (outgoing) {
      try {
        if (statusSubRef.current) {
          statusSubRef.current.remove();
          statusSubRef.current = null;
        }
        outgoing.pause();
        if (typeof outgoing.remove === 'function') {
          outgoing.remove();
        }
      } catch (_) {}
    }

    // Promote incoming player to primary
    if (incoming) {
      nativePlayerRef.current = incoming;
      secondaryPlayerRef.current = null;
      setupPlayerListeners(incoming);
      const masterVol = normalizeVolumeRef.current ? 0.88 : 1.0;
      try {
        incoming.volume = masterVol;
      } catch (_) {}
      // Delayed lockscreen activation for crossfade incoming player
      const _activateCrossfadeLockScreen = (attempt = 0) => {
        try {
          if (typeof incoming.setActiveForLockScreen === 'function') {
            incoming.setActiveForLockScreen(true, {
              title: nextTrack?.name || 'Pulse Sound',
              artist: nextTrack?.artist || 'Pulse Artist',
              albumTitle: nextTrack?.album || 'Pulse Sound',
              artworkUrl: typeof nextTrack?.image === 'string' ? nextTrack?.image : nextTrack?.image?.uri,
            });
          }
        } catch (_) {
          if (attempt < 3) {
            setTimeout(() => _activateCrossfadeLockScreen(attempt + 1), 1500);
          }
        }
      };
      setTimeout(() => _activateCrossfadeLockScreen(0), 1500);
    }

    crossfadeStateRef.current = {
      isCrossfading: false,
      incomingTrack: null,
      triggeredForTrackId: null,
    };
    hasCrossfadedRef.current = false;
    isTransitioningRef.current = false;

    // Smooth UI state transition
    setCurrentTrack(nextTrack);
    const newDur = parseDurationToMillis(nextTrack.duration);
    setPlaybackDuration(newDur);
    if (incoming && typeof incoming.currentTime === 'number') {
      setPlaybackPosition(Math.round(incoming.currentTime * 1000));
    }

    // Ensure audio DSP & EQ are active on new track
    setTimeout(() => {
      applyAudioEffects(audioEffectsRef.current);
    }, 60);
  };

  // Dual-Player Equal-Power Seamless Mashup Crossfade:
  // Starts next song in background while current song finishes, blending both simultaneously without loudness dips or gaps
  const startMashupCrossfade = async (outgoingTrack, nextTrack, remainingMs) => {
    if (!outgoingTrack || !nextTrack) return;
    const outgoingId = String(outgoingTrack._id || outgoingTrack.id);
    const nextId = String(nextTrack._id || nextTrack.id);

    if (
      crossfadeStateRef.current.isCrossfading ||
      crossfadeStateRef.current.triggeredForTrackId === outgoingId
    ) {
      return;
    }

    crossfadeStateRef.current = {
      isCrossfading: true,
      incomingTrack: nextTrack,
      triggeredForTrackId: outgoingId,
    };
    hasCrossfadedRef.current = true;
    isTransitioningRef.current = true;

    try {
      // 1. Resolve audio source for incoming track (uses local cache if available)
      const nextSource = await resolveTrackSource(nextTrack.file, nextId);
      if (!nextSource) {
        cancelCrossfade();
        return;
      }

      // Proactively ensure background streaming cache for next track
      cacheStreamingSong(nextTrack).catch(() => {});

      // 2. Initialize secondary player for incoming track
      let incomingPlayer = null;
      if (typeof createAudioPlayer === 'function') {
        incomingPlayer = createAudioPlayer(nextSource, {
          updateInterval: 500,
          keepAudioSessionActive: true,
          downloadFirst: false,
          crossOrigin: 'anonymous',
        });
      }

      if (!incomingPlayer) {
        cancelCrossfade();
        return;
      }

      secondaryPlayerRef.current = incomingPlayer;
      try {
        incomingPlayer.volume = 0.0;
        incomingPlayer.play();
      } catch (playErr) {
        console.log('Incoming crossfade player play error:', playErr?.message);
        cancelCrossfade();
        return;
      }

      // 3. Professional Equal-Power Crossfade Curve:
      // Outgoing: V_out = master * cos(p * pi/2)
      // Incoming: V_in  = master * sin(p * pi/2)
      // Preserves total acoustic energy (cos^2 + sin^2 = 1) across the 5-8 second transition
      const xfadeSec = Math.max(5, Math.min(8, crossfadeDurationRef.current || 6));
      const targetDurationMs = Math.min(remainingMs || (xfadeSec * 1000), xfadeSec * 1000);
      const safeDuration = Math.max(2500, targetDurationMs);
      const stepMs = 50;
      const totalSteps = Math.max(10, Math.floor(safeDuration / stepMs));
      let currentStep = 0;
      const masterVol = normalizeVolumeRef.current ? 0.88 : 1.0;

      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
      }

      crossfadeIntervalRef.current = setInterval(() => {
        currentStep++;
        const p = Math.min(1.0, currentStep / totalSteps);

        // Perceptually appropriate equal-power gains
        const outGain = Math.max(0.001, Math.cos((p * Math.PI) / 2));
        const inGain = Math.max(0.001, Math.sin((p * Math.PI) / 2));

        if (nativePlayerRef.current) {
          try {
            nativePlayerRef.current.volume = Math.max(0.001, Math.min(1.0, outGain * masterVol));
          } catch (_) {}
        }

        if (secondaryPlayerRef.current) {
          try {
            secondaryPlayerRef.current.volume = Math.max(0.001, Math.min(1.0, inGain * masterVol));
          } catch (_) {}
        }

        if (p >= 1.0) {
          completeMashupCrossfade(nextTrack);
        }
      }, stepMs);
    } catch (err) {
      console.log('Mashup crossfade initiation error:', err?.message);
      cancelCrossfade();
    }
  };

  // Smart Smooth Volumetric Fade Utility for manual single-player adjustments
  const fadeVolume = (player, startVol, endVol, durationMs, onComplete = null) => {
    if (!player) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    const safeDuration = Math.max(120, durationMs);
    const steps = Math.max(8, Math.min(25, Math.floor(safeDuration / 40)));
    const stepInterval = Math.max(15, Math.floor(safeDuration / steps));
    const stepDiff = (endVol - startVol) / steps;
    let stepCount = 0;

    fadeIntervalRef.current = setInterval(() => {
      stepCount++;
      const nextVol = Math.max(0.01, Math.min(1.0, startVol + stepDiff * stepCount));
      try {
        if (player) {
          player.volume = nextVol;
        }
      } catch (_) {}

      if (stepCount >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    }, stepInterval);
  };

  // Automatic DJ Crossfade detector: starts next song 5-8 seconds before current song ends
  const checkAutoCrossfade = (pos, dur) => {
    if (!crossfadeEnabledRef.current || !isPlayingRef.current || isRepeatRef.current) return;
    if (
      crossfadeStateRef.current.isCrossfading ||
      hasCrossfadedRef.current ||
      isTransitioningRef.current
    ) {
      return;
    }

    const safeDur = dur || playbackDurationRef.current;
    const xfadeSec = Math.max(5, Math.min(8, crossfadeDurationRef.current || 6));
    const xfadeMs = xfadeSec * 1000;

    // Only activate crossfade if track has sufficient length
    if (!safeDur || safeDur <= xfadeMs + 3000) return;

    const remaining = safeDur - pos;
    if (remaining <= xfadeMs && remaining > 0 && pos > 3000) {
      const trackList = getEffectiveTrackList();
      const current = currentTrackRef.current;
      if (!trackList || trackList.length === 0 || !current) return;

      const currentId = String(current._id || current.id);
      const currentIndex = trackList.findIndex((s) => String(s._id || s.id) === currentId);

      // Repeat-one guard: if repeat-one is on, do NOT crossfade into next queue item
      if (isRepeatRef.current) return;

      let nextIndex;
      if (isShuffleRef.current) {
        nextIndex = Math.floor(Math.random() * trackList.length);
      } else {
        nextIndex = currentIndex + 1;
        // End of queue handling: loop to beginning if continuous queue
        if (nextIndex >= trackList.length) {
          nextIndex = 0;
        }
      }

      const nextSong = trackList[nextIndex];
      if (nextSong && String(nextSong._id || nextSong.id) !== currentId) {
        startMashupCrossfade(current, nextSong, remaining);
      }
    }
  };

  // Reorder queue for Music Manager
  const reorderQueue = (fromIndex, toIndex) => {
    if (fromIndex < 0 || fromIndex >= songs.length || toIndex < 0 || toIndex >= songs.length) return;
    setSongs((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  // Remove song from queue
  const removeSongFromQueue = (songId) => {
    setSongs((prev) => prev.filter((s) => s.id !== songId));
  };

  // Save audio effects settings to persistent storage
  const saveAudioEffects = async (config) => {
    try {
      const target = config || audioEffectsRef.current || DEFAULT_AUDIO_EFFECTS;
      await AsyncStorage.setItem('@pulse_sound_audio_effects_v2', JSON.stringify(target));
      setAudioEffects(target);
      audioEffectsRef.current = target;
      setIsAudioEffectsSaved(true);
      applyAudioEffects(target);
      return true;
    } catch (err) {
      console.log('Error saving audio effects:', err?.message);
      return false;
    }
  };

  // Reset audio effects to Balanced defaults and persist
  const resetAudioEffects = async () => {
    try {
      const target = { ...DEFAULT_AUDIO_EFFECTS };
      await AsyncStorage.setItem('@pulse_sound_audio_effects_v2', JSON.stringify(target));
      setAudioEffects(target);
      audioEffectsRef.current = target;
      setIsAudioEffectsSaved(true);
      applyAudioEffects(target);
      return true;
    } catch (err) {
      console.log('Error resetting audio effects:', err?.message);
      return false;
    }
  };

  // Safe helper to set playback rate without triggering getter-only assignment errors
  const safeSetPlaybackRate = (player, rate) => {
    if (!player) return;
    try {
      if (typeof player.setPlaybackRate === 'function') {
        player.setPlaybackRate(rate);
      }
    } catch (_) {}
  };

  // Stop 8D Orbital rotation cleanly and restore flat rate & reference volume
  const stop8DRotation = () => {
    if (rotation8DIntervalRef.current) {
      clearInterval(rotation8DIntervalRef.current);
      rotation8DIntervalRef.current = null;
    }
    // Instantly restore native player speed and normal volume
    if (nativePlayerRef.current) {
      try {
        safeSetPlaybackRate(nativePlayerRef.current, 1.0);
        const baseHeadroom = normalizeVolumeRef.current ? 0.68 : 0.75;
        nativePlayerRef.current.volume = baseHeadroom;
      } catch (_) {}
    }
    // Instantly restore web stereo panner to center or static balance
    if (webPannerRef.current && webAudioCtxRef.current) {
      try {
        const now = webAudioCtxRef.current.currentTime;
        const targetPan = audioEffectsRef.current?.enabled !== false
          ? Math.max(-1, Math.min(1, (audioEffectsRef.current?.balance || 0) / 100))
          : 0;
        webPannerRef.current.pan.cancelScheduledValues(0);
        webPannerRef.current.pan.setTargetAtTime(targetPan, now, 0.04);
        if (webMudCutRef.current) {
          webMudCutRef.current.gain.setTargetAtTime(0, now, 0.04);
        }
      } catch (_) {}
    }
  };

  // Start continuous 8D Binaural rotation engine (Hypnotic ear-to-ear orbital motion)
  const start8DRotation = (speedName, config = null) => {
    if (rotation8DIntervalRef.current) {
      clearInterval(rotation8DIntervalRef.current);
      rotation8DIntervalRef.current = null;
    }

    const currentConfig = config || audioEffectsRef.current;
    const isEnabled = currentConfig.enabled !== false;
    const is8D = isEnabled && Boolean(currentConfig.audio8D);

    if (!is8D || !isPlayingRef.current) {
      stop8DRotation();
      return;
    }

    const speedPeriods = {
      Slow: 12000,
      Medium: 8000,
      Fast: 5000,
      Hyper: 3000,
    };
    const periodMs = speedPeriods[speedName || currentConfig.speed8D] || 8000;
    const intervalMs = 30; // ~33 FPS continuous updates
    const angleStep = (2 * Math.PI * intervalMs) / periodMs;

    rotation8DIntervalRef.current = setInterval(() => {
      angle8DRef.current = (angle8DRef.current + angleStep) % (2 * Math.PI);
      const angle = angle8DRef.current;

      // Pan coordinates:
      // pan: -1.0 (Left Ear) to +1.0 (Right Ear)
      const pan = Math.sin(angle);
      // frontBack: +1.0 (Front of Face) to -1.0 (Behind Head)
      const frontBack = Math.cos(angle);

      // 1. Web Audio Hardware 8D Orbiting (Stereo Panner + Head Shadow Filter + Room Reflections)
      if (webPannerRef.current && webAudioCtxRef.current) {
        try {
          const now = webAudioCtxRef.current.currentTime;
          webPannerRef.current.pan.cancelScheduledValues(0);
          webPannerRef.current.pan.setTargetAtTime(pan, now, 0.025);

          // Head acoustic shadow: when audio is behind the listener's head, dip upper frequencies slightly
          if (webMudCutRef.current) {
            const shadowDip = frontBack < 0 ? frontBack * 3.5 : 0;
            webMudCutRef.current.gain.setTargetAtTime(shadowDip, now, 0.025);
          }
        } catch (_) {}
      }

      // 2. Native Android / iOS Psychoacoustic 8D Engine (Ear-to-Ear Amplitude Modulation + Doppler Pitch Velocity)
      if (nativePlayerRef.current) {
        try {
          const cfg = audioEffectsRef.current;
          const baseHeadroom = normalizeVolumeRef.current ? 0.65 : 0.72;

          // Ear-to-ear orbital volume wave:
          // Sound revolves around the head; volume dynamically undulates between 45% and 100% of base volume
          const orbitWave = 0.45 + 0.55 * ((1 + Math.sin(angle)) / 2);

          // Head proximity / depth modulation: sound is punchier when in front/sides than behind
          const depthMod = frontBack < 0 ? 0.88 : 1.0;

          // Bass boost loudness factor
          const bassBoostFactor = (cfg.bass || 0) > 0 ? ((cfg.bass || 0) * 0.018) : 0;

          const dynamicVol = Math.max(
            0.20,
            Math.min(1.0, (baseHeadroom + bassBoostFactor) * orbitWave * depthMod)
          );
          nativePlayerRef.current.volume = dynamicVol;

          // Doppler velocity pitch/rate flutter:
          // As sound approaches (+cos), rate shifts up by up to +1.8%; as it recedes (-cos), rate shifts down by up to -1.8%
          // This creates the visceral, authentic feeling of physical motion around the listener's head!
          const dopplerShift = 1.0 + (frontBack * 0.018);
          safeSetPlaybackRate(nativePlayerRef.current, Math.max(0.97, Math.min(1.03, dopplerShift)));
        } catch (_) {}
      }
    }, intervalMs);
  };

  // Immediate State & Audio Pipeline Synchronizer (Direct 0-delay updates)
  const updateAudioEffects = (newConfig) => {
    const merged = { ...audioEffectsRef.current, ...newConfig };
    audioEffectsRef.current = merged;
    setAudioEffects(merged);
    setIsAudioEffectsSaved(false);
    applyAudioEffects(merged);
  };

  // Real-time Audio DSP & Enhancer Engine (Web Audio hardware filters + Native Psychoacoustic Shaping)
  const applyAudioEffects = (effectsOrBands, maybeEnhancers, maybeEnabled) => {
    let config;
    if (effectsOrBands && typeof effectsOrBands === 'object' && !Array.isArray(effectsOrBands)) {
      // New signature: applyAudioEffects(config)
      config = { ...audioEffectsRef.current, ...effectsOrBands };
    } else {
      // Legacy signature: applyAudioEffects(bands, enhancers, enabled)
      config = {
        ...audioEffectsRef.current,
        bands: effectsOrBands || audioEffectsRef.current.bands,
        enabled: maybeEnabled !== undefined ? maybeEnabled : audioEffectsRef.current.enabled,
      };
    }

    audioEffectsRef.current = config;
    const isEnabled = config.enabled !== false;
    const intensity = (config.intensity !== undefined ? config.intensity : 100) / 100;

    // Essential controls values scaled by intensity:
    const effBass = (config.bass || 0) * intensity;
    const effVocals = (config.vocals || 0) * intensity;
    const effTreble = (config.treble || 0) * intensity;
    const effBalance = (config.balance || 0) * intensity;
    const targetBands = config.bands || defaultEqBands;

    // Headphone Optimizer & Sub-Bass parameters for budget earphones
    const isHeadphoneBoost = Boolean(config.headphoneBoost);
    const subBassVal = (config.subBass || 0) * intensity;
    const headphoneSubGain = (isHeadphoneBoost ? 6.0 : 0) + subBassVal * 0.8;
    const headphoneClarityGain = isHeadphoneBoost ? 4.5 * intensity : 0;
    const antiMudGain = isHeadphoneBoost ? -3.5 * intensity : 0;

    // 360 Spatial Surround parameters
    const isSpatial360 = Boolean(config.spatial360);
    const spatialDepth = (config.spatialDepth !== undefined ? config.spatialDepth : 75) / 100;
    const spatialWetGain = isSpatial360 ? spatialDepth * 0.38 * intensity : 0;

    // 8D Audio parameter
    const is8D = Boolean(config.audio8D);

    // 1. Web Audio API Hardware Parametric Filters (Only active on Web platform)
    if (Platform.OS === 'web') {
      try {
        ensureWebAudioDSP();
        const ctx = webAudioCtxRef.current;
        if (ctx) {
          const now = ctx.currentTime;

          if (!isEnabled) {
            // Master Bypass: Flat, uncolored reference sound
            if (webFiltersRef.current && webFiltersRef.current.length > 0) {
              webFiltersRef.current.forEach((filter) => {
                try {
                  filter.gain.cancelScheduledValues(0);
                  filter.gain.setTargetAtTime(0, now, 0.012);
                } catch (_) { filter.gain.value = 0; }
              });
            }
            if (webBassBoostRef.current) {
              try {
                webBassBoostRef.current.gain.cancelScheduledValues(0);
                webBassBoostRef.current.gain.setTargetAtTime(0, now, 0.012);
              } catch (_) { webBassBoostRef.current.gain.value = 0; }
            }
            if (webPunchBassRef.current) {
              try {
                webPunchBassRef.current.gain.cancelScheduledValues(0);
                webPunchBassRef.current.gain.setTargetAtTime(0, now, 0.012);
              } catch (_) { webPunchBassRef.current.gain.value = 0; }
            }
            if (webMudCutRef.current) {
              try {
                webMudCutRef.current.gain.cancelScheduledValues(0);
                webMudCutRef.current.gain.setTargetAtTime(0, now, 0.012);
              } catch (_) { webMudCutRef.current.gain.value = 0; }
            }
            if (webClarityRef.current) {
              try {
                webClarityRef.current.gain.cancelScheduledValues(0);
                webClarityRef.current.gain.setTargetAtTime(0, now, 0.012);
              } catch (_) { webClarityRef.current.gain.value = 0; }
            }
            if (webHeadphoneSubRef.current) {
              try {
                webHeadphoneSubRef.current.gain.cancelScheduledValues(0);
                webHeadphoneSubRef.current.gain.setTargetAtTime(0, now, 0.012);
              } catch (_) { webHeadphoneSubRef.current.gain.value = 0; }
            }
            if (webHeadphoneClarityRef.current) {
              try {
                webHeadphoneClarityRef.current.gain.cancelScheduledValues(0);
                webHeadphoneClarityRef.current.gain.setTargetAtTime(0, now, 0.012);
              } catch (_) { webHeadphoneClarityRef.current.gain.value = 0; }
            }
            if (webSpatialGainRef.current) {
              try {
                webSpatialGainRef.current.gain.cancelScheduledValues(0);
                webSpatialGainRef.current.gain.setTargetAtTime(0, now, 0.012);
              } catch (_) { webSpatialGainRef.current.gain.value = 0; }
            }
            if (webPannerRef.current) {
              try {
                webPannerRef.current.pan.cancelScheduledValues(0);
                webPannerRef.current.pan.setTargetAtTime(0, now, 0.012);
              } catch (_) { webPannerRef.current.pan.value = 0; }
            }
            if (webMasterGainRef.current) {
              const baseVol = normalizeVolumeRef.current ? 0.90 : 1.0;
              try {
                webMasterGainRef.current.gain.cancelScheduledValues(0);
                webMasterGainRef.current.gain.setTargetAtTime(baseVol, now, 0.012);
              } catch (_) { webMasterGainRef.current.gain.value = baseVol; }
            }
          } else {
            // Processing Active: Apply audio enhancements

            // 9-Band Multiband Parametric Filters
            if (webFiltersRef.current && webFiltersRef.current.length > 0) {
              webFiltersRef.current.forEach((filter, i) => {
                const g = (targetBands[i]?.gain || 0) * intensity;
                try {
                  filter.gain.cancelScheduledValues(0);
                  filter.gain.setTargetAtTime(g, now, 0.012);
                } catch (_) {
                  filter.gain.value = g;
                }
              });
            }

            // Low-Shelf Bass Emphasis Filter (75Hz)
            if (webBassBoostRef.current) {
              const bg = effBass * 1.6;
              try {
                webBassBoostRef.current.gain.cancelScheduledValues(0);
                webBassBoostRef.current.gain.setTargetAtTime(bg, now, 0.012);
              } catch (_) {
                webBassBoostRef.current.gain.value = bg;
              }
            }

            // Mid-Peaking Vocals Filter (1200Hz, Q=1.2)
            if (webPunchBassRef.current) {
              const vg = effVocals * 1.5;
              try {
                webPunchBassRef.current.gain.cancelScheduledValues(0);
                webPunchBassRef.current.gain.setTargetAtTime(vg, now, 0.012);
              } catch (_) {
                webPunchBassRef.current.gain.value = vg;
              }
            }

            // Anti-Mud Filter (260Hz) - eliminates hollow plastic sound in cheap earphones
            if (webMudCutRef.current) {
              try {
                webMudCutRef.current.gain.cancelScheduledValues(0);
                webMudCutRef.current.gain.setTargetAtTime(antiMudGain, now, 0.012);
              } catch (_) {
                webMudCutRef.current.gain.value = antiMudGain;
              }
            }

            // High-Shelf Treble Filter (5000Hz)
            if (webClarityRef.current) {
              const tg = effTreble * 1.5;
              try {
                webClarityRef.current.gain.cancelScheduledValues(0);
                webClarityRef.current.gain.setTargetAtTime(tg, now, 0.012);
              } catch (_) {
                webClarityRef.current.gain.value = tg;
              }
            }

            // Budget Headphone Sub-Bass Exciter (65Hz)
            if (webHeadphoneSubRef.current) {
              try {
                webHeadphoneSubRef.current.gain.cancelScheduledValues(0);
                webHeadphoneSubRef.current.gain.setTargetAtTime(headphoneSubGain, now, 0.012);
              } catch (_) {
                webHeadphoneSubRef.current.gain.value = headphoneSubGain;
              }
            }

            // Budget Headphone Vocal Clarity Presence (4200Hz)
            if (webHeadphoneClarityRef.current) {
              try {
                webHeadphoneClarityRef.current.gain.cancelScheduledValues(0);
                webHeadphoneClarityRef.current.gain.setTargetAtTime(headphoneClarityGain, now, 0.012);
              } catch (_) {
                webHeadphoneClarityRef.current.gain.value = headphoneClarityGain;
              }
            }

            // 360 Spatial Wet Gain
            if (webSpatialGainRef.current) {
              try {
                webSpatialGainRef.current.gain.cancelScheduledValues(0);
                webSpatialGainRef.current.gain.setTargetAtTime(spatialWetGain, now, 0.012);
              } catch (_) {
                webSpatialGainRef.current.gain.value = spatialWetGain;
              }
            }

            // Manual Balance (when 8D is NOT running)
            if (webPannerRef.current && !is8D) {
              const targetPan = Math.max(-1, Math.min(1, effBalance / 100));
              try {
                webPannerRef.current.pan.cancelScheduledValues(0);
                webPannerRef.current.pan.setTargetAtTime(targetPan, now, 0.012);
              } catch (_) {
                webPannerRef.current.pan.value = targetPan;
              }
            }

            // Master Headroom Limiter & Anti-Distortion Gain
            if (webMasterGainRef.current) {
              const baseVol = normalizeVolumeRef.current ? 0.90 : 1.0;
              const antiClipGain = 1.0 / (1.0 + Math.max(0, effBass + subBassVal) * 0.02);
              const targetVol = Math.min(1.15, baseVol * antiClipGain);
              try {
                webMasterGainRef.current.gain.cancelScheduledValues(0);
                webMasterGainRef.current.gain.setTargetAtTime(targetVol, now, 0.012);
              } catch (_) {
                webMasterGainRef.current.gain.value = targetVol;
              }
            }
          }
        }
      } catch (webErr) {
        console.log('Web Audio effect update note:', webErr?.message);
      }
    }

    // 2. High-Contrast Dynamic Loudness & Psychoacoustic Headroom Shaping (100% Audible on Native)
    if (!nativePlayerRef.current) return;
    try {
      if (!isEnabled) {
        // Direct Bypass: clean flat reference volume & reset speed
        stop8DRotation();
        safeSetPlaybackRate(nativePlayerRef.current, 1.0);
        nativePlayerRef.current.volume = normalizeVolumeRef.current ? 0.75 : 0.82;
        return;
      }

      // Base reference volume with generous upward headroom
      const baseHeadroom = normalizeVolumeRef.current ? 0.62 : 0.68;

      // Analog-style soft saturation curve (Math.tanh): deep, punchy sub-bass without digital distortion
      const bassPunch = Math.tanh((effBass * 1.2 + subBassVal * 0.9) * 0.12) * 0.26;

      // Vocal clarity & presence (up to +0.18)
      const vocalPresence = Math.tanh((effVocals * 1.1 + (isHeadphoneBoost ? 3.0 : 0)) * 0.10) * 0.18;

      // Treble brilliance (up to +0.14)
      const trebleAir = Math.tanh((effTreble * 1.1) * 0.08) * 0.14;

      // Budget Headphone excitation boost
      const headphoneLoudness = isHeadphoneBoost ? 0.10 : 0;

      // Spatial soundstage presence headroom
      const spatialLoudness = isSpatial360 ? (spatialDepth * 0.08) : 0;

      // Balance adjustment compensation
      const balanceAtten = -Math.abs(effBalance / 100) * 0.08;

      // Multiband sum tilt
      const bandSum = targetBands.reduce((acc, b) => acc + (b.gain || 0), 0);
      const eqTilt = (bandSum / 108) * 0.12;

      // Final volume is calculated with wide dynamic range: 0.25 (cut) to 1.0 (max boost)
      const finalVolume = Math.min(
        1.0,
        Math.max(0.25, baseHeadroom + bassPunch + vocalPresence + trebleAir + headphoneLoudness + spatialLoudness + balanceAtten + eqTilt)
      );

      // 8D Audio Rotation Control:
      if (is8D && isPlayingRef.current) {
        start8DRotation(config.speed8D, config);
      } else {
        stop8DRotation();
        safeSetPlaybackRate(nativePlayerRef.current, 1.0);
        nativePlayerRef.current.volume = finalVolume;
      }
    } catch (err) {
      console.log('Audio DSP effect note:', err?.message);
    }
  };

  // Keep 8D rotation synchronized whenever playback state or 8D config changes
  useEffect(() => {
    const isEnabled = audioEffects.enabled !== false;
    const is8D = isEnabled && Boolean(audioEffects.audio8D);
    if (is8D && isPlaying) {
      start8DRotation(audioEffects.speed8D, audioEffects);
    } else {
      stop8DRotation();
    }
  }, [isPlaying, audioEffects.enabled, audioEffects.audio8D, audioEffects.speed8D]);

  // Initialize Global Audio Session & Preload Predefined Offline Songs
  useEffect(() => {
    let isMounted = true;
    const initializeAudio = async () => {
      // Warm up Render backend immediately + keep alive every 9 min
      startKeepAlive();

      try {
        if (typeof setAudioModeAsync === 'function') {
          await setAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: 'doNotMixPersistent',
            shouldPlayInBackground: true,
            allowsRecording: false,
            shouldRouteThroughEarpiece: false,
          });
        }
      } catch (err) {
        console.log('AudioMode initialization note:', err?.message);
      }

    };

    initializeAudio();

    return () => {
      isMounted = false;
      cancelCrossfade();
      if (statusSubRef.current) {
        try { statusSubRef.current.remove(); } catch (_) {}
      }
      if (nativePlayerRef.current) {
        try { nativePlayerRef.current.pause(); } catch (_) {}
      }
      if (secondaryPlayerRef.current) {
        try { secondaryPlayerRef.current.pause(); } catch (_) {}
      }
    };
  }, []);

  // Helper to resolve an audio source for native playback (Offline-first: checks local disk first!)
  const resolveTrackSource = async (file, songId = null) => {
    // 1. Check if track is downloaded or cached locally
    if (songId !== null && songId !== undefined) {
      try {
        const localUri = await getLocalTrackUri(songId);
        if (localUri) {
          return { uri: localUri };
        }
      } catch (_) {}
    }

    if (!file) return null;
    if (typeof file === 'number') {
      try {
        const asset = Asset.fromModule(file);
        if (!asset.localUri) {
          await asset.downloadAsync();
        }
        if (asset.localUri) {
          return { uri: asset.localUri };
        }
      } catch (err) {
        console.log('Asset download fallback:', err?.message);
      }
      return file;
    }
    if (typeof file === 'string') {
      const cleanUrl = file.includes('/br_')
        ? file.replace(/\/br_[0-9]+k,?[^/]*\//, '/')
        : file;
      return { uri: cleanUrl };
    }
    return file;
  };

  const setupPlayerListeners = (player) => {
    if (!player || typeof player.addListener !== 'function') return;
    if (statusSubRef.current) {
      try { statusSubRef.current.remove(); } catch (_) {}
      statusSubRef.current = null;
    }

    // Enable native audio sampling if supported by platform
    if (typeof player.setAudioSamplingEnabled === 'function') {
      try { player.setAudioSamplingEnabled(true); } catch (_) {}
    }

    try {
      // Real-time audio waveform / PCM sampling listener
      player.addListener('audioSampleUpdate', (sampleData) => {
        if (!sampleData || !sampleData.channels || sampleData.channels.length === 0) return;
        const frames = sampleData.channels[0].frames;
        if (!frames || frames.length === 0) return;

        let sumSquares = 0;
        let bassSumSquares = 0;
        let trebleSumSquares = 0;
        const step = Math.max(1, Math.floor(frames.length / 48));
        let count = 0;

        for (let i = 0; i < frames.length; i += step) {
          const val = frames[i];
          sumSquares += val * val;

          // 4-sample box filter for low-pass (Sub-Bass)
          const next1 = i + 1 < frames.length ? frames[i + 1] : val;
          const next2 = i + 2 < frames.length ? frames[i + 2] : val;
          const next3 = i + 3 < frames.length ? frames[i + 3] : val;
          const lowPass = (val + next1 + next2 + next3) * 0.25;
          bassSumSquares += lowPass * lowPass;

          // Differential for high-pass (Treble & Shimmer)
          const diff = val - next1;
          trebleSumSquares += diff * diff;

          count++;
        }

        const safeCount = Math.max(1, count);
        const rms = Math.sqrt(sumSquares / safeCount);
        const bassRms = Math.sqrt(bassSumSquares / safeCount);
        const trebleRms = Math.sqrt(trebleSumSquares / safeCount);

        const energy = Math.max(0.08, Math.min(1.0, rms * 3.4));
        const bass = Math.max(0.06, Math.min(1.0, bassRms * 3.8));
        const treble = Math.max(0.05, Math.min(1.0, trebleRms * 4.2));
        const mid = Math.max(0.06, Math.min(1.0, energy * 0.95));

        setAudioEnergy(energy);
        setBassEnergy(bass);
        setMidEnergy(mid);
        setTrebleEnergy(treble);

        // Dynamic onset & beat detection from sub-bass transients
        rollingEnergyAvgRef.current = rollingEnergyAvgRef.current * 0.82 + energy * 0.18;
        rollingBassAvgRef.current = rollingBassAvgRef.current * 0.80 + bass * 0.20;

        const now = Date.now();
        if ((bass > rollingBassAvgRef.current * 1.28 || energy > rollingEnergyAvgRef.current * 1.32) && (bass > 0.14 || energy > 0.15)) {
          if (now - lastBeatTimeRef.current > 220) {
            lastBeatTimeRef.current = now;
            setBeatCount((c) => c + 1);
          }
        }
      });
    } catch (_) {}

    try {
      statusSubRef.current = player.addListener('playbackStatusUpdate', (status) => {
        if (!status) return;
        let pos = null;
        let dur = null;
        if (typeof status.currentTime === 'number') {
          pos = Math.round(status.currentTime * 1000);
          setPlaybackPosition(pos);
        }
        if (typeof status.duration === 'number' && status.duration > 0) {
          dur = Math.round(status.duration * 1000);
          setPlaybackDuration(dur);
        }

        // Live check for upcoming end of track crossfade
        if (pos !== null) {
          checkAutoCrossfade(pos, dur || playbackDurationRef.current);

          // Mark as listened once user has listened for >= 3 seconds
          if (pos >= 3000) {
            const active = currentTrackRef.current;
            if (active) {
              const activeId = String(active._id || active.id);
              listenedSongsRef.current.add(activeId);
              // Strict Auto-Cache: Only if user likes this song!
              const isLiked = likedSongIdsRef.current.includes(activeId) ||
                              likedSongIdsRef.current.includes(active.id) ||
                              likedSongIdsRef.current.includes(Number(activeId));
              if (isLiked) {
                triggerStrictAutoCache(active);
              }
            }
          }
        }

        if (status.didJustFinish) {
          if (crossfadeStateRef.current.isCrossfading || hasCrossfadedRef.current || isTransitioningRef.current) {
            return;
          }
          if (isRepeatRef.current) {
            seekTo(0);
            try { player.play(); } catch (_) {}
          } else {
            nextTrack();
          }
        }
      });
    } catch (e) {
      console.log('Listener setup note:', e?.message);
    }
  };

  // Continuous beat & audio energy synchronization clock
  useEffect(() => {
    if (!isPlaying) {
      setAudioEnergy(0);
      setBassEnergy(0);
      setMidEnergy(0);
      setTrebleEnergy(0);
      return;
    }
    const beatTimer = setInterval(() => {
      const now = Date.now();
      if (now - lastBeatTimeRef.current > 480) {
        lastBeatTimeRef.current = now;
        setBeatCount((c) => c + 1);
        setAudioEnergy((prev) => Math.max(0.70, prev));
        setBassEnergy((prev) => Math.max(0.68, prev));
        setMidEnergy((prev) => Math.max(0.55, prev));
        setTrebleEnergy((prev) => Math.max(0.48, prev));
      } else {
        setAudioEnergy((prev) => Math.max(0.12, prev * 0.90));
        setBassEnergy((prev) => Math.max(0.10, prev * 0.88));
        setMidEnergy((prev) => Math.max(0.12, prev * 0.91));
        setTrebleEnergy((prev) => Math.max(0.08, prev * 0.89));
      }
    }, 70);

    return () => clearInterval(beatTimer);
  }, [isPlaying]);

  // Safely attempt native audio playback with DJ crossfade support & progressive streaming
  const tryNativePlay = async (track, seekMillis = null, crossfadeOptions = {}) => {
    if (!track) return;
    try {
      const trackId = track._id || track.id;
      const source = await resolveTrackSource(track.file, trackId);
      const targetVol = normalizeVolumeRef.current ? 0.88 : 1.0;

      let player = nativePlayerRef.current;
      let needNewPlayer = !player;

      if (player) {
        try {
          if (typeof player.replace === 'function') {
            player.replace(source);
          } else {
            needNewPlayer = true;
          }
        } catch (err) {
          needNewPlayer = true;
        }
      }

      if (needNewPlayer) {
        if (player) {
          try { player.pause(); } catch (_) {}
        }
        if (typeof createAudioPlayer === 'function') {
          // Progressive streaming: downloadFirst: false allows immediate playback
          player = createAudioPlayer(source, {
            updateInterval: 500,
            keepAudioSessionActive: true,
            downloadFirst: false,
            crossOrigin: 'anonymous',
          });
          nativePlayerRef.current = player;
          setupPlayerListeners(player);
          ensureWebAudioDSP();
        }
      }

      if (!player) return;

      // Handle seeking if specified
      if (typeof seekMillis === 'number' && seekMillis > 0) {
        try {
          await player.seekTo(seekMillis / 1000);
        } catch (_) {}
      }

      const { startAtLowVolume = false, fadeInMs = null } = crossfadeOptions;

      // Smart Volumetric Crossfade: Starts at low volume and ramps up smoothly
      if (crossfadeEnabledRef.current || startAtLowVolume) {
        try { player.volume = 0.02; } catch (_) {}
        try { player.play(); } catch (playErr) { console.log('Play err:', playErr?.message); }
        const fadeMs = fadeInMs || Math.max(1000, Math.min(8000, (crossfadeDurationRef.current || 3) * 1000));
        fadeVolume(player, 0.02, targetVol, fadeMs);
      } else {
        try { player.volume = targetVol; } catch (_) {}
        try { player.play(); } catch (playErr) { console.log('Play err:', playErr?.message); }
      }

      // Re-apply active equalizer & DSP effects on the newly playing track
      setTimeout(() => {
        applyAudioEffects(audioEffectsRef.current);
      }, 80);

      // Activate lockscreen controls & persistent background media session (Android & iOS)
      // Delayed with retry so Android AudioControlsService has time to bind first
      const _activateLockScreen = (attempt = 0) => {
        try {
          if (typeof player.setActiveForLockScreen === 'function') {
            player.setActiveForLockScreen(true, {
              title: track?.name || 'Pulse Sound',
              artist: track?.artist || 'Pulse Artist',
              albumTitle: track?.album || 'Pulse Sound',
              artworkUrl: typeof track?.image === 'string' ? track?.image : track?.image?.uri,
            });
          }
        } catch (lockErr) {
          console.log('Lock screen activation note (attempt ' + attempt + '):', lockErr?.message);
          if (attempt < 3) {
            setTimeout(() => _activateLockScreen(attempt + 1), 1500);
          }
        }
      };
      setTimeout(() => _activateLockScreen(0), 1500);
    } catch (err) {
      console.log('Native audio play error:', err?.message || err);
    }
  };

  const tryNativePause = () => {
    stop8DRotation();
    try {
      if (nativePlayerRef.current && typeof nativePlayerRef.current.pause === 'function') {
        nativePlayerRef.current.pause();
      }
      if (secondaryPlayerRef.current && typeof secondaryPlayerRef.current.pause === 'function') {
        secondaryPlayerRef.current.pause();
      }
    } catch (err) {
      console.log('Pause note:', err?.message);
    }
  };

  // Check if a song is downloaded offline
  const isTrackDownloaded = (songId) => {
    if (!songId && songId !== 0) return false;
    return Boolean(downloadedSongs[String(songId)]);
  };

  // Check if a song is in smart offline cache (played before or predictive pre-fetched)
  const isTrackCached = (songId) => {
    if (!songId && songId !== 0) return false;
    const idStr = String(songId);
    return cachedSongIds.includes(idStr) || isSongCached(idStr);
  };

  // Check if song is 100% playable offline (either permanent download or auto-cached)
  const isOfflineReady = (songId) => {
    return isTrackDownloaded(songId) || isTrackCached(songId);
  };

  // Get live progress of a song being downloaded (0..1)
  const getTrackDownloadProgress = (songId) => {
    if (!songId && songId !== 0) return 0;
    return downloadProgressMap[String(songId)] || 0;
  };

  // Check if song is actively downloading
  const isTrackDownloading = (songId) => {
    if (!songId && songId !== 0) return false;
    return downloadProgressMap[String(songId)] !== undefined;
  };

  // Download a single song for 100% offline playback
  const downloadSong = async (song, options = {}) => {
    if (!song) return;
    const songId = String(song._id || song.id);

    if (isTrackDownloaded(songId)) {
      Alert.alert(
        'Already Available Offline',
        `"${song.name}" is already downloaded to your device storage.`
      );
      return { success: true, isExisting: true };
    }

    const q = options.quality || downloadQuality;
    const estimated = getEstimatedTrackSizeMB(song, q);

    const res = await downloadTrack(song, { quality: q });
    if (res.success) {
      const stored = await getStoredDownloads();
      setDownloadedSongs(stored);
      const sStats = await getStorageStats();
      setStorageStats(sStats);

      // In-App Notification & Responsive Banner Alert
      addNotification({
        type: 'download',
        title: 'Song Downloaded',
        message: `"${song.name}" is now downloaded and ready for 100% offline playback.`,
        song,
      });
    } else {
      if (res.reason === 'low_storage') {
        Alert.alert('Storage Low', 'Your device is low on storage (< 50 MB free). Please free up disk space.');
      } else if (res.reason !== 'local_bundled') {
        Alert.alert('Download Error', res.message || 'Could not download track.');
      }
    }
    return res;
  };

  // Fast Export / Save Song directly to Phone's Device Storage (.mp3 in Downloads / Music)
  const exportSongToDevice = async (song) => {
    if (!song) return { success: false, message: 'Invalid song' };
    showInAppToast && showInAppToast(`⚡ Fast downloading "${song.name}" to device... 📥`, 'info');
    const res = await exportTrackToDeviceStorage(song);
    if (res.success) {
      showInAppToast && showInAppToast(res.message || `Saved "${song.name}.mp3" to Device!`, 'success');
      addNotification({
        type: 'download',
        title: 'Saved to Device',
        message: `"${song.name}.mp3" was saved directly to your phone storage.`,
        song,
      });
    } else {
      Alert.alert('Download Error', res.message || 'Could not save track to device.');
    }
    return res;
  };

  // Remove a downloaded song from storage
  const removeDownload = async (songId) => {
    if (!songId && songId !== 0) return false;
    const res = await removeDownloadedTrack(songId);
    if (res) {
      const stored = await getStoredDownloads();
      setDownloadedSongs(stored);
      const sStats = await getStorageStats();
      setStorageStats(sStats);
    }
    return res;
  };

  // Download entire playlist or album
  const downloadPlaylistPacks = async (name, songsList, options = {}) => {
    if (!Array.isArray(songsList) || songsList.length === 0) return;
    const q = options.quality || downloadQuality;
    const estimated = getEstimatedPlaylistSizeMB(songsList, q);

    Alert.alert(
      `Download "${name}"`,
      `Download all ${songsList.length} tracks (~${estimated}) for offline listening?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Download (~${estimated})`,
          onPress: async () => {
            const res = await downloadPlaylist(name, songsList, { quality: q });
            const stored = await getStoredDownloads();
            setDownloadedSongs(stored);
            const sStats = await getStorageStats();
            setStorageStats(sStats);
            if (res.downloadedCount > 0) {
              addNotification({
                type: 'download',
                title: 'Playlist Downloaded',
                message: `Downloaded ${res.downloadedCount} songs from "${name}" offline.`,
                song: songsList[0],
              });
            }
            if (res.message) {
              Alert.alert('Playlist Offline', res.message);
            }
          },
        },
      ]
    );
  };

  // Refresh storage statistics
  const refreshStorageInfo = async () => {
    const sStats = await getStorageStats();
    setStorageStats(sStats);
    const cStats = await getCacheStats();
    setCacheStats(cStats);
    const stored = await getStoredDownloads();
    setDownloadedSongs(stored);
  };

  // Clear streaming cache without deleting permanent downloads
  const clearStreamingCacheOnly = async () => {
    const success = await clearStreamingCache();
    if (success) {
      const cStats = await getCacheStats();
      setCacheStats(cStats);
    }
    return success;
  };

  // Clear all permanent downloads
  const clearAllOfflineTracks = async () => {
    const success = await clearAllDownloads();
    if (success) {
      setDownloadedSongs({});
      const sStats = await getStorageStats();
      setStorageStats(sStats);
    }
    return success;
  };

  const proceedWithPlayTrack = async (track, options = {}) => {
    if (!track) return;
    if (isMockOrLegacySong(track)) {
      console.log('Blocked playback of mock song:', track.name);
      return;
    }
    const songId = track._id || track.id;

    // Maintain & sync the active playback queue
    if (options.queue && Array.isArray(options.queue) && options.queue.length > 0) {
      const cleanQueue = options.queue.filter((s) => !isMockOrLegacySong(s));
      setActiveQueue(cleanQueue);
      activeQueueRef.current = cleanQueue;
      activeQueueSourceRef.current = options.queueSource || 'playlist';
    } else {
      // If no explicit queue passed, check if track belongs to currently active queue
      const inCurrentQueue = (activeQueueRef.current || []).some(
        (s) => String(s._id || s.id) === String(songId)
      );
      if (!inCurrentQueue) {
        // Find if this song belongs to selectedPlaylist or any public playlist
        const matchedPl =
          (selectedPlaylist && Array.isArray(selectedPlaylist.songs) && selectedPlaylist.songs.some((s) => String(s?._id || s?.id) === String(songId)))
            ? selectedPlaylist
            : (publicPlaylistsRef.current || []).find((p) => Array.isArray(p.songs) && p.songs.some((s) => String(s?._id || s?.id) === String(songId)));

        if (matchedPl && Array.isArray(matchedPl.songs)) {
          const plQueue = matchedPl.songs.filter(Boolean).filter((s) => !isMockOrLegacySong(s));
          if (plQueue.length > 0) {
            setActiveQueue(plQueue);
            activeQueueRef.current = plQueue;
            activeQueueSourceRef.current = `playlist:${matchedPl._id || matchedPl.id}`;
          }
        }
      }
    }

    // Check offline availability when Offline Mode is active
    const localUri = await getLocalTrackUri(songId);
    if (!localUri && offlineMode) {
      if (typeof track.file === 'number') {
        // Bundled local asset is inherently available offline on the device
      } else {
        Alert.alert(
          'Offline Mode Active',
          `"${track.name}" is not downloaded on this device. You can download it when connected to internet or turn off Offline Mode.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Enrich track with latest metadata (including canvas video) from songs list if missing
    const songsList = songsRef.current || [];
    const matched = songsList.find((s) => String(s._id || s.id) === String(songId)) ||
      songsList.find((s) => s.name && s.name.trim().toLowerCase() === track.name?.trim().toLowerCase());
    const enrichedTrack = {
      ...(matched || {}),
      ...track,
      video: track.video || matched?.video || '',
      videoPublicId: track.videoPublicId || matched?.videoPublicId || '',
    };

    setCurrentTrack(enrichedTrack);
    AsyncStorage.setItem('@pulse_sound_last_played_track', JSON.stringify(enrichedTrack)).catch(() => {});
    const initialSeek = typeof options.seekMillis === 'number' && options.seekMillis > 0 ? options.seekMillis : 0;
    setPlaybackPosition(initialSeek);
    const dur = parseDurationToMillis(track.duration);
    setPlaybackDuration(dur);
    setIsPlaying(true);
    hasCrossfadedRef.current = false;
    isTransitioningRef.current = false;

    // Start playback immediately at requested seek point without waiting for full download
    tryNativePlay(track, initialSeek, options);

    // Track active listening
    listenedSongsRef.current.add(String(songId));

    // Automatic Full-Song Streaming Cache:
    // Whenever a user starts playing a new song, automatically cache the complete audio file in the background.
    if (!localUri && typeof track.file !== 'number') {
      cacheStreamingSong(track)
        .then((cachedPath) => {
          if (cachedPath) {
            refreshCachedSongIds().then((cIds) => {
              setCachedSongIds(cIds);
              refreshStorageInfo();
            });
          }
        })
        .catch((err) => {
          console.log('Background auto-cache error:', err?.message);
        });
    }

    // Predictive Pre-Fetching: buffer upcoming tracks in background so next track plays with 0 delay!
    try {
      const trackList = getEffectiveTrackList();
      const currentIndex = trackList.findIndex((s) => String(s._id || s.id) === String(songId));
      if (currentIndex !== -1 && trackList.length > 1) {
        precacheNextTracks(trackList, currentIndex, 2);
      }
    } catch (_) {}
  };

  // Play a specific track with advanced DJ Crossfade & Volume Normalization
  const playTrack = (track, options = {}) => {
    if (!track) return;
    if (isMockOrLegacySong(track)) {
      console.log('Blocked playback of mock song:', track.name);
      return;
    }
    // Clean up any in-flight crossfade or secondary audio track immediately
    cancelCrossfade();
    proceedWithPlayTrack(track, options);
  };

  // Play / Pause toggle
  const togglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      tryNativePause();
    } else {
      setIsPlaying(true);
      isPlayingRef.current = true;
      if (crossfadeStateRef.current.isCrossfading) {
        if (nativePlayerRef.current) try { nativePlayerRef.current.play(); } catch (_) {}
        if (secondaryPlayerRef.current) try { secondaryPlayerRef.current.play(); } catch (_) {}
      } else {
        if (nativePlayerRef.current && nativePlayerRef.current.paused) {
          try {
            nativePlayerRef.current.play();
          } catch (e) {
            tryNativePlay(currentTrack, playbackPosition);
          }
        } else {
          tryNativePlay(currentTrack, playbackPosition);
        }
      }
      setTimeout(() => applyAudioEffects(audioEffectsRef.current), 60);
    }
  };

  // Dismiss currently playing track from mini player
  const dismissCurrentTrack = () => {
    setIsPlaying(false);
    cancelCrossfade();
    tryNativePause();
    setCurrentTrack(null);
  };

  // Next Track
  const nextTrack = () => {
    const trackList = getEffectiveTrackList();
    const current = currentTrackRef.current;
    if (!trackList || trackList.length === 0) return;
    const currentId = String(current ? (current._id || current.id) : '');
    const currentIndex = trackList.findIndex((s) => String(s._id || s.id) === currentId);
    let nextIndex;
    if (isShuffleRef.current) {
      if (trackList.length === 1) {
        nextIndex = 0;
      } else {
        do {
          nextIndex = Math.floor(Math.random() * trackList.length);
        } while (nextIndex === currentIndex && trackList.length > 1);
      }
    } else {
      if (currentIndex === -1) {
        nextIndex = 0;
      } else {
        nextIndex = (currentIndex + 1) % trackList.length;
      }
    }
    cancelCrossfade();
    playTrack(trackList[nextIndex], {
      queue: trackList,
      queueSource: activeQueueSourceRef.current,
    });
  };

  // Previous Track
  const prevTrack = () => {
    const trackList = getEffectiveTrackList();
    const current = currentTrackRef.current;
    if (!trackList || trackList.length === 0) return;
    const currentId = String(current ? (current._id || current.id) : '');
    const currentIndex = trackList.findIndex((s) => String(s._id || s.id) === currentId);
    const prevIndex = currentIndex <= 0 ? trackList.length - 1 : currentIndex - 1;
    cancelCrossfade();
    playTrack(trackList[prevIndex], {
      queue: trackList,
      queueSource: activeQueueSourceRef.current,
    });
  };

  // Seek To Position
  const seekTo = (millis) => {
    const dur = playbackDurationRef.current || playbackDuration;
    const boundedMillis = Math.max(0, Math.min(millis, dur));
    setPlaybackPosition(boundedMillis);

    // Cancel active crossfade on manual seek and restore primary player volume
    if (crossfadeStateRef.current.isCrossfading) {
      cancelCrossfade();
      if (nativePlayerRef.current) {
        nativePlayerRef.current.volume = normalizeVolumeRef.current ? 0.88 : 1.0;
      }
    }

    try {
      if (nativePlayerRef.current) {
        if (typeof nativePlayerRef.current.seekTo === 'function') {
          nativePlayerRef.current.seekTo(boundedMillis / 1000);
        }
        if (isPlayingRef.current && nativePlayerRef.current.paused) {
          try { nativePlayerRef.current.play(); } catch (_) {}
        }
      } else if (currentTrack) {
        tryNativePlay(currentTrack, boundedMillis);
      }
    } catch (err) {
      console.log('Seek note:', err?.message);
    }
  };

  // Dynamic Volume Normalization listener
  useEffect(() => {
    if (nativePlayerRef.current && !crossfadeStateRef.current.isCrossfading) {
      try {
        nativePlayerRef.current.volume = normalizeVolume ? 0.88 : 1.0;
      } catch (e) {}
    }
  }, [normalizeVolume]);

  // Smooth live progress timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        let liveMillis = null;
        if (nativePlayerRef.current && typeof nativePlayerRef.current.currentTime === 'number') {
          const liveSec = nativePlayerRef.current.currentTime;
          if (liveSec > 0) {
            liveMillis = Math.round(liveSec * 1000);
            setPlaybackPosition(liveMillis);
          }
        }

        if (liveMillis !== null) {
          checkAutoCrossfade(liveMillis, playbackDurationRef.current);
          return;
        }

        setPlaybackPosition((prev) => {
          const newPos = prev + 1000;
          checkAutoCrossfade(newPos, playbackDurationRef.current);

          if (newPos >= playbackDurationRef.current && playbackDurationRef.current > 0) {
            if (crossfadeStateRef.current.isCrossfading || hasCrossfadedRef.current || isTransitioningRef.current) {
              return playbackDurationRef.current;
            }
            if (isRepeatRef.current) {
              return 0;
            } else {
              nextTrack();
              return 0;
            }
          }
          return newPos;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playbackDuration, currentTrack]);

  const formatTime = (millis) => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Filtered list of 100% offline-ready songs (bundled, permanently downloaded, or auto-cached)
  const offlineSongs = useMemo(() => {
    const ready = [];
    const seenIds = new Set();
    (songs || []).forEach((s) => {
      const id = String(s._id || s.id);
      if (isOfflineReady(id) || typeof s.file === 'number') {
        ready.push(s);
        seenIds.add(id);
      }
    });
    Object.values(downloadedSongs || {}).forEach((record) => {
      const id = String(record._id || record.id);
      if (!seenIds.has(id)) {
        ready.push(record);
        seenIds.add(id);
      }
    });
    return ready;
  }, [songs, downloadedSongs, cachedSongIds]);

  return (
    <PlayerContext.Provider
      value={{
        songs,
        albums,
        currentTrack,
        isPlaying,
        playbackPosition,
        playbackDuration,
        selectedAlbum,
        setSelectedAlbum,
        isFullPlayerOpen,
        setIsFullPlayerOpen,
        activeTab,
        setActiveTab,
        isShuffle,
        setIsShuffle,
        isRepeat,
        setIsRepeat,
        isProfileOpen,
        setIsProfileOpen,
        likedSongIds,
        toggleLikeSong,
        isSongLiked,
        playlists,
        selectedPlaylist,
        setSelectedPlaylist,
        addToPlaylistSong,
        setAddToPlaylistSong,
        createPlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        toggleSongInPlaylist,
        playTrack,
        togglePlayPause,
        dismissCurrentTrack,
        setCurrentTrack,
        nextTrack,
        prevTrack,
        seekTo,
        formatTime,
        audioQuality,
        setAudioQuality,
        normalizeVolume,
        setNormalizeVolume,
        crossfadeEnabled,
        setCrossfadeEnabled,
        crossfadeDuration,
        setCrossfadeDuration,
        offlineMode,
        setOfflineMode,
        offlineSongs,
        notifications,
        unreadNotificationCount,
        isNotificationModalOpen,
        setIsNotificationModalOpen,
        isPulseFindOpen,
        setIsPulseFindOpen,
        isPulseBubbleVisible,
        setIsPulseBubbleVisible,
        isPulseFindLocked,
        setIsPulseFindLocked,
        isPulseLockedModalOpen,
        setIsPulseLockedModalOpen,
        inAppToast,
        showInAppToast,
        dismissInAppToast,
        markAllNotificationsRead,
        clearAllNotifications,
        removeNotification,
        addNotification,
        downloadQuality,
        setDownloadQuality,
        downloadedSongs,
        downloadProgressMap,
        activeDownloadCount,
        storageStats,
        cacheStats,
        cachedSongIds,
        isTrackDownloaded,
        isTrackCached,
        isOfflineReady,
        getTrackDownloadProgress,
        isTrackDownloading,
        downloadSong,
        exportSongToDevice,
        removeDownload,
        downloadPlaylistPacks,
        refreshStorageInfo,
        clearStreamingCacheOnly,
        clearAllOfflineTracks,
        followingCount,
        setFollowingCount,
        publicPlaylists,
        setPublicPlaylists,
        reorderQueue,
        removeSongFromQueue,
        isEqualizerOpen,
        setIsEqualizerOpen,
        audioEffects,
        setAudioEffects,
        isAudioEffectsSaved,
        setIsAudioEffectsSaved,
        saveAudioEffects,
        resetAudioEffects,
        updateAudioEffects,
        audioPresets: AUDIO_PRESETS,
        defaultAudioEffects: DEFAULT_AUDIO_EFFECTS,
        audioEnergy,
        bassEnergy,
        midEnergy,
        trebleEnergy,
        beatCount,
        eqPreset,
        setEqPreset,
        eqBands,
        setEqBands,
        eqEnhancers,
        setEqEnhancers,
        isEqEnabled,
        setIsEqEnabled,
        applyAudioEffects,
        defaultEqBands,
        eqPresets: EQ_PRESETS,
        refreshBackendData,
        isSyncingBackend,
        backendStatus,
        isYouTubeModalOpen,
        setIsYouTubeModalOpen,
        initialYouTubeUrl,
        setInitialYouTubeUrl,
        openYouTubeImporter,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
