import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dynamically extract the Metro host IP that Expo used to serve the bundle
const getHostFromExpo = () => {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/:\/\/([^:\/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch (_) {}
  return null;
};

// Build candidate list of backend hosts
export const getCandidateHosts = () => {
  const expoHost = getHostFromExpo();
  const list = [];

  // 1. Primary Cloud Production Server (Render)
  list.push('https://pulsesound.onrender.com');

  // 2. Host where Expo bundle was loaded from (exact developer machine IP)
  if (expoHost) {
    list.push(`http://${expoHost}:4000`);
  }

  // 3. Active Metro LAN IP
  list.push('http://10.99.82.4:4000');
  list.push('http://10.78.124.4:4000');

  // 4. Android Emulator loopback
  if (Platform.OS === 'android') {
    list.push('http://10.0.2.2:4000');
  }

  // 5. Localhost for Web / Simulator
  list.push('http://localhost:4000');

  return Array.from(new Set(list));
};

let cachedWorkingHost = null;

// ─── Render Cold-Start Killer ────────────────────────────────────────────────
// App launch hote hi Render backend ko ping karo — free tier 15min baad sleep
// jaata hai, yeh warmup request usse jagate rehta hai silently.
export const warmUpBackend = () => {
  const RENDER_HOST = 'https://pulsesound.onrender.com';
  // Fire-and-forget — no await, no crash on fail
  fetch(`${RENDER_HOST}/api/song/list`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
};

// Keep Render warm every 9 minutes (free tier sleeps after ~15 min inactivity)
let _keepAliveInterval = null;
export const startKeepAlive = () => {
  if (_keepAliveInterval) return;
  warmUpBackend(); // immediate ping
  _keepAliveInterval = setInterval(() => {
    fetch('https://pulsesound.onrender.com/api/song/list', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    }).catch(() => {});
  }, 9 * 60 * 1000); // every 9 min
};

// Normalize backend album object for Pulse Sound UI
export const normalizeBackendAlbum = (album, index = 0) => {
  const imageSource = typeof album.image === 'string'
    ? { uri: album.image }
    : album.image?.uri
    ? { uri: album.image.uri }
    : album.image;

  const color = album.bgColour || album.bgColor || '#7C3AED';

  return {
    id: album._id || `backend-album-${index}`,
    _id: album._id,
    name: (album.name || 'Untitled Album').trim(),
    desc: album.desc || 'Uploaded Album',
    bgColor: color,
    accentColor: color,
    image: imageSource,
    isBackend: true,
  };
};

// Check whether a song is an obsolete predefined mock song or legacy test track
export const isMockOrLegacySong = (s) => {
  if (!s || typeof s !== 'object') return true;
  const id = String(s._id || s.id || '').trim();
  const name = String(s.name || '').trim().toLowerCase();
  const desc = String(s.desc || '').trim().toLowerCase();
  const file = s.file;

  // Predefined mock song numeric IDs (0, 1, 2) or mock identifiers
  if (id === '0' || id === '1' || id === '2' || s.id === 0 || s.id === 1 || s.id === 2) return true;
  if (id.startsWith('mock-') || id.startsWith('local-')) return true;

  // Mock song titles
  if (
    name === 'song one' ||
    name === 'song two' ||
    name === 'song three' ||
    name === 'song 1' ||
    name === 'song 2' ||
    name === 'song 3' ||
    name.startsWith('song one') ||
    name.startsWith('song two') ||
    name.startsWith('song three') ||
    name.startsWith('song 1') ||
    name.startsWith('song 2') ||
    name.startsWith('song 3')
  ) {
    return true;
  }

  // Predefined bundled asset number (from require('./song1.mp3'))
  if (typeof file === 'number') return true;

  return false;
};

// Canonical song deduplication utility across the entire app
export const deduplicateSongs = (songsList) => {
  if (!Array.isArray(songsList)) return [];
  const seenIds = new Set();
  const seenAudioFiles = new Set();
  const result = [];

  for (const song of songsList) {
    if (!song || isMockOrLegacySong(song)) continue;
    const songId = String(song._id || song.id);
    const audioKey = typeof song.file === 'string'
      ? song.file.trim().toLowerCase()
      : null;

    if (seenIds.has(songId)) continue;
    if (audioKey && seenAudioFiles.has(audioKey)) continue;

    seenIds.add(songId);
    if (audioKey) seenAudioFiles.add(audioKey);
    result.push(song);
  }
  return result;
};

// Normalize backend song object for Pulse Sound UI
export const normalizeBackendSong = (song, index = 0) => {
  const imageSource = typeof song.image === 'string'
    ? { uri: song.image }
    : song.image?.uri
    ? { uri: song.image.uri }
    : song.image;

  return {
    id: song._id || `backend-song-${index}`,
    _id: song._id,
    name: (song.name || 'Untitled Song').trim(),
    desc: song.desc || 'Uploaded Track',
    album: (song.album || 'Single').trim(),
    artist: (song.artist || 'Pulse Artist').trim(),
    duration: song.duration || '3:00',
    durationMillis: song.durationMillis || 180000,
    image: imageSource,
    file: song.streamUrl96k || song.file, // Progressive 96kbps stream for ultra-fast startup
    video: song.video || '',
    videoPublicId: song.videoPublicId || '',
    streamUrl96k: song.streamUrl96k || song.file,
    streamUrl128k: song.streamUrl128k || song.file,
    originalFile: song.originalFile || song.file,
    fileSize: song.fileSize || 0,
    isBackend: true,
  };
};

// Normalize backend public playlist object for Pulse Sound UI
export const normalizeBackendPlaylist = (pl, index = 0) => {
  const imageSource = typeof pl.image === 'string'
    ? { uri: pl.image }
    : pl.image?.uri
    ? { uri: pl.image.uri }
    : pl.image;

  const color = pl.bgColour || pl.bgColor || '#7C3AED';

  const processedSongs = Array.isArray(pl.songs)
    ? pl.songs.filter(Boolean).map((s, idx) => {
        if (!s || typeof s !== 'object') return s;
        return normalizeBackendSong(s, idx);
      })
    : [];

  const songIds = processedSongs.map((s) => (s && typeof s === 'object' ? s._id || s.id : s));

  return {
    id: pl._id || `backend-playlist-${index}`,
    _id: pl._id,
    name: (pl.name || 'Public Playlist').trim(),
    desc: (pl.desc || 'Curated Playlist').trim(),
    theory: (pl.theory || '').trim(),
    image: imageSource,
    bgColour: color,
    bgColor: color,
    gradient: [color, '#0E111E'],
    songs: processedSongs,
    songIds,
    isPublic: true,
    isCurated: true,
    isBackend: true,
    createdAt: pl.createdAt,
  };
};

// Fetch all songs, albums, and public playlists from the live backend with parallel requests
export const fetchLiveBackendData = async () => {
  const hosts = cachedWorkingHost ? [cachedWorkingHost, ...getCandidateHosts()] : getCandidateHosts();
  const uniqueHosts = Array.from(new Set(hosts));

  for (const host of uniqueHosts) {
    try {
      const controller = new AbortController();
      // 6s timeout — Render warms up in ~3-5s once alive; cold-start handled by warmUpBackend()
      const timer = setTimeout(() => controller.abort(), 6000);

      // Fetch albums, songs, and public playlists simultaneously in parallel
      const [albumsRes, songsRes, playlistsRes] = await Promise.all([
        fetch(`${host}/api/album/list`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }).catch(() => null),
        fetch(`${host}/api/song/list`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }).catch(() => null),
        fetch(`${host}/api/playlist/list`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }).catch(() => null),
      ]);
      clearTimeout(timer);

      if (albumsRes && albumsRes.ok) {
        const albumsJson = await albumsRes.json().catch(() => null);
        let songsJson = null;
        let playlistsJson = null;

        if (songsRes && songsRes.ok) {
          songsJson = await songsRes.json().catch(() => null);
        }
        if (playlistsRes && playlistsRes.ok) {
          playlistsJson = await playlistsRes.json().catch(() => null);
        }

        if (albumsJson && albumsJson.success) {
          cachedWorkingHost = host;

          let backendSongs = [];
          if (songsJson && songsJson.success && Array.isArray(songsJson.songs)) {
            backendSongs = songsJson.songs
              .filter((s) => !isMockOrLegacySong(s))
              .map(normalizeBackendSong);
          }

          const backendAlbums = Array.isArray(albumsJson.albums)
            ? albumsJson.albums.map(normalizeBackendAlbum)
            : [];

          let backendPlaylists = [];
          if (playlistsJson && playlistsJson.success && Array.isArray(playlistsJson.playlists)) {
            backendPlaylists = playlistsJson.playlists.map(normalizeBackendPlaylist);
          }

          // Persist catalogue to offline cache so it is immediately available in Airplane Mode
          try {
            AsyncStorage.setItem(
              '@pulse_sound_cached_catalogue',
              JSON.stringify({
                songs: backendSongs,
                albums: backendAlbums,
                playlists: backendPlaylists,
                cachedAt: Date.now(),
              })
            ).catch(() => {});
          } catch (_) {}

          return {
            success: true,
            host,
            songs: backendSongs,
            albums: backendAlbums,
            playlists: backendPlaylists,
          };
        }
      }
    } catch (_) {}
  }

  // Fallback to local offline cached catalogue if internet is unavailable
  try {
    const cachedRaw = await AsyncStorage.getItem('@pulse_sound_cached_catalogue');
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (parsed && (Array.isArray(parsed.songs) || Array.isArray(parsed.albums) || Array.isArray(parsed.playlists))) {
        const cleanOfflineSongs = (parsed.songs || []).filter((s) => !isMockOrLegacySong(s));

        return {
          success: true,
          isOfflineCache: true,
          songs: cleanOfflineSongs,
          albums: parsed.albums || [],
          playlists: parsed.playlists || [],
        };
      }
    }
  } catch (_) {}

  return {
    success: false,
    songs: [],
    albums: [],
    playlists: [],
  };
};

// Generic resilient POST request for authentication and onboarding survey
export const postAuthRequest = async (endpoint, body) => {
  const hosts = cachedWorkingHost ? [cachedWorkingHost, ...getCandidateHosts()] : getCandidateHosts();
  const uniqueHosts = Array.from(new Set(hosts));

  let lastError = 'Unable to connect to server. Please check your internet connection.';

  for (const host of uniqueHosts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${host}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const json = await res.json().catch(() => null);
      if (json) {
        cachedWorkingHost = host;
        return json;
      }
    } catch (err) {
      lastError = err?.message || 'Network request failed';
    }
  }

  return { success: false, message: lastError };
};

// Resilient API request to resolve a YouTube link into a Playable Song
export const resolveYouTubeTrack = async (url) => {
  const hosts = cachedWorkingHost ? [cachedWorkingHost, ...getCandidateHosts()] : getCandidateHosts();
  const uniqueHosts = Array.from(new Set(hosts));

  let lastError = 'Could not connect to stream resolver. Please check your internet connection.';

  for (const host of uniqueHosts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${host}/api/youtube/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const json = await res.json().catch(() => null);
      if (json) {
        if (json.success && json.song) {
          cachedWorkingHost = host;
          return {
            success: true,
            song: normalizeBackendSong(json.song),
            message: json.message,
          };
        }
        return {
          success: false,
          message: json.message || 'Unable to extract audio from this YouTube link.',
        };
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        lastError = err?.message || lastError;
      }
    }
  }

  return { success: false, message: lastError };
};

