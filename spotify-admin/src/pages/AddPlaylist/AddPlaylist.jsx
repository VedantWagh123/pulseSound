import React, { useState, useRef, useEffect } from 'react';
import { assets } from '../../assets/assets';
import { url } from '../../App';
import { toast } from 'react-toastify';
import axios from 'axios';
import VideoCanvasTrimmerModal from '../../components/VideoCanvasTrimmerModal';

const AddPlaylist = () => {
  // Playlist Metadata State
  const [image, setImage] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [theory, setTheory] = useState('');
  const [colour, setColour] = useState('#7C3AED');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Mode: Choose from existing database single songs OR upload new audio files
  const [songSourceMode, setSongSourceMode] = useState('single_song'); // 'single_song' | 'upload'
  const [availableSingleSongs, setAvailableSingleSongs] = useState([]);
  const [loadingSingleSongs, setLoadingSingleSongs] = useState(false);
  const [singleSongSearch, setSingleSongSearch] = useState('');
  const [selectedSingleSong, setSelectedSingleSong] = useState(null);

  // Playlist-Exclusive Song Creation State
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('Pulse Artist');
  const [songDisplayMode, setSongDisplayMode] = useState('regular'); // 'regular' | 'fullscreen'
  const [songAudioFiles, setSongAudioFiles] = useState([]); // File[]
  const [songImageFile, setSongImageFile] = useState(null); // File | null
  const [songVideoFile, setSongVideoFile] = useState(null); // File | null (Video Canvas 10-15s)
  const [formVideoStartTime, setFormVideoStartTime] = useState(0);
  const [formVideoEndTime, setFormVideoEndTime] = useState(0);
  const [formVideoSongDelay, setFormVideoSongDelay] = useState(5);
  const [playlistSongs, setPlaylistSongs] = useState([]); // List of songs queued for this playlist

  // Trimmer Modal state
  const [trimmerOpen, setTrimmerOpen] = useState(false);
  const [activeTrimmerSong, setActiveTrimmerSong] = useState(null); // 'form' | song item

  const audioInputRef = useRef(null);
  const songImageInputRef = useRef(null);
  const songVideoInputRef = useRef(null);

  // Fetch standalone single songs from database
  const fetchSingleSongs = async () => {
    try {
      setLoadingSingleSongs(true);
      const res = await axios.get(`${url}/api/song/list`);
      if (res.data?.success && Array.isArray(res.data.songs)) {
        setAvailableSingleSongs(res.data.songs);
      }
    } catch (err) {
      console.error('Error fetching single songs:', err);
    } finally {
      setLoadingSingleSongs(false);
    }
  };

  useEffect(() => {
    fetchSingleSongs();
  }, []);

  // When Admin selects a Single Song: Auto-capture title, artist, artwork image, and display mode!
  const handleSelectSingleSong = (song) => {
    if (!song) return;
    setSelectedSingleSong(song);
    setSongTitle(song.name || '');
    setSongArtist(song.artist || 'Pulse Artist');
    setSongDisplayMode(song.imageDisplayMode || (song.fullscreenImage ? 'fullscreen' : 'regular'));
    toast.info(`✨ Auto-captured "${song.name}" & artwork! Click "+ Add to Playlist Table" to queue.`);
  };

  // Add the chosen Single Song into the Playlist Table
  const handleAddSelectedSingleSongToTable = (songToAdd = selectedSingleSong) => {
    if (!songToAdd) {
      toast.error('Please select a single song from the list first');
      return;
    }

    if (playlistSongs.some((s) => s.existingSongId === songToAdd._id)) {
      toast.warn(`"${songToAdd.name}" is already added to this playlist table!`);
      return;
    }

    const title = songTitle.trim() || songToAdd.name;
    const artist = songArtist.trim() || songToAdd.artist || 'Pulse Artist';

    const newEntry = {
      id: `existing_${songToAdd._id}_${Date.now()}`,
      isExisting: true,
      existingSongId: songToAdd._id,
      name: title,
      artist,
      imagePreview: songToAdd.image || null,
      audioName: songToAdd.originalFile ? cleanSongTitle(songToAdd.name) : 'Database Single Song (Pre-hosted)',
      audioSize: songToAdd.fileSize || 0,
      duration: songToAdd.duration || '3:00',
      videoUrl: songToAdd.video || null,
      videoName: songToAdd.video ? 'Attached Video Canvas' : null,
      videoFile: null,
      videoStartTime: songToAdd.videoStartTime || 0,
      videoEndTime: songToAdd.videoEndTime || 0,
      videoSongDelay: songToAdd.videoSongDelay || 5,
      fullscreenImage: songDisplayMode === 'fullscreen',
      imageDisplayMode: songDisplayMode,
    };

    setPlaylistSongs((prev) => [...prev, newEntry]);
    toast.success(`🎵 Added "${title}" from Single Songs to playlist table!`);

    // Reset selection so user can choose another song easily
    setSelectedSingleSong(null);
    setSongTitle('');
    setSongArtist('Pulse Artist');
  };

  // Helper to format bytes to MB
  const formatMB = (bytes) => {
    if (!bytes) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Clean filename to song title (e.g., "01 - Midnight_Vibes.mp3" -> "Midnight Vibes")
  const cleanSongTitle = (filename) => {
    if (!filename) return 'Untitled Track';
    const withoutExt = filename.replace(/\.[^/.]+$/, '');
    return withoutExt
      .replace(/^[\d\s-_.]+/, '') // remove leading track numbers e.g. "01 - "
      .replace(/[_-]+/g, ' ')
      .trim();
  };

  // Handle Audio File Selection (Single or Bulk)
  const handleAudioFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSongAudioFiles(files);
    if (files.length === 1 && !songTitle) {
      setSongTitle(cleanSongTitle(files[0].name));
    }
  };

  // Add Song(s) to the Playlist Table
  const handleAddSongToTable = () => {
    if (songAudioFiles.length === 0) {
      toast.error('Please choose at least one audio file (.mp3 / .wav / .m4a)');
      return;
    }

    // Case 1: Single Audio File added
    if (songAudioFiles.length === 1) {
      const file = songAudioFiles[0];
      const title = songTitle.trim() || cleanSongTitle(file.name);
      const artist = songArtist.trim() || 'Pulse Artist';

      const newSongEntry = {
        id: `song_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: title,
        artist,
        audioFile: file,
        audioName: file.name,
        audioSize: file.size,
        imageFile: songImageFile || null,
        imagePreview: songImageFile ? URL.createObjectURL(songImageFile) : null,
        videoFile: songVideoFile || null,
        videoName: songVideoFile ? songVideoFile.name : null,
        videoSize: songVideoFile ? songVideoFile.size : null,
        videoStartTime: formVideoStartTime,
        videoEndTime: formVideoEndTime,
        videoSongDelay: formVideoSongDelay,
        fullscreenImage: songDisplayMode === 'fullscreen',
        imageDisplayMode: songDisplayMode,
      };

      setPlaylistSongs((prev) => [...prev, newSongEntry]);
      toast.success(`Added "${title}" ${songVideoFile ? '🎬 with video' : ''} to playlist table!`);
    } else {
      // Case 2: Bulk Audio Files added
      const newEntries = songAudioFiles.map((file, idx) => {
        const title = cleanSongTitle(file.name);
        return {
          id: `song_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
          name: title,
          artist: songArtist.trim() || 'Pulse Artist',
          audioFile: file,
          audioName: file.name,
          audioSize: file.size,
          imageFile: songImageFile || null,
          imagePreview: songImageFile ? URL.createObjectURL(songImageFile) : null,
          videoFile: idx === 0 ? (songVideoFile || null) : null, // Attach to first track if single video selected
          videoName: idx === 0 && songVideoFile ? songVideoFile.name : null,
          videoSize: idx === 0 && songVideoFile ? songVideoFile.size : null,
          videoStartTime: idx === 0 ? formVideoStartTime : 0,
          videoEndTime: idx === 0 ? formVideoEndTime : 0,
          videoSongDelay: idx === 0 ? formVideoSongDelay : 5,
          fullscreenImage: songDisplayMode === 'fullscreen',
          imageDisplayMode: songDisplayMode,
        };
      });

      setPlaylistSongs((prev) => [...prev, ...newEntries]);
      toast.success(`Bulk added ${newEntries.length} songs to playlist table! ⚡`);
    }

    // Reset song input fields for next entry
    setSongTitle('');
    setSongAudioFiles([]);
    setSongImageFile(null);
    setSongVideoFile(null);
    setFormVideoStartTime(0);
    setFormVideoEndTime(0);
    setFormVideoSongDelay(5);
    setSongDisplayMode('regular');
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (songImageInputRef.current) songImageInputRef.current.value = '';
    if (songVideoInputRef.current) songVideoInputRef.current.value = '';
  };

  // Attach video directly to a specific song in the table
  const handleAttachVideoToSong = (songId, file) => {
    if (!file) return;
    setPlaylistSongs((prev) =>
      prev.map((s) =>
        s.id === songId
          ? {
              ...s,
              videoFile: file,
              videoName: file.name,
              videoSize: file.size,
              videoStartTime: 0,
              videoEndTime: 0,
              videoSongDelay: 5,
            }
          : s
      )
    );
    toast.success(`Attached video canvas "${file.name}" to song! 🎬`);
  };

  // Remove video canvas from a specific song in the table
  const handleRemoveVideoFromSong = (songId) => {
    setPlaylistSongs((prev) =>
      prev.map((s) =>
        s.id === songId
          ? {
              ...s,
              videoFile: null,
              videoName: null,
              videoSize: null,
            }
          : s
      )
    );
    toast.info('Video canvas removed from song');
  };

  // Remove song from the table
  const handleRemoveSongFromTable = (id) => {
    setPlaylistSongs((prev) => prev.filter((s) => s.id !== id));
  };

  // Inline Song Name change in table
  const handleUpdateSongTitle = (id, newName) => {
    setPlaylistSongs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
    );
  };

  // Toggle Song Player Display Mode between 'regular' and 'fullscreen'
  const handleToggleSongDisplayMode = (id) => {
    setPlaylistSongs((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextMode = s.imageDisplayMode === 'fullscreen' ? 'regular' : 'fullscreen';
        return {
          ...s,
          imageDisplayMode: nextMode,
          fullscreenImage: nextMode === 'fullscreen',
        };
      })
    );
  };

  // Submit Playlist with all its songs (both single tracks & newly uploaded songs)
  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a playlist title');
      return;
    }

    if (!desc.trim()) {
      toast.error('Please enter a playlist description');
      return;
    }

    if (!image) {
      toast.error('Please upload a playlist thumbnail image');
      return;
    }

    if (playlistSongs.length === 0) {
      toast.error('Please add at least 1 song (select a single song or upload new audio) before publishing.');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    const existingSongIds = playlistSongs
      .filter((s) => s.isExisting && s.existingSongId)
      .map((s) => s.existingSongId);

    const newSongsToUpload = playlistSongs.filter((s) => !s.isExisting);
    const hasAnyVideo = newSongsToUpload.some((s) => s.videoFile);

    if (newSongsToUpload.length === 0) {
      setLoadingText(`Instantly linking ${existingSongIds.length} single track(s) to playlist... ⚡`);
    } else {
      setLoadingText(
        hasAnyVideo
          ? `Fast Ingesting: Playlist cover, ${newSongsToUpload.length} new song(s) & video canvas loops...`
          : `Fast Ingesting: Playlist cover & ${newSongsToUpload.length} new song(s)...`
      );
    }

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('desc', desc.trim());
      formData.append('theory', theory.trim());
      formData.append('bgColour', colour);
      formData.append('bgColor', colour);
      formData.append('image', image);

      // 1. Send Existing Single Songs if any are queued
      if (existingSongIds.length > 0) {
        formData.append('songs', JSON.stringify(existingSongIds));
      }

      // 2. Prepare metadata and files for any newly uploaded songs
      if (newSongsToUpload.length > 0) {
        const songsMetadata = newSongsToUpload.map((s, idx) => ({
          id: idx,
          name: s.name.trim() || `Track ${idx + 1}`,
          artist: s.artist.trim() || 'Pulse Artist',
          desc: `${name.trim()} Exclusive Track`,
          fullscreenImage: s.fullscreenImage === true || s.imageDisplayMode === 'fullscreen',
          imageDisplayMode: s.imageDisplayMode || (s.fullscreenImage ? 'fullscreen' : 'regular'),
          hasVideo: Boolean(s.videoFile),
          videoStartTime: Number(s.videoStartTime) || 0,
          videoEndTime: Number(s.videoEndTime) || 0,
          videoSongDelay: s.videoSongDelay !== undefined ? Number(s.videoSongDelay) : 5,
        }));
        formData.append('songsMetadata', JSON.stringify(songsMetadata));

        // Append audio files, cover images, and video canvases for newly uploaded songs
        newSongsToUpload.forEach((s, idx) => {
          if (s.audioFile) {
            formData.append(`audio_${idx}`, s.audioFile);
          }
          if (s.imageFile) {
            formData.append(`songImage_${idx}`, s.imageFile);
          }
          if (s.videoFile) {
            formData.append(`video_${idx}`, s.videoFile);
          }
        });
      }

      const response = await axios.post(`${url}/api/playlist/add`, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      if (response.data && response.data.success) {
        toast.success(response.data.message || `🎉 Playlist "${name}" & ${playlistSongs.length} songs published successfully!`);
        setName('');
        setDesc('');
        setTheory('');
        setImage(false);
        setPlaylistSongs([]);
        setSelectedSingleSong(null);
        setUploadProgress(0);
      } else {
        toast.error(response.data?.message || 'Something went wrong while publishing playlist');
      }
    } catch (error) {
      console.error('Error publishing playlist:', error);
      toast.error(error.response?.data?.message || error.message || 'Error occurred while creating playlist');
    } finally {
      setLoading(false);
      setLoadingText('');
      setUploadProgress(0);
    }
  };

  return loading ? (
    <div className='grid place-items-center min-h-[75vh]'>
      <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl border border-purple-100 max-w-md w-full text-center">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
          <span className="absolute text-sm font-bold text-purple-700">{uploadProgress}%</span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner mt-2">
          <div
            className="bg-gradient-to-r from-purple-500 via-indigo-500 to-green-500 h-3 rounded-full transition-all duration-200 ease-out"
            style={{ width: `${Math.max(4, uploadProgress)}%` }}
          ></div>
        </div>

        <div>
          <h4 className="text-base font-bold text-gray-800">
            {uploadProgress < 100 ? `Uploading Playlist Files (${uploadProgress}%)` : '⚡ Parallel Cloud Ingestion & Edge Optimization...'}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {uploadProgress < 100
              ? `Uploading ${playlistSongs.length} audio tracks and artwork simultaneously...`
              : 'Encoding tracks in parallel for instant 1-click mobile streaming.'}
          </p>
        </div>
      </div>
    </div>
  ) : (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-7 text-gray-700 pb-20 max-w-4xl'>
      {/* Page Title */}
      <div className='border-b border-gray-300 pb-2 w-full'>
        <h2 className='text-2xl font-bold text-gray-900'>Create & Publish Playlist</h2>
        <p className='text-sm text-gray-500 mt-1'>
          Upload multiple songs directly into this playlist. All uploaded songs will remain exclusive to this playlist and won't clutter the global catalogue.
        </p>
      </div>

      {/* Playlist Thumbnail Upload */}
      <div className='flex flex-col gap-3'>
        <p className='font-semibold text-gray-800'>Playlist Thumbnail / Cover Image *</p>
        <input
          onChange={(e) => setImage(e.target.files[0])}
          type='file'
          id='playlist-image'
          accept='image/*'
          hidden
        />
        <label htmlFor='playlist-image' className='cursor-pointer group flex items-center gap-4'>
          <div className='w-28 h-28 border-2 border-dashed border-gray-400 rounded-xl overflow-hidden flex items-center justify-center bg-white group-hover:border-green-600 transition shadow-sm'>
            <img
              className={image ? 'w-full h-full object-cover' : 'w-14'}
              src={image ? URL.createObjectURL(image) : assets.upload_area}
              alt='Upload cover'
            />
          </div>
          <div className='text-xs text-gray-500'>
            <p className='font-medium text-gray-700'>Click to choose playlist cover artwork</p>
            <p>PNG, JPG or WEBP recommended (1:1 square ratio)</p>
          </div>
        </label>
      </div>

      {/* Playlist Name */}
      <div className='flex flex-col gap-2 w-full max-w-xl'>
        <label className='font-semibold text-gray-800'>Playlist Title *</label>
        <input
          className='bg-white outline-green-600 border border-gray-300 rounded-lg p-3 text-sm focus:border-green-600 shadow-sm'
          onChange={(e) => setName(e.target.value)}
          value={name}
          type='text'
          placeholder='e.g. Cyberpunk Pulse 2026, Midnight Lo-Fi Beats'
          required
        />
      </div>

      {/* Short Description */}
      <div className='flex flex-col gap-2 w-full max-w-xl'>
        <label className='font-semibold text-gray-800'>Short Description *</label>
        <input
          className='bg-white outline-green-600 border border-gray-300 rounded-lg p-3 text-sm focus:border-green-600 shadow-sm'
          onChange={(e) => setDesc(e.target.value)}
          value={desc}
          type='text'
          placeholder='e.g. Hand-picked bass-heavy synthwave tracks for coding & late night focus.'
          required
        />
      </div>

      {/* Playlist Theory / Curator Notes */}
      <div className='flex flex-col gap-2 w-full max-w-xl'>
        <div className='flex justify-between items-center'>
          <label className='font-semibold text-gray-800'>Playlist Theory & Concept (Curator Notes)</label>
          <span className='text-xs text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded'>Theory Section</span>
        </div>
        <textarea
          rows={3}
          className='bg-white outline-green-600 border border-gray-300 rounded-lg p-3 text-sm focus:border-green-600 shadow-sm'
          onChange={(e) => setTheory(e.target.value)}
          value={theory}
          placeholder='Explain musical theory, BPM flow, sonic vibe, or narrative behind this playlist...'
        />
        <p className='text-xs text-gray-400'>This theory note is presented prominently to listeners inside the mobile app.</p>
      </div>

      {/* Background / Theme Color */}
      <div className='flex flex-col gap-2'>
        <label className='font-semibold text-gray-800'>Theme & Accent Color</label>
        <div className='flex items-center gap-4'>
          <input
            onChange={(e) => setColour(e.target.value)}
            value={colour}
            type='color'
            className='w-12 h-12 rounded cursor-pointer border border-gray-300'
          />
          <div className='flex items-center gap-2'>
            {['#7C3AED', '#10B981', '#EC4899', '#3B82F6', '#F59E0B', '#EF4444'].map((c) => (
              <button
                type='button'
                key={c}
                onClick={() => setColour(c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full border-2 transition ${colour === c ? 'border-black scale-110' : 'border-white'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* DIRECT PLAYLIST SONG UPLOAD & MULTI-SONG TABLE SECTION */}
      <div className='flex flex-col gap-4 w-full bg-white p-6 rounded-2xl border border-gray-200 shadow-sm'>
        <div className='flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-gray-200 gap-2'>
          <div>
            <h3 className='text-lg font-bold text-gray-900 flex items-center gap-2'>
              <span>🎵</span> Choose or Upload Songs for this Playlist
            </h3>
            <p className='text-xs text-gray-500 mt-0.5'>
              Pick from existing Single Songs (auto-captures song title & artwork) or upload brand-new exclusive tracks.
            </p>
          </div>
          <span className='self-start md:self-auto text-xs px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-semibold shadow-2xs'>
            {playlistSongs.length} {playlistSongs.length === 1 ? 'Song Queued' : 'Songs Queued'}
          </span>
        </div>

        {/* Source Mode Switcher Pills */}
        <div className='flex items-center gap-2 p-1.5 bg-gray-100 rounded-xl w-fit flex-wrap border border-gray-200 shadow-2xs'>
          <button
            type='button'
            onClick={() => setSongSourceMode('single_song')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              songSourceMode === 'single_song'
                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <span>✨</span>
            <span>Choose from Single Songs (Auto-Capture)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              songSourceMode === 'single_song' ? 'bg-purple-800 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {availableSingleSongs.length}
            </span>
          </button>

          <button
            type='button'
            onClick={() => setSongSourceMode('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              songSourceMode === 'upload'
                ? 'bg-green-600 text-white shadow-sm ring-1 ring-green-400'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <span>📁</span>
            <span>Upload New Audio File(s)</span>
          </button>
        </div>

        {/* MODE 1: CHOOSE FROM EXISTING SINGLE SONGS */}
        {songSourceMode === 'single_song' ? (
          <div className='bg-gradient-to-br from-purple-50/70 via-gray-50 to-indigo-50/40 p-5 rounded-2xl border border-purple-200 flex flex-col gap-4 shadow-xs'>
            {/* Search Bar & Refresh Row */}
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
              <div className='relative flex-1 max-w-md'>
                <input
                  type='text'
                  value={singleSongSearch}
                  onChange={(e) => setSingleSongSearch(e.target.value)}
                  placeholder='🔍 Search single songs by title or artist...'
                  className='w-full bg-white border border-gray-300 rounded-xl py-2 px-3 pl-9 text-xs outline-purple-600 shadow-2xs'
                />
                <span className='absolute left-3 top-2.5 text-xs text-gray-400'>🎶</span>
                {singleSongSearch && (
                  <button
                    type='button'
                    onClick={() => setSingleSongSearch('')}
                    className='absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600'
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={fetchSingleSongs}
                  disabled={loadingSingleSongs}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-300 shadow-2xs transition cursor-pointer'
                  title='Reload songs from database'
                >
                  <span className={loadingSingleSongs ? 'animate-spin inline-block' : ''}>🔄</span>
                  <span>Refresh List</span>
                </button>
                <span className='text-xs text-purple-700 font-semibold bg-purple-100/70 px-2.5 py-1 rounded-lg'>
                  Showing {availableSingleSongs.filter((s) => {
                    if (!singleSongSearch.trim()) return true;
                    const q = singleSongSearch.toLowerCase();
                    return (
                      (s.name && s.name.toLowerCase().includes(q)) ||
                      (s.artist && s.artist.toLowerCase().includes(q))
                    );
                  }).length} tracks
                </span>
              </div>
            </div>

            {/* List / Cards of Single Songs */}
            <div className='max-h-64 overflow-y-auto pr-1 flex flex-col gap-2'>
              {loadingSingleSongs ? (
                <div className='p-6 text-center text-xs text-gray-500'>
                  <span className='animate-spin inline-block mr-2'>⏳</span> Loading single songs from database...
                </div>
              ) : availableSingleSongs.length === 0 ? (
                <div className='p-6 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200'>
                  No single songs found in database. You can upload new songs using the "Upload New Audio File(s)" tab.
                </div>
              ) : (
                availableSingleSongs
                  .filter((s) => {
                    if (!singleSongSearch.trim()) return true;
                    const q = singleSongSearch.toLowerCase();
                    return (
                      (s.name && s.name.toLowerCase().includes(q)) ||
                      (s.artist && s.artist.toLowerCase().includes(q))
                    );
                  })
                  .map((song) => {
                    const isSelected = selectedSingleSong?._id === song._id;
                    const isAlreadyQueued = playlistSongs.some((ps) => ps.existingSongId === song._id);

                    return (
                      <div
                        key={song._id}
                        onClick={() => handleSelectSingleSong(song)}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-purple-100/90 border-purple-500 ring-2 ring-purple-300 shadow-sm'
                            : isAlreadyQueued
                            ? 'bg-green-50/60 border-green-200 opacity-90'
                            : 'bg-white hover:bg-purple-50/40 border-gray-200 shadow-2xs'
                        }`}
                      >
                        <div className='flex items-center gap-3 min-w-0 flex-1'>
                          <img
                            src={song.image || assets.song_icon}
                            alt={song.name}
                            className='w-11 h-11 rounded-lg object-cover border border-gray-200 shadow-2xs shrink-0'
                          />
                          <div className='min-w-0 flex-1'>
                            <p className='text-xs font-bold text-gray-900 truncate' title={song.name}>
                              {song.name}
                            </p>
                            <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
                              <span className='text-[11px] text-gray-600 truncate'>{song.artist || 'Pulse Artist'}</span>
                              {song.duration && (
                                <span className='text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded font-medium'>
                                  ⏱️ {song.duration}
                                </span>
                              )}
                              {song.video && (
                                <span className='text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold'>
                                  🎬 Canvas
                                </span>
                              )}
                              {song.imageDisplayMode === 'fullscreen' && (
                                <span className='text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded font-bold'>
                                  🌟 Fullscreen BG
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className='flex items-center gap-2 shrink-0'>
                          {isAlreadyQueued ? (
                            <span className='px-2.5 py-1 text-[11px] font-bold text-green-700 bg-green-100 border border-green-300 rounded-lg'>
                              ✓ Queued
                            </span>
                          ) : (
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddSelectedSingleSongToTable(song);
                              }}
                              className='px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition cursor-pointer'
                            >
                              + Add to Playlist
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Auto-Captured Metadata Preview Box (Appears when Admin picks a song) */}
            {selectedSingleSong && (
              <div className='bg-white p-4 rounded-xl border border-purple-300 shadow-sm flex flex-col gap-3 mt-1 animate-fadeIn'>
                <div className='flex items-center justify-between pb-2 border-b border-gray-100'>
                  <span className='text-xs font-bold text-purple-700 flex items-center gap-1.5'>
                    <span>✨</span> Auto-Captured Single Song Details
                  </span>
                  <span className='text-[10px] text-gray-500 bg-purple-50 px-2 py-0.5 rounded font-semibold'>
                    Zero upload time - Pre-hosted in database
                  </span>
                </div>

                <div className='flex flex-col sm:flex-row items-center gap-4'>
                  <div className='relative shrink-0'>
                    <img
                      src={selectedSingleSong.image || assets.song_icon}
                      alt={selectedSingleSong.name}
                      className='w-16 h-16 rounded-xl object-cover border-2 border-purple-300 shadow-sm'
                    />
                    <span className='absolute -bottom-1 -right-1 text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-bold shadow'>
                      Auto 🖼️
                    </span>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full'>
                    <div>
                      <label className='text-[11px] font-bold text-gray-700 block mb-0.5'>
                        Song Name (Auto-Captured)
                      </label>
                      <input
                        type='text'
                        value={songTitle}
                        onChange={(e) => setSongTitle(e.target.value)}
                        className='w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs font-bold text-gray-900 outline-purple-600'
                      />
                    </div>

                    <div>
                      <label className='text-[11px] font-bold text-gray-700 block mb-0.5'>
                        Artist (Auto-Captured)
                      </label>
                      <input
                        type='text'
                        value={songArtist}
                        onChange={(e) => setSongArtist(e.target.value)}
                        className='w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs text-gray-700 outline-purple-600'
                      />
                    </div>
                  </div>
                </div>

                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-bold text-gray-700'>Player Artwork Display:</span>
                    <button
                      type='button'
                      onClick={() => setSongDisplayMode('regular')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                        songDisplayMode === 'regular'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-white border border-gray-300 text-gray-700'
                      }`}
                    >
                      Regular
                    </button>
                    <button
                      type='button'
                      onClick={() => setSongDisplayMode('fullscreen')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                        songDisplayMode === 'fullscreen'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-white border border-gray-300 text-gray-700'
                      }`}
                    >
                      🌟 Fullscreen BG
                    </button>
                  </div>

                  <button
                    type='button'
                    onClick={() => handleAddSelectedSingleSongToTable(selectedSingleSong)}
                    className='flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer'
                  >
                    <span>+</span>
                    <span>Add Captured Song to Playlist Table</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MODE 2: UPLOAD NEW AUDIO FILES */
          <div className='bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-4'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-start'>
              {/* Audio File Input (Supports single or multiple bulk selection!) */}
              <div>
                <label className='text-xs font-bold text-gray-700 block mb-1.5'>
                  Audio File(s) * <span className='text-gray-400 font-normal'>(MP3 / WAV)</span>
                </label>
                <input
                  ref={audioInputRef}
                  type='file'
                  accept='audio/*'
                  multiple
                  onChange={handleAudioFileChange}
                  className='block w-full text-xs text-gray-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer border border-gray-300 rounded-lg bg-white p-1'
                />
                {songAudioFiles.length > 0 && (
                  <p className='text-[11px] text-green-700 font-semibold mt-1'>
                    ✓ Selected {songAudioFiles.length} audio {songAudioFiles.length === 1 ? 'file' : 'files'} ({formatMB(songAudioFiles.reduce((acc, f) => acc + f.size, 0))})
                  </p>
                )}
              </div>

              {/* Song Cover Artwork (Optional, falls back to playlist cover) */}
              <div>
                <label className='text-xs font-bold text-gray-700 block mb-1.5'>
                  Song Artwork <span className='text-gray-400 font-normal'>(Optional)</span>
                </label>
                <div className='flex items-center gap-2'>
                  <input
                    ref={songImageInputRef}
                    type='file'
                    accept='image/*'
                    onChange={(e) => setSongImageFile(e.target.files?.[0] || null)}
                    className='block w-full text-xs text-gray-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-800 cursor-pointer border border-gray-300 rounded-lg bg-white p-1'
                  />
                  {songImageFile && (
                    <img
                      src={URL.createObjectURL(songImageFile)}
                      alt='Preview'
                      className='w-8 h-8 rounded object-cover border border-gray-300 shadow-sm flex-shrink-0'
                    />
                  )}
                </div>
              </div>

              {/* Song Video Canvas (Optional 10-15s background video) */}
              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <label className='text-xs font-bold text-gray-700 block'>
                    Video Canvas <span className='text-emerald-700 font-normal'>(10-15s optional, max 98MB)</span>
                  </label>
                  {songVideoFile && (
                    <button
                      type='button'
                      onClick={() => {
                        setSongVideoFile(null);
                        if (songVideoInputRef.current) songVideoInputRef.current.value = '';
                      }}
                      className='text-[10px] text-red-500 hover:text-red-700 font-bold'
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  <input
                    ref={songVideoInputRef}
                    type='file'
                    accept='video/*'
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 98 * 1024 * 1024) {
                        toast.error(`Video file is too large (${(f.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is 98MB.`);
                        e.target.value = '';
                        setSongVideoFile(null);
                        return;
                      }
                      setSongVideoFile(f || null);
                    }}
                    className='block w-full text-xs text-gray-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer border border-gray-300 rounded-lg bg-white p-1'
                  />
                </div>
                {songVideoFile ? (
                  <div className='flex flex-col gap-1 mt-1'>
                    <p className='text-[11px] text-emerald-700 font-semibold truncate' title={songVideoFile.name}>
                      🎬 {songVideoFile.name} ({formatMB(songVideoFile.size)})
                    </p>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <button
                        type='button'
                        onClick={() => {
                          setActiveTrimmerSong('form');
                          setTrimmerOpen(true);
                        }}
                        className='px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer'
                      >
                        👁️ Preview & Crop
                      </button>
                      <span className='text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded'>
                        {formVideoStartTime}s → {formVideoEndTime > 0 ? `${formVideoEndTime}s` : 'Full'} | {formVideoSongDelay}s delay
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className='text-[10px] text-gray-400 mt-1'>
                    Loops automatically in background when track plays.
                  </p>
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Song Title */}
              <div>
                <label className='text-xs font-bold text-gray-700 block mb-1'>Song Title / Name</label>
                <input
                  type='text'
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder={songAudioFiles.length > 1 ? 'Auto-extracted from filenames for bulk files' : 'e.g. Neon Horizon, Chill Melody'}
                  disabled={songAudioFiles.length > 1}
                  className={`w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs outline-green-600 ${
                    songAudioFiles.length > 1 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {/* Song Artist */}
              <div>
                <label className='text-xs font-bold text-gray-700 block mb-1'>Artist Name</label>
                <input
                  type='text'
                  value={songArtist}
                  onChange={(e) => setSongArtist(e.target.value)}
                  placeholder='e.g. Pulse Artist, Dual Dimension'
                  className='w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs outline-green-600'
                />
              </div>
            </div>

            {/* Display Mode Selection & Green Add Button */}
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-200'>
              <div className='flex items-center gap-2'>
                <span className='text-xs font-bold text-gray-700'>Player Artwork Display:</span>
                <button
                  type='button'
                  onClick={() => setSongDisplayMode('regular')}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                    songDisplayMode === 'regular'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Regular
                </button>
                <button
                  type='button'
                  onClick={() => setSongDisplayMode('fullscreen')}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                    songDisplayMode === 'fullscreen'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🌟 Fullscreen BG
                </button>
              </div>

              <button
                type='button'
                onClick={handleAddSongToTable}
                className='flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer self-end sm:self-auto'
              >
                <span>+</span>
                <span>
                  {songAudioFiles.length > 1 ? `Add All ${songAudioFiles.length} Songs to Table` : 'Add Song to Playlist Table'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* The Songs Table */}
        <div className='mt-2'>
          <h4 className='text-xs font-bold text-gray-700 uppercase tracking-wider mb-2'>
            Songs Queued in this Playlist ({playlistSongs.length})
          </h4>

          {playlistSongs.length === 0 ? (
            <div className='border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/50'>
              <p className='text-sm text-gray-500 font-medium'>No songs added to this playlist table yet.</p>
              <p className='text-xs text-gray-400 mt-1'>
                Choose single song(s) above (auto-captures artwork) or upload audio file(s), then click add to table.
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm'>
              <table className='w-full text-left text-xs text-gray-700'>
                <thead className='bg-gray-100 text-gray-700 uppercase font-bold text-[11px] border-b border-gray-200'>
                  <tr>
                    <th className='py-3 px-3 w-10 text-center'>#</th>
                    <th className='py-3 px-3 w-16'>Artwork</th>
                    <th className='py-3 px-4'>Song Title</th>
                    <th className='py-3 px-4'>Artist</th>
                    <th className='py-3 px-4'>Audio Source</th>
                    <th className='py-3 px-3 text-center w-36'>Video Canvas</th>
                    <th className='py-3 px-3 text-center w-28'>Player Mode</th>
                    <th className='py-3 px-3 text-center w-16'>Remove</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {playlistSongs.map((song, index) => (
                    <tr key={song.id} className='hover:bg-gray-50/80 transition'>
                      <td className='py-3 px-3 text-center font-bold text-gray-400'>{index + 1}</td>
                      <td className='py-3 px-3'>
                        <div className='flex flex-col items-center gap-1'>
                          <img
                            src={
                              song.imagePreview ||
                              (song.imageFile ? URL.createObjectURL(song.imageFile) : null) ||
                              (image ? URL.createObjectURL(image) : assets.song_icon)
                            }
                            alt={song.name}
                            className='w-10 h-10 rounded-md object-cover border border-gray-200 shadow-sm'
                          />
                          {song.isExisting ? (
                            <span className='text-[8px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.2 rounded'>
                              🎵 Single
                            </span>
                          ) : song.imageFile ? (
                            <span className='text-[8px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.2 rounded'>
                              🖼️ Custom
                            </span>
                          ) : (
                            <span className='text-[8px] text-gray-400 bg-gray-50 border border-gray-200 px-1 py-0.2 rounded'>
                              Cover
                            </span>
                          )}
                        </div>
                      </td>
                      <td className='py-3 px-4'>
                        <input
                          type='text'
                          value={song.name}
                          onChange={(e) => handleUpdateSongTitle(song.id, e.target.value)}
                          className='font-bold text-gray-900 text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-green-600 focus:bg-white p-1 rounded outline-none w-full'
                        />
                      </td>
                      <td className='py-3 px-4 text-gray-600 font-medium'>{song.artist}</td>
                      <td className='py-3 px-4'>
                        {song.isExisting ? (
                          <div className='flex flex-col gap-0.5'>
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 w-fit shadow-2xs'>
                              <span>🎵</span> Single Song (Database)
                            </span>
                            {song.duration && (
                              <span className='text-[10px] text-gray-400 font-medium'>
                                Duration: {song.duration}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className='font-mono text-[11px] text-gray-800 truncate max-w-xs' title={song.audioName}>
                              {song.audioName}
                            </p>
                            <span className='text-[10px] text-gray-400 font-semibold'>{formatMB(song.audioSize)}</span>
                          </>
                        )}
                      </td>
                      <td className='py-3 px-3 text-center'>
                        {song.isExisting ? (
                          song.videoUrl ? (
                            <span className='inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold'>
                              🎬 Attached Canvas
                            </span>
                          ) : (
                            <span className='text-[10px] text-gray-400 font-medium'>No Video Canvas</span>
                          )
                        ) : song.videoFile ? (
                          <div className='inline-flex flex-col items-center gap-1 bg-emerald-50 border border-emerald-300 px-2 py-1.5 rounded-lg text-emerald-800 max-w-[145px] shadow-xs'>
                            <div className='flex items-center gap-1 text-[11px] font-semibold w-full justify-center'>
                              <span>🎬</span>
                              <span className='truncate' title={song.videoName || 'Video Canvas'}>
                                {song.videoName || 'Video Attached'}
                              </span>
                            </div>
                            <div className='text-[9px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded w-full text-center truncate'>
                              Crop: {song.videoStartTime || 0}s-{song.videoEndTime > 0 ? `${song.videoEndTime}s` : 'end'} | Delay: {song.videoSongDelay ?? 5}s
                            </div>
                            <div className='flex items-center gap-2 text-[9px] text-gray-500'>
                              <button
                                type='button'
                                onClick={() => {
                                  setActiveTrimmerSong(song);
                                  setTrimmerOpen(true);
                                }}
                                className='text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer'
                                title='Preview video, crop start/end, and adjust song delay'
                              >
                                👁️ Preview/Crop
                              </button>
                              <span>•</span>
                              <button
                                type='button'
                                onClick={() => handleRemoveVideoFromSong(song.id)}
                                className='text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer'
                                title='Remove video from this song'
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <input
                              type='file'
                              accept='video/*'
                              id={`row-video-${song.id}`}
                              hidden
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f && f.size > 98 * 1024 * 1024) {
                                  toast.error(`Video file is too large (${(f.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is 98MB.`);
                                  return;
                                }
                                if (f) {
                                  handleAttachVideoToSong(song.id, f);
                                }
                              }}
                            />
                            <label
                              htmlFor={`row-video-${song.id}`}
                              className='inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 border border-dashed border-gray-300 hover:border-emerald-400 rounded-lg text-[10px] font-semibold text-gray-600 hover:text-emerald-700 cursor-pointer transition shadow-xs'
                              title='Attach an optional 10-15s vertical video canvas to this song'
                            >
                              <span>🎬 + Video</span>
                            </label>
                          </div>
                        )}
                      </td>
                      <td className='py-3 px-3 text-center'>
                        <button
                          type='button'
                          onClick={() => handleToggleSongDisplayMode(song.id)}
                          title='Click to toggle between Regular and Fullscreen BG'
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                            song.imageDisplayMode === 'fullscreen'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {song.imageDisplayMode === 'fullscreen' ? '🌟 Fullscreen' : 'Regular'}
                        </button>
                      </td>
                      <td className='py-3 px-3 text-center'>
                        <button
                          type='button'
                          onClick={() => handleRemoveSongFromTable(song.id)}
                          className='text-red-500 hover:text-red-700 font-bold text-sm p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer'
                          title='Delete song from playlist'
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Submit / Publish Button */}
      <div className='flex items-center gap-4 w-full pt-2'>
        <button
          className='text-base bg-[#003A10] hover:bg-[#005218] text-white py-3.5 px-12 rounded-xl font-bold cursor-pointer shadow-lg hover:shadow-xl transition flex items-center gap-2'
          type='submit'
        >
          <span>🚀</span>
          <span>CREATE & PUBLISH PLAYLIST</span>
        </button>
        {playlistSongs.length > 0 && (
          <span className='text-xs text-gray-500 font-medium'>
            Will publish with {playlistSongs.length} {playlistSongs.length === 1 ? 'song' : 'songs'}
          </span>
        )}
      </div>

      {/* Video Preview & Trimmer Modal */}
      <VideoCanvasTrimmerModal
        isOpen={trimmerOpen}
        onClose={() => setTrimmerOpen(false)}
        videoSource={activeTrimmerSong === 'form' ? songVideoFile : activeTrimmerSong?.videoFile}
        initialStartTime={activeTrimmerSong === 'form' ? formVideoStartTime : activeTrimmerSong?.videoStartTime || 0}
        initialEndTime={activeTrimmerSong === 'form' ? formVideoEndTime : activeTrimmerSong?.videoEndTime || 0}
        initialDelay={activeTrimmerSong === 'form' ? formVideoSongDelay : activeTrimmerSong?.videoSongDelay ?? 5}
        songName={activeTrimmerSong === 'form' ? songTitle : activeTrimmerSong?.name}
        onSave={({ videoStartTime: st, videoEndTime: et, videoSongDelay: sd }) => {
          if (activeTrimmerSong === 'form') {
            setFormVideoStartTime(st);
            setFormVideoEndTime(et);
            setFormVideoSongDelay(sd);
          } else if (activeTrimmerSong && activeTrimmerSong.id) {
            setPlaylistSongs((prev) =>
              prev.map((s) =>
                s.id === activeTrimmerSong.id
                  ? { ...s, videoStartTime: st, videoEndTime: et, videoSongDelay: sd }
                  : s
              )
            );
          }
          toast.success('Video crop & timing applied!');
        }}
      />
    </form>
  );
};

export default AddPlaylist;
