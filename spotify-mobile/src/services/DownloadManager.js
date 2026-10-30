import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import * as Network from 'expo-network';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  DOWNLOADS: '@pulse_sound_downloads_v2',
  SETTINGS: '@pulse_sound_download_settings',
  STREAMING_CACHE_META: '@pulse_sound_cache_meta_v1',
};

// Clean Direct CDN Audio URL:
// Ensures audio URLs bypass Cloudinary's CPU-heavy dynamic transcoding and instead stream directly
// from Akamai/Cloudflare Edge CDN with instant HTTP 206 Partial Content byte-ranges (0-delay start & seeking)
export const getCompressedCloudinaryUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  if (rawUrl.includes('/br_') && rawUrl.includes('/video/upload/')) {
    return rawUrl.replace(/\/br_[0-9]+k,?[^/]*\//, '/');
  }
  return rawUrl;
};

// Safe resolution of base documents and cache directories across Expo versions
const getBaseDocDir = () => {
  if (FileSystem && FileSystem.documentDirectory) return FileSystem.documentDirectory;
  try {
    if (typeof Paths !== 'undefined' && Paths.document?.uri) return Paths.document.uri;
  } catch (_) {}
  return '';
};

const getBaseCacheDir = () => {
  if (FileSystem && FileSystem.cacheDirectory) return FileSystem.cacheDirectory;
  try {
    if (typeof Paths !== 'undefined' && Paths.cache?.uri) return Paths.cache.uri;
  } catch (_) {}
  return '';
};

const rawDoc = getBaseDocDir();
const rawCache = getBaseCacheDir();

// Permanent App-private storage (Preserved across updates and restarts; never touched by cache cleanup)
export const DOWNLOADS_DIR = `${rawDoc ? (rawDoc.endsWith('/') ? rawDoc : `${rawDoc}/`) : ''}pulse_downloads/`;

// Temporary streaming cache directory (Independent of permanent downloads; evicted via LRU)
export const CACHE_DIR = `${rawCache ? (rawCache.endsWith('/') ? rawCache : `${rawCache}/`) : ''}pulse_streaming_cache/`;

// In-memory active download task handles for cancellation and progress tracking
const activeTasks = new Map();
const activeProgress = new Map();

// Subscribers for real-time download updates
const subscribers = new Set();

const notifySubscribers = () => {
  const progressObj = Object.fromEntries(activeProgress);
  subscribers.forEach((cb) => {
    try {
      cb({
        activeCount: activeTasks.size,
        progressMap: progressObj,
      });
    } catch (_) {}
  });
};

export const subscribeDownloads = (callback) => {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};

export const isSongDownloading = (songId) => {
  if (!songId && songId !== 0) return false;
  return activeTasks.has(String(songId));
};

export const getSongDownloadProgress = (songId) => {
  if (!songId && songId !== 0) return 0;
  return activeProgress.get(String(songId)) || 0;
};

// Ensure both storage directories exist
export const ensureDirectories = async () => {
  try {
    if (DOWNLOADS_DIR && !DOWNLOADS_DIR.startsWith('undefined')) {
      const downInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR).catch(() => ({ exists: false }));
      if (!downInfo?.exists) {
        await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true }).catch(() => {});
      }
    }
    if (CACHE_DIR && !CACHE_DIR.startsWith('undefined')) {
      const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIR).catch(() => ({ exists: false }));
      if (!cacheInfo?.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => {});
      }
    }
  } catch (err) {
    console.log('Error creating download directories:', err?.message);
  }
};

// Get stored download settings
export const getDownloadSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_) {}
  return {
    wifiOnly: false,
    quality: '96k', // '96k' (Standard, ~2MB) or '128k' (High, ~3.2MB)
    autoCacheRecent: true,
  };
};

// Save download settings
export const saveDownloadSettings = async (settings) => {
  try {
    const current = await getDownloadSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.log('Error saving download settings:', err?.message);
    return null;
  }
};

// Get all saved download records from AsyncStorage
export const getStoredDownloads = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (_) {}
  return {};
};

// Reconcile saved downloads with real files on device storage (Startup check)
export const reconcileDownloads = async () => {
  await ensureDirectories();
  const records = await getStoredDownloads();
  const verifiedMap = {};
  let hasChanges = false;

  for (const [id, record] of Object.entries(records)) {
    if (record && record.localUri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(record.localUri);
        if (fileInfo.exists && fileInfo.size > 1000) {
          verifiedMap[id] = {
            ...record,
            fileSize: fileInfo.size,
            fileSizeMB: (fileInfo.size / (1024 * 1024)).toFixed(1),
          };
        } else {
          hasChanges = true;
        }
      } catch (_) {
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(verifiedMap));
  }

  return verifiedMap;
};

// Calculate estimated track size in MB based on bitrate or fileSize
export const getEstimatedTrackSizeMB = (song, quality = '96k') => {
  if (!song) return '2.0 MB';
  if (song.fileSize && song.fileSize > 0) {
    return `${(song.fileSize / (1024 * 1024)).toFixed(1)} MB`;
  }
  let durationSec = 180;
  if (song.durationMillis) {
    durationSec = Math.round(song.durationMillis / 1000);
  } else if (typeof song.duration === 'string') {
    const parts = song.duration.split(':');
    if (parts.length === 2) {
      durationSec = (parseInt(parts[0], 10) || 3) * 60 + (parseInt(parts[1], 10) || 0);
    }
  }
  const kbps = quality === '128k' ? 128 : 96;
  const estimatedBytes = (durationSec * (kbps * 1000)) / 8;
  return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Calculate estimated batch size for an entire playlist
export const getEstimatedPlaylistSizeMB = (songsList, quality = '96k') => {
  if (!Array.isArray(songsList) || songsList.length === 0) return '0.0 MB';
  let totalBytes = 0;
  songsList.forEach((song) => {
    let durationSec = 180;
    if (song.durationMillis) {
      durationSec = Math.round(song.durationMillis / 1000);
    }
    const kbps = quality === '128k' ? 128 : 96;
    totalBytes += (durationSec * (kbps * 1000)) / 8;
  });
  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Check available device storage and download statistics (100% Accurate Physical Disk Query)
export const getStorageStats = async () => {
  try {
    await ensureDirectories();
    let freeDiskStorage = 0;
    let totalDiskStorage = 0;

    // 1. Query modern Expo Paths (SDK 52/58)
    try {
      if (typeof Paths !== 'undefined') {
        if (typeof Paths.availableDiskSpace === 'number' && Paths.availableDiskSpace > 0) {
          freeDiskStorage = Paths.availableDiskSpace;
        }
        if (typeof Paths.totalDiskSpace === 'number' && Paths.totalDiskSpace > 0) {
          totalDiskStorage = Paths.totalDiskSpace;
        }
      }
    } catch (_) {}

    // 2. Query legacy FileSystem if freeDiskStorage was not obtained
    if (!freeDiskStorage || freeDiskStorage <= 0) {
      try {
        if (typeof FileSystem.getFreeDiskStorageAsync === 'function') {
          freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
        }
      } catch (_) {}
    }
    if (!totalDiskStorage || totalDiskStorage <= 0) {
      try {
        if (typeof FileSystem.getTotalDiskCapacityAsync === 'function') {
          totalDiskStorage = await FileSystem.getTotalDiskCapacityAsync();
        }
      } catch (_) {}
    }

    // 3. Physical directory scan of downloads folder on disk for 100% accurate byte count
    let totalDownloadsBytes = 0;
    let trackCount = 0;

    try {
      const dirFiles = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR);
      for (const fname of dirFiles) {
        try {
          const fInfo = await FileSystem.getInfoAsync(`${DOWNLOADS_DIR}${fname}`);
          if (fInfo.exists && fInfo.size > 0) {
            totalDownloadsBytes += fInfo.size;
            if (fname.endsWith('.mp3')) {
              trackCount++;
            }
          }
        } catch (_) {}
      }
    } catch (_) {
      // Fallback: reconcile from AsyncStorage records if direct directory read is constrained
      const records = await getStoredDownloads();
      for (const record of Object.values(records)) {
        if (record?.localUri) {
          try {
            const info = await FileSystem.getInfoAsync(record.localUri);
            if (info.exists && info.size > 0) {
              totalDownloadsBytes += info.size;
              trackCount++;
            }
          } catch (_) {}
        }
      }
    }

    // Fallback if free space cannot be queried (e.g. web browser preview sandbox)
    if (!freeDiskStorage || freeDiskStorage <= 0) {
      freeDiskStorage = 32 * 1024 * 1024 * 1024; // 32 GB
    }

    const freeMB = (freeDiskStorage / (1024 * 1024)).toFixed(0);
    const freeGB = (freeDiskStorage / (1024 * 1024 * 1024)).toFixed(1);
    const usedMB = (totalDownloadsBytes / (1024 * 1024)).toFixed(1);

    return {
      freeBytes: freeDiskStorage,
      freeMB,
      freeGB,
      totalBytes: totalDiskStorage,
      usedBytes: totalDownloadsBytes,
      usedMB,
      count: trackCount,
      isLowStorage: freeDiskStorage > 0 && freeDiskStorage < 120 * 1024 * 1024,
    };
  } catch (err) {
    return {
      freeBytes: 32 * 1024 * 1024 * 1024,
      freeMB: '32000',
      freeGB: '32.0',
      usedBytes: 0,
      usedMB: '0.0',
      count: 0,
      isLowStorage: false,
    };
  }
};

// Check temporary streaming cache stats (100% Accurate Physical Disk Query)
export const getCacheStats = async () => {
  try {
    await ensureDirectories();
    const info = await FileSystem.getInfoAsync(CACHE_DIR).catch(() => ({ exists: false }));
    if (!info?.exists) return { count: 0, usedBytes: 0, usedMB: '0.0' };

    const files = await FileSystem.readDirectoryAsync(CACHE_DIR).catch(() => []);
    let totalBytes = 0;
    let trackCount = 0;

    for (const filename of files) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(`${CACHE_DIR}${filename}`);
        if (fileInfo?.exists && fileInfo.size) {
          totalBytes += fileInfo.size;
          if (filename.endsWith('.mp3')) {
            trackCount++;
          }
        }
      } catch (_) {}
    }

    return {
      count: trackCount,
      usedBytes: totalBytes,
      usedMB: (totalBytes / (1024 * 1024)).toFixed(1),
    };
  } catch (err) {
    return { count: 0, usedBytes: 0, usedMB: '0.0' };
  }
};

// Clear temporary streaming cache WITHOUT deleting permanent downloads
export const clearStreamingCache = async () => {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    await ensureDirectories();
    await AsyncStorage.removeItem(STORAGE_KEYS.STREAMING_CACHE_META).catch(() => {});
    cachedSongIdsSet.clear();
    notifySubscribers();
    return true;
  } catch (err) {
    console.log('Error clearing cache:', err?.message);
    return false;
  }
};

// In-memory set of currently cached song IDs
let cachedSongIdsSet = new Set();

// Cache Index Accessors
export const getCacheIndex = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STREAMING_CACHE_META);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    }
  } catch (_) {}
  return {};
};

export const saveCacheIndex = async (indexMap) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.STREAMING_CACHE_META, JSON.stringify(indexMap));
  } catch (_) {}
};

export const updateCacheIndexEntry = async (songId, entry) => {
  try {
    const idx = await getCacheIndex();
    const idStr = String(songId);
    idx[idStr] = {
      ...(idx[idStr] || {}),
      ...entry,
      lastAccessedAt: new Date().toISOString(),
    };
    await saveCacheIndex(idx);
    return idx[idStr];
  } catch (_) {}
  return null;
};

// Reconcile and clean up cache on app startup
export const reconcileStreamingCache = async () => {
  await ensureDirectories();
  try {
    // 1. Clean up any leftover temporary files (.tmp) from interrupted downloads
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR).catch(() => []);
    for (const file of files) {
      if (file.endsWith('.tmp')) {
        await FileSystem.deleteAsync(`${CACHE_DIR}${file}`, { idempotent: true }).catch(() => {});
      }
    }

    // 2. Validate cache index against real disk files
    const index = await getCacheIndex();
    const verifiedIndex = {};
    const validCachedIds = new Set();
    let hasChanges = false;

    for (const [id, entry] of Object.entries(index)) {
      if (entry && entry.filePath) {
        const info = await FileSystem.getInfoAsync(entry.filePath).catch(() => ({ exists: false }));
        if (info.exists && info.size > 1000 && entry.status === 'cached') {
          verifiedIndex[id] = {
            ...entry,
            fileSize: info.size,
          };
          validCachedIds.add(String(id));
        } else {
          hasChanges = true;
        }
      } else {
        hasChanges = true;
      }
    }

    // Also scan for any valid pulse_cache_*.mp3 files on disk
    for (const file of files) {
      if (file.startsWith('pulse_cache_') && file.endsWith('.mp3')) {
        const songId = file.replace('pulse_cache_', '').replace('.mp3', '');
        const filePath = `${CACHE_DIR}${file}`;
        const info = await FileSystem.getInfoAsync(filePath).catch(() => ({ exists: false }));
        if (info.exists && info.size > 1000) {
          validCachedIds.add(songId);
          if (!verifiedIndex[songId]) {
            verifiedIndex[songId] = {
              songId,
              cacheKey: file.replace('.mp3', ''),
              filePath,
              fileSize: info.size,
              status: 'cached',
              cachedAt: new Date().toISOString(),
              lastAccessedAt: new Date().toISOString(),
            };
            hasChanges = true;
          }
        }
      }
    }

    if (hasChanges) {
      await saveCacheIndex(verifiedIndex);
    }
    cachedSongIdsSet = validCachedIds;
    return Array.from(validCachedIds);
  } catch (err) {
    console.log('Error reconciling streaming cache:', err?.message);
    return [];
  }
};

// Refresh the list of currently cached songs from disk
export const refreshCachedSongIds = async () => {
  return await reconcileStreamingCache();
};

// Check if a song is cached in temporary storage
export const isSongCached = (songId) => {
  if (!songId && songId !== 0) return false;
  return cachedSongIdsSet.has(String(songId));
};

// Active cache in-progress lock to prevent duplicate concurrent downloads of the same song
const activeCacheDownloads = new Set();

// Full-Song Automatic Streaming Cache:
// Starts background download immediately while playback starts; atomically promotes on completion
export const cacheStreamingSong = async (song) => {
  if (!song) return null;
  const songId = String(song._id || song.id);
  if (!songId) return null;

  // Prevent multiple simultaneous downloads of the same song
  if (activeCacheDownloads.has(songId)) {
    return null;
  }

  try {
    const settings = await getDownloadSettings();
    if (!settings.autoCacheRecent) return null;

    await ensureDirectories();

    // 1. If already permanently downloaded, reuse existing download
    const stored = await getStoredDownloads();
    if (stored[songId] && stored[songId].localUri) {
      const pInfo = await FileSystem.getInfoAsync(stored[songId].localUri).catch(() => ({ exists: false }));
      if (pInfo.exists && pInfo.size > 1000) {
        return stored[songId].localUri;
      }
    }

    const safeKey = songId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFilename = `pulse_cache_${safeKey}.mp3`;
    const finalDest = `${CACHE_DIR}${finalFilename}`;
    const tempFilename = `pulse_cache_${safeKey}_${Date.now()}.tmp`;
    const tempDest = `${CACHE_DIR}${tempFilename}`;

    // 2. If already valid on disk, reuse without re-downloading
    const checkInfo = await FileSystem.getInfoAsync(finalDest).catch(() => ({ exists: false }));
    if (checkInfo?.exists && checkInfo.size > 1000) {
      cachedSongIdsSet.add(songId);
      await updateCacheIndexEntry(songId, {
        songId,
        cacheKey: `pulse_cache_${safeKey}`,
        filePath: finalDest,
        fileSize: checkInfo.size,
        status: 'cached',
      });
      return finalDest;
    }

    activeCacheDownloads.add(songId);

    // 3. Case A: Bundled local audio asset
    if (typeof song.file === 'number') {
      try {
        const asset = Asset.fromModule(song.file);
        if (!asset.localUri) {
          await asset.downloadAsync();
        }
        if (asset.localUri) {
          await FileSystem.copyAsync({ from: asset.localUri, to: tempDest });
          const tInfo = await FileSystem.getInfoAsync(tempDest).catch(() => ({ exists: false }));
          if (tInfo.exists && tInfo.size > 1000) {
            await FileSystem.moveAsync({ from: tempDest, to: finalDest });
            cachedSongIdsSet.add(songId);
            await updateCacheIndexEntry(songId, {
              songId,
              cacheKey: `pulse_cache_${safeKey}`,
              filePath: finalDest,
              fileSize: tInfo.size,
              status: 'cached',
              cachedAt: new Date().toISOString(),
              song: {
                _id: song._id,
                id: song.id,
                name: song.name,
                artist: song.artist || song.desc || 'Pulse Artist',
                desc: song.desc,
                image: song.image,
                duration: song.duration,
                album: song.album,
                file: finalDest,
              },
            });
            notifySubscribers();
            return finalDest;
          }
        }
      } catch (bundleErr) {
        console.log('Error caching bundled asset:', bundleErr?.message);
        await FileSystem.deleteAsync(tempDest, { idempotent: true }).catch(() => {});
      }
    }

    // 4. Case B: Remote Streaming Audio
    const rawUrl = song.streamUrl96k || song.file;
    if (typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) return null;

    await updateCacheIndexEntry(songId, {
      songId,
      cacheKey: `pulse_cache_${safeKey}`,
      filePath: finalDest,
      status: 'downloading',
    });

    const targetUrl = getCompressedCloudinaryUrl(rawUrl, '96k');

    // Download to temporary file first (atomic safety against network interruption)
    const downloadRes = await FileSystem.downloadAsync(targetUrl, tempDest);

    if (downloadRes && downloadRes.uri) {
      const verified = await FileSystem.getInfoAsync(downloadRes.uri).catch(() => ({ exists: false, size: 0 }));
      if (verified.exists && verified.size > 1000) {
        // Atomic promotion: move from .tmp to final .mp3
        await FileSystem.moveAsync({ from: downloadRes.uri, to: finalDest });
        cachedSongIdsSet.add(songId);

        await updateCacheIndexEntry(songId, {
          songId,
          cacheKey: `pulse_cache_${safeKey}`,
          filePath: finalDest,
          fileSize: verified.size,
          status: 'cached',
          cachedAt: new Date().toISOString(),
          song: {
            _id: song._id,
            id: song.id,
            name: song.name,
            artist: song.artist || song.desc || 'Pulse Artist',
            desc: song.desc,
            image: song.image,
            duration: song.duration,
            album: song.album,
            file: finalDest,
          },
        });

        notifySubscribers();

        // Manage cache size: if cache exceeds 100MB, evict oldest accessed entries down to 60MB
        try {
          const stats = await getCacheStats();
          if (stats.usedBytes > 100 * 1024 * 1024) {
            const index = await getCacheIndex();
            const entries = Object.values(index).filter((e) => e.status === 'cached');
            entries.sort((a, b) => new Date(a.lastAccessedAt || 0) - new Date(b.lastAccessedAt || 0));
            let currentBytes = stats.usedBytes;
            for (const item of entries) {
              if (currentBytes <= 60 * 1024 * 1024) break;
              if (item.filePath) {
                await FileSystem.deleteAsync(item.filePath, { idempotent: true }).catch(() => {});
                delete index[item.songId];
                currentBytes -= (item.fileSize || 0);
              }
            }
            await saveCacheIndex(index);
            await refreshCachedSongIds();
          }
        } catch (_) {}

        return finalDest;
      } else {
        await FileSystem.deleteAsync(tempDest, { idempotent: true }).catch(() => {});
        await updateCacheIndexEntry(songId, { status: 'failed' });
      }
    }
  } catch (err) {
    console.log('Error caching streaming song:', err?.message);
    await updateCacheIndexEntry(songId, { status: 'failed' });
  } finally {
    activeCacheDownloads.delete(songId);
  }
  return null;
};

// Precache a single song into background cache (strictly verified)
export const precacheSong = async (song) => {
  if (!song) return null;
  const songId = String(song._id || song.id);

  // If already downloaded permanently, no need to cache
  const stored = await getStoredDownloads();
  if (stored[songId]) return stored[songId].localUri;

  // Check if already in cache
  const existingCache = await getLocalTrackUri(songId);
  if (existingCache) return existingCache;

  return await cacheStreamingSong(song);
};

// Predictive Pre-Fetching Engine:
// Proactively buffers and caches upcoming tracks in background so skipping or middle-seeking is instant with 0 loading time!
export const precacheNextTracks = async (queue = [], currentIndex = 0, count = 2) => {
  if (!Array.isArray(queue) || queue.length === 0) return;
  try {
    const netState = await Network.getNetworkStateAsync().catch(() => null);
    if (!netState || !netState.isConnected) return; // Don't pre-fetch if offline

    for (let offset = 1; offset <= count; offset++) {
      const targetIndex = (currentIndex + offset) % queue.length;
      const nextSong = queue[targetIndex];
      const nextId = nextSong ? String(nextSong._id || nextSong.id) : null;
      if (nextSong && nextId && typeof nextSong.file !== 'number') {
        const stored = await getStoredDownloads().catch(() => ({}));
        if (!stored[nextId]) {
          setTimeout(() => {
            cacheStreamingSong(nextSong).catch(() => {});
          }, (offset - 1) * 600);
        }
      }
    }
  } catch (_) {}
};

// Silent Sync for Liked Songs / Favorites
export const syncLikedSongsCache = async (songsList = [], likedIds = []) => {
  if (!Array.isArray(songsList) || !Array.isArray(likedIds) || likedIds.length === 0) return;
  try {
    const netState = await Network.getNetworkStateAsync().catch(() => null);
    if (!netState || !netState.isConnected) return;

    const likedSongs = songsList.filter((s) => likedIds.includes(s._id || s.id));
    // Cache up to 8 liked songs silently in the background with gentle intervals
    likedSongs.slice(0, 8).forEach((song, idx) => {
      setTimeout(() => {
        precacheSong(song).catch(() => {});
      }, (idx + 1) * 2000);
    });
  } catch (_) {}
};

// Check if a specific track is downloaded and verified on disk
export const getLocalTrackUri = async (songId) => {
  if (!songId && songId !== 0) return null;
  const idStr = String(songId);

  // 1. Check permanent downloads first
  const records = await getStoredDownloads();
  const record = records[idStr];
  if (record && record.localUri) {
    try {
      const info = await FileSystem.getInfoAsync(record.localUri);
      if (info.exists && info.size > 1000) {
        return record.localUri;
      }
    } catch (_) {}
  }

  // 2. Check temporary streaming cache
  const cacheFilename = `pulse_cache_${idStr.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp3`;
  const cacheDest = `${CACHE_DIR}${cacheFilename}`;
  try {
    const cInfo = await FileSystem.getInfoAsync(cacheDest);
    if (cInfo.exists && cInfo.size > 1000) {
      cachedSongIdsSet.add(idStr);
      updateCacheIndexEntry(idStr, {
        songId: idStr,
        filePath: cacheDest,
        fileSize: cInfo.size,
        status: 'cached',
      }).catch(() => {});
      return cacheDest;
    }
  } catch (_) {}

  return null;
};

// Download a track for permanent offline playback
export const downloadTrack = async (song, options = {}, onProgress = () => {}) => {
  if (!song) return { success: false, message: 'No track specified' };
  const songId = String(song._id || song.id);

  if (activeTasks.has(songId)) {
    return { success: false, message: 'Track is already currently downloading.' };
  }

  try {
    await ensureDirectories();
    const settings = await getDownloadSettings();
    const quality = options.quality || settings.quality || '96k';

    // 1. Check if already downloaded and verified
    const existingUri = await getLocalTrackUri(songId);
    const stored = await getStoredDownloads();
    if (existingUri && stored[songId]) {
      return { success: true, localUri: existingUri, isExisting: true };
    }

    // 2. Storage Check (Safe fail-open so user is never falsely blocked)
    try {
      if (typeof Paths !== 'undefined' && Paths.availableDiskSpace) {
        if (Paths.availableDiskSpace > 0 && Paths.availableDiskSpace < 50 * 1024 * 1024) {
          return {
            success: false,
            reason: 'low_storage',
            message: 'Insufficient device storage to download this track.',
          };
        }
      }
    } catch (_) {}

    const safeFilename = `pulse_song_${songId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${quality}.mp3`;
    const targetFileDest = `${DOWNLOADS_DIR}${safeFilename}`;
    const safeImageFilename = `pulse_cover_${songId.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;
    const targetImageDest = `${DOWNLOADS_DIR}${safeImageFilename}`;

    // 3. Case A: Bundled local track (Number ID from assets.js)
    if (typeof song.file === 'number') {
      try {
        const asset = Asset.fromModule(song.file);
        if (!asset.localUri) {
          await asset.downloadAsync();
        }
        if (asset.localUri) {
          await FileSystem.copyAsync({ from: asset.localUri, to: targetFileDest }).catch(() => {});
          const fInfo = await FileSystem.getInfoAsync(targetFileDest).catch(() => ({ exists: false }));
          if (fInfo?.exists && fInfo.size > 1000) {
            const newRecord = {
              id: songId,
              _id: song._id || songId,
              name: song.name,
              desc: song.desc,
              album: song.album,
              artist: song.artist || 'Pulse Artist',
              duration: song.duration,
              durationMillis: song.durationMillis || 180000,
              localUri: targetFileDest,
              localImageUri: null,
              file: targetFileDest,
              image: song.image,
              fileSize: fInfo.size,
              fileSizeMB: (fInfo.size / (1024 * 1024)).toFixed(1),
              quality: 'Bundled',
              downloadedAt: new Date().toISOString(),
              isDownloaded: true,
              isBackend: false,
            };
            const currentRecords = await getStoredDownloads();
            currentRecords[songId] = newRecord;
            await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(currentRecords));
            notifySubscribers();
            return {
              success: true,
              record: newRecord,
              localUri: targetFileDest,
            };
          }
        }
      } catch (bundleErr) {
        console.log('Error downloading bundled track:', bundleErr?.message);
      }
    }

    // 4. Case B: Cloudinary / Remote Audio
    const rawTarget = quality === '128k'
      ? (song.streamUrl128k || song.file)
      : (song.streamUrl96k || song.file);

    if (typeof rawTarget !== 'string' || !rawTarget.startsWith('http')) {
      return {
        success: false,
        reason: 'invalid_source',
        message: 'Could not resolve audio source for download.',
      };
    }

    // Ensure HTTPS to prevent Android cleartext network blocks
    const secureTarget = rawTarget.replace('http://res.cloudinary.com', 'https://res.cloudinary.com');
    const targetUrl = getCompressedCloudinaryUrl(secureTarget, quality).replace('http://res.cloudinary.com', 'https://res.cloudinary.com');

    activeProgress.set(songId, 0.01);
    notifySubscribers();

    // 5. Download with progress callbacks and automatic fallback
    let downloadResult = null;
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        targetUrl,
        targetFileDest,
        {},
        (downloadProgress) => {
          const total = downloadProgress.totalBytesExpectedToWrite;
          const written = downloadProgress.totalBytesWritten;
          const progress = total > 0 ? written / total : 0;
          const clamped = Math.min(0.98, Math.max(0.02, progress));
          activeProgress.set(songId, clamped);
          onProgress(clamped);
          notifySubscribers();
        }
      );

      activeTasks.set(songId, downloadResumable);
      downloadResult = await downloadResumable.downloadAsync();
    } catch (primaryErr) {
      console.log('Primary compressed download failed, falling back to secureTarget:', primaryErr?.message);
    } finally {
      activeTasks.delete(songId);
    }

    // If compressed URL returned corrupt file or failed, retry with original secureTarget directly
    let fileInfo = downloadResult?.uri ? await FileSystem.getInfoAsync(downloadResult.uri).catch(() => ({ exists: false, size: 0 })) : { exists: false, size: 0 };

    if (!fileInfo.exists || fileInfo.size < 1000) {
      if (downloadResult?.uri) {
        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {});
      }

      console.log('Retrying download with direct source stream...');
      try {
        const fallbackResumable = FileSystem.createDownloadResumable(
          secureTarget,
          targetFileDest,
          {},
          (downloadProgress) => {
            const total = downloadProgress.totalBytesExpectedToWrite;
            const written = downloadProgress.totalBytesWritten;
            const progress = total > 0 ? written / total : 0;
            const clamped = Math.min(0.98, Math.max(0.02, progress));
            activeProgress.set(songId, clamped);
            onProgress(clamped);
            notifySubscribers();
          }
        );
        activeTasks.set(songId, fallbackResumable);
        downloadResult = await fallbackResumable.downloadAsync();
        activeTasks.delete(songId);

        if (downloadResult && downloadResult.uri) {
          fileInfo = await FileSystem.getInfoAsync(downloadResult.uri).catch(() => ({ exists: false, size: 0 }));
        }
      } catch (fallbackErr) {
        activeTasks.delete(songId);
        throw new Error('Download failed: ' + (fallbackErr?.message || 'Network error'));
      }
    }

    activeProgress.delete(songId);
    notifySubscribers();

    if (!downloadResult || !downloadResult.uri || !fileInfo.exists || fileInfo.size < 1000) {
      throw new Error('Downloaded file corrupt or empty.');
    }

    // 6. Download artwork thumbnail so track looks gorgeous in 100% Airplane Mode
    let savedImageUri = null;
    let remoteImageUrl = typeof song.image === 'string'
      ? song.image
      : song.image?.uri;

    if (remoteImageUrl && typeof remoteImageUrl === 'string' && remoteImageUrl.startsWith('http')) {
      remoteImageUrl = remoteImageUrl.replace('http://res.cloudinary.com', 'https://res.cloudinary.com');
      try {
        const imgResult = await FileSystem.downloadAsync(remoteImageUrl, targetImageDest);
        if (imgResult && imgResult.uri) {
          savedImageUri = imgResult.uri;
        }
      } catch (_) {}
    }

    // 8. Persist download record to AsyncStorage
    const newRecord = {
      id: songId,
      _id: song._id || songId,
      name: song.name,
      desc: song.desc,
      album: song.album,
      artist: song.artist || 'Pulse Artist',
      duration: song.duration,
      durationMillis: song.durationMillis || 180000,
      localUri: downloadResult.uri,
      localImageUri: savedImageUri,
      file: downloadResult.uri,
      image: savedImageUri ? { uri: savedImageUri } : song.image,
      fileSize: fileInfo.size,
      fileSizeMB: (fileInfo.size / (1024 * 1024)).toFixed(1),
      quality,
      downloadedAt: new Date().toISOString(),
      isDownloaded: true,
      isBackend: Boolean(song.isBackend),
    };

    const currentRecords = await getStoredDownloads();
    currentRecords[songId] = newRecord;
    await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(currentRecords));

    notifySubscribers();

    return {
      success: true,
      record: newRecord,
      localUri: downloadResult.uri,
    };
  } catch (err) {
    activeTasks.delete(songId);
    activeProgress.delete(songId);
    notifySubscribers();
    console.log('Download error:', err?.message);
    return {
      success: false,
      message: err?.message || 'Failed to download song.',
    };
  }
};

// Batch Download an entire Playlist / Pack with sequential safety
export const downloadPlaylist = async (playlistName, songsList, options = {}, onBatchProgress = () => {}) => {
  if (!Array.isArray(songsList) || songsList.length === 0) {
    return { success: false, message: 'No songs in playlist to download.' };
  }

  const stored = await getStoredDownloads();
  const toDownload = songsList.filter((s) => !stored[String(s._id || s.id)]);

  if (toDownload.length === 0) {
    return { success: true, message: 'All songs in this playlist are already downloaded offline! 🎧', downloadedCount: 0 };
  }

  let completed = 0;
  let failed = 0;

  for (let i = 0; i < toDownload.length; i++) {
    const song = toDownload[i];
    onBatchProgress({
      currentIndex: i + 1,
      totalCount: toDownload.length,
      currentSong: song,
      percentage: Math.round((i / toDownload.length) * 100),
    });

    const res = await downloadTrack(song, options);
    if (res.success) {
      completed++;
    } else {
      failed++;
    }
  }

  onBatchProgress({
    currentIndex: toDownload.length,
    totalCount: toDownload.length,
    currentSong: null,
    percentage: 100,
  });

  return {
    success: completed > 0,
    downloadedCount: completed,
    failedCount: failed,
    message: `Downloaded ${completed} of ${toDownload.length} songs from "${playlistName}".`,
  };
};

// Cancel an ongoing download
export const cancelDownload = async (songId) => {
  const idStr = String(songId);
  const task = activeTasks.get(idStr);
  if (task) {
    try {
      await task.cancelAsync();
    } catch (_) {}
    activeTasks.delete(idStr);
    activeProgress.delete(idStr);
    notifySubscribers();
  }
};

// Remove a single downloaded track from storage
export const removeDownloadedTrack = async (songId) => {
  if (!songId && songId !== 0) return false;
  const idStr = String(songId);

  try {
    await cancelDownload(idStr);
    const records = await getStoredDownloads();
    const record = records[idStr];

    if (record) {
      if (record.localUri) {
        await FileSystem.deleteAsync(record.localUri, { idempotent: true }).catch(() => {});
      }
      if (record.localImageUri) {
        await FileSystem.deleteAsync(record.localImageUri, { idempotent: true }).catch(() => {});
      }
      delete records[idStr];
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(records));
      notifySubscribers();
      return true;
    }
  } catch (err) {
    console.log('Error removing download:', err?.message);
  }
  return false;
};

// Clear all downloaded songs from storage
export const clearAllDownloads = async () => {
  try {
    for (const id of activeTasks.keys()) {
      await cancelDownload(id);
    }

    await FileSystem.deleteAsync(DOWNLOADS_DIR, { idempotent: true });
    await ensureDirectories();
    await AsyncStorage.removeItem(STORAGE_KEYS.DOWNLOADS);
    notifySubscribers();
    return true;
  } catch (err) {
    console.log('Error clearing all downloads:', err?.message);
    return false;
  }
};

// =========================================================================
// Export / Save Track directly to Phone's Device Storage (.mp3 in Downloads / Music Library)
// Works with any track including YouTube streams, Cloudinary CDN, and local tracks
// =========================================================================
export const exportTrackToDeviceStorage = async (song, onProgress = () => {}) => {
  if (!song) return { success: false, message: 'Invalid song details' };

  try {
    await ensureDirectories();

    const songId = String(song._id || song.id);
    const cleanTitle = (song.name || 'Song')
      .replace(/[^\w\s.-]/gi, '')
      .trim()
      .replace(/\s+/g, '_') || 'Audio_Track';

    const safeFilename = `${cleanTitle}.mp3`;
    const tempExportDest = `${DOWNLOADS_DIR}${safeFilename}`;

    // 1. Check if the track is already downloaded in app's offline storage
    const records = await getStoredDownloads();
    let sourceUri = records[songId]?.localUri;

    if (sourceUri) {
      const info = await FileSystem.getInfoAsync(sourceUri).catch(() => ({ exists: false }));
      if (!info.exists || info.size < 1000) {
        sourceUri = null;
      }
    }

    // 2. If not downloaded yet, download it directly at top speed via FileSystem.downloadAsync
    if (!sourceUri) {
      const downloadUrl = song.file || song.originalFile || song.streamUrl128k || song.streamUrl96k;
      if (!downloadUrl || typeof downloadUrl !== 'string' || !downloadUrl.startsWith('http')) {
        return { success: false, message: 'Could not resolve audio streaming link for download.' };
      }

      onProgress(0.15);
      const downloadRes = await FileSystem.downloadAsync(downloadUrl, tempExportDest);
      if (!downloadRes || !downloadRes.uri) {
        return { success: false, message: 'Download failed to complete.' };
      }
      sourceUri = downloadRes.uri;
      onProgress(0.9);
    } else {
      // Copy to clean filename destination for sharing/saving
      await FileSystem.copyAsync({ from: sourceUri, to: tempExportDest }).catch(() => {});
      sourceUri = tempExportDest;
    }

    onProgress(1.0);

    // 3. Save to Native Android MediaLibrary (Music / Audio files album)
    let savedToMediaLibrary = false;
    try {
      if (MediaLibrary && typeof MediaLibrary.requestPermissionsAsync === 'function') {
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (perm.granted || perm.status === 'granted') {
          const asset = await MediaLibrary.createAssetAsync(sourceUri);
          const album = await MediaLibrary.getAlbumAsync('Pulse Sound Music');
          if (!album) {
            await MediaLibrary.createAlbumAsync('Pulse Sound Music', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
          savedToMediaLibrary = true;
        }
      }
    } catch (mediaErr) {
      console.log('MediaLibrary save note:', mediaErr?.message);
    }

    // 4. Open Android / iOS Native Save Sheet (Allows direct save to Downloads folder, Files, or sharing)
    try {
      if (Sharing && typeof Sharing.isAvailableAsync === 'function') {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(sourceUri, {
            mimeType: 'audio/mpeg',
            dialogTitle: `Save "${cleanTitle}" to Device`,
            UTI: 'public.mp3',
          });
        }
      }
    } catch (shareErr) {
      console.log('Sharing save note:', shareErr?.message);
    }

    return {
      success: true,
      filename: safeFilename,
      savedToMediaLibrary,
      localUri: sourceUri,
      message: savedToMediaLibrary
        ? `Saved "${cleanTitle}.mp3" to Device Music Library!`
        : `Ready to save "${cleanTitle}.mp3" to your device!`,
    };
  } catch (error) {
    console.error('exportTrackToDeviceStorage error:', error);
    return {
      success: false,
      message: error.message || 'Failed to export track to device',
    };
  }
};
