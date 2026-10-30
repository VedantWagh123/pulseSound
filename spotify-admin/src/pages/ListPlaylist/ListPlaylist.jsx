import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { url } from '../../App';
import { assets } from '../../assets/assets';
import { toast } from 'react-toastify';
import VideoCanvasTrimmerModal from '../../components/VideoCanvasTrimmerModal';

const ListPlaylist = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTheory, setEditTheory] = useState('');
  const [editColour, setEditColour] = useState('#7C3AED');
  const [editCoverFile, setEditCoverFile] = useState(null);
  const [editCoverPreview, setEditCoverPreview] = useState('');

  // Songs currently in playlist
  const [currentSongs, setCurrentSongs] = useState([]);

  // New songs to add
  const [newSongsToAdd, setNewSongsToAdd] = useState([]);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('Pulse Artist');
  const [newSongAudioFiles, setNewSongAudioFiles] = useState([]);
  const [newSongImageFile, setNewSongImageFile] = useState(null);
  const [newSongVideoFile, setNewSongVideoFile] = useState(null);
  const [newSongDisplayMode, setNewSongDisplayMode] = useState('regular');
  const [newFormVideoStartTime, setNewFormVideoStartTime] = useState(0);
  const [newFormVideoEndTime, setNewFormVideoEndTime] = useState(0);
  const [newFormVideoSongDelay, setNewFormVideoSongDelay] = useState(5);
  const [existingSongVideos, setExistingSongVideos] = useState({}); // { [songId]: File }
  const [existingSongImages, setExistingSongImages] = useState({}); // { [songId]: { file: File, previewUrl: string } }
  const [existingSongTimings, setExistingSongTimings] = useState({}); // { [songId]: { videoStartTime, videoEndTime, videoSongDelay } }

  // Trimmer Modal state
  const [trimmerOpen, setTrimmerOpen] = useState(false);
  const [activeTrimmerItem, setActiveTrimmerItem] = useState(null);

  const [savingEdit, setSavingEdit] = useState(false);
  const [savingText, setSavingText] = useState('');
  const [editUploadProgress, setEditUploadProgress] = useState(0);

  const audioInputRef = useRef(null);
  const songImageInputRef = useRef(null);
  const songVideoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const colorPalette = [
    { name: 'Purple', hex: '#7C3AED' },
    { name: 'Violet', hex: '#8B5CF6' },
    { name: 'Emerald', hex: '#10B981' },
    { name: 'Cyan', hex: '#06B6D4' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Amber', hex: '#F59E0B' },
    { name: 'Rose', hex: '#EF4444' },
  ];

  const formatMB = (bytes) => {
    if (!bytes) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const cleanSongTitle = (filename) => {
    if (!filename) return 'Untitled Track';
    const withoutExt = filename.replace(/\.[^/.]+$/, '');
    return withoutExt
      .replace(/^[\d\s-_.]+/, '')
      .replace(/[_-]+/g, ' ')
      .trim();
  };

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${url}/api/playlist/list`);
      if (response.data && response.data.success) {
        setData(response.data.playlists || []);
      }
    } catch (error) {
      toast.error('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const removePlaylist = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete public playlist "${name}"?`)) {
      return;
    }
    try {
      const response = await axios.post(`${url}/api/playlist/remove`, { id });
      if (response.data && response.data.success) {
        toast.success(response.data.message || 'Playlist removed');
        await fetchPlaylists();
      } else {
        toast.error(response.data?.message || 'Could not delete playlist');
      }
    } catch (error) {
      toast.error('Error occurred while deleting playlist');
    }
  };

  // Open Edit Modal
  const openEditModal = (pl) => {
    setEditingPlaylist(pl);
    setEditName(pl.name || '');
    setEditDesc(pl.desc || '');
    setEditTheory(pl.theory || '');
    setEditColour(pl.bgColour || pl.bgColor || '#7C3AED');
    setEditCoverFile(null);
    setEditCoverPreview(pl.image || '');
    setCurrentSongs(Array.isArray(pl.songs) ? pl.songs.filter(Boolean) : []);
    setNewSongsToAdd([]);
    setNewSongTitle('');
    setNewSongArtist('Pulse Artist');
    setNewSongAudioFiles([]);
    setNewSongImageFile(null);
    setNewSongVideoFile(null);
    setNewFormVideoStartTime(0);
    setNewFormVideoEndTime(0);
    setNewFormVideoSongDelay(5);
    setNewSongDisplayMode('regular');
    setExistingSongVideos({});
    setExistingSongImages({});
    setExistingSongTimings({});
  };

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditingPlaylist(null);
  };

  // Remove existing song from current playlist
  const handleRemoveExistingSong = (songId) => {
    setCurrentSongs((prev) =>
      prev.filter((s) => {
        if (!s) return false;
        const id = typeof s === 'string' ? s : (s._id || s.id);
        return id !== songId;
      })
    );
    toast.info('Track marked for removal from this playlist');
  };

  // Handle Audio File Selection for newly added songs
  const handleNewAudioFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewSongAudioFiles(files);
    if (files.length === 1 && !newSongTitle) {
      setNewSongTitle(cleanSongTitle(files[0].name));
    }
  };

  // Add new song(s) to queue in edit modal
  const handleAddNewSongQueue = () => {
    if (newSongAudioFiles.length === 0) {
      toast.error('Please select an audio file (.mp3 / .wav / .m4a)');
      return;
    }

    if (newSongAudioFiles.length === 1) {
      const file = newSongAudioFiles[0];
      const title = newSongTitle.trim() || cleanSongTitle(file.name);
      const artist = newSongArtist.trim() || 'Pulse Artist';

      const entry = {
        id: `edit_new_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: title,
        artist,
        audioFile: file,
        audioName: file.name,
        audioSize: file.size,
        imageFile: newSongImageFile || null,
        imagePreview: newSongImageFile ? URL.createObjectURL(newSongImageFile) : null,
        videoFile: newSongVideoFile || null,
        videoName: newSongVideoFile ? newSongVideoFile.name : null,
        videoSize: newSongVideoFile ? newSongVideoFile.size : null,
        videoStartTime: newFormVideoStartTime,
        videoEndTime: newFormVideoEndTime,
        videoSongDelay: newFormVideoSongDelay,
        fullscreenImage: newSongDisplayMode === 'fullscreen',
        imageDisplayMode: newSongDisplayMode,
      };

      setNewSongsToAdd((prev) => [...prev, entry]);
      toast.success(`Queued "${title}" ${newSongVideoFile ? '🎬 with video' : ''} to be added!`);
    } else {
      const entries = newSongAudioFiles.map((file, idx) => ({
        id: `edit_new_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
        name: cleanSongTitle(file.name),
        artist: newSongArtist.trim() || 'Pulse Artist',
        audioFile: file,
        audioName: file.name,
        audioSize: file.size,
        imageFile: newSongImageFile || null,
        imagePreview: newSongImageFile ? URL.createObjectURL(newSongImageFile) : null,
        videoFile: idx === 0 ? (newSongVideoFile || null) : null,
        videoName: idx === 0 && newSongVideoFile ? newSongVideoFile.name : null,
        videoSize: idx === 0 && newSongVideoFile ? newSongVideoFile.size : null,
        videoStartTime: idx === 0 ? newFormVideoStartTime : 0,
        videoEndTime: idx === 0 ? newFormVideoEndTime : 0,
        videoSongDelay: idx === 0 ? newFormVideoSongDelay : 5,
        fullscreenImage: newSongDisplayMode === 'fullscreen',
        imageDisplayMode: newSongDisplayMode,
      }));

      setNewSongsToAdd((prev) => [...prev, ...entries]);
      toast.success(`Queued ${entries.length} songs to be added!`);
    }

    // Reset fields
    setNewSongTitle('');
    setNewSongAudioFiles([]);
    setNewSongImageFile(null);
    setNewSongVideoFile(null);
    setNewFormVideoStartTime(0);
    setNewFormVideoEndTime(0);
    setNewFormVideoSongDelay(5);
    setNewSongDisplayMode('regular');
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (songImageInputRef.current) songImageInputRef.current.value = '';
    if (songVideoInputRef.current) songVideoInputRef.current.value = '';
  };

  const handleToggleNewSongDisplayMode = (id) => {
    setNewSongsToAdd((prev) =>
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

  const handleRemoveQueuedNewSong = (tempId) => {
    setNewSongsToAdd((prev) => prev.filter((s) => s.id !== tempId));
  };

  // Submit Edit to Backend
  const handleSaveEdit = async (e) => {
    e.preventDefault();

    if (!editName.trim()) {
      toast.error('Playlist title is required');
      return;
    }

    setSavingEdit(true);
    setSavingText('Preparing update payload...');

    try {
      const formData = new FormData();
      formData.append('id', editingPlaylist._id);
      formData.append('name', editName.trim());
      formData.append('desc', editDesc.trim());
      formData.append('theory', editTheory.trim());
      formData.append('bgColour', editColour);

      // Remaining existing song IDs (safely extract strings or objects)
      const remainingIds = currentSongs
        .map((s) => (typeof s === 'string' ? s : (s?._id || s?.id)))
        .filter(Boolean);
      formData.append('existingSongIds', JSON.stringify(remainingIds));

      // New cover image if changed
      if (editCoverFile) {
        formData.append('image', editCoverFile);
      }

      // Newly added songs
      if (newSongsToAdd.length > 0) {
        setSavingText(`Uploading ${newSongsToAdd.length} newly added track(s)...`);
        const songsMetadata = newSongsToAdd.map((s) => ({
          name: s.name,
          artist: s.artist,
          desc: editDesc.trim(),
          fullscreenImage: s.fullscreenImage === true || s.imageDisplayMode === 'fullscreen',
          imageDisplayMode: s.imageDisplayMode || (s.fullscreenImage ? 'fullscreen' : 'regular'),
          hasVideo: Boolean(s.videoFile),
          videoStartTime: Number(s.videoStartTime) || 0,
          videoEndTime: Number(s.videoEndTime) || 0,
          videoSongDelay: s.videoSongDelay !== undefined ? Number(s.videoSongDelay) : 5,
        }));
        formData.append('songsMetadata', JSON.stringify(songsMetadata));

        newSongsToAdd.forEach((s, idx) => {
          formData.append(`audio_${idx}`, s.audioFile);
          if (s.imageFile) {
            formData.append(`songImage_${idx}`, s.imageFile);
          }
          if (s.videoFile) {
            formData.append(`video_${idx}`, s.videoFile);
          }
        });
      }

      // Existing songs video updates
      Object.keys(existingSongVideos).forEach((sId) => {
        if (existingSongVideos[sId]) {
          formData.append(`existing_video_${sId}`, existingSongVideos[sId]);
        }
      });

      // Existing songs image artwork updates
      Object.keys(existingSongImages).forEach((sId) => {
        if (existingSongImages[sId]?.file) {
          formData.append(`existing_image_${sId}`, existingSongImages[sId].file);
        }
      });

      // Existing songs timing updates
      if (Object.keys(existingSongTimings).length > 0) {
        formData.append('existingSongTimings', JSON.stringify(existingSongTimings));
      }

      const response = await axios.post(`${url}/api/playlist/update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setEditUploadProgress(percent);
            setSavingText(percent < 100 ? `Uploading (${percent}%)...` : '⚡ Parallel Cloud Ingestion & Edge Encoding...');
          }
        },
      });

      if (response.data && response.data.success) {
        toast.success(response.data.message || 'Playlist updated successfully! 🎶');
        closeEditModal();
        await fetchPlaylists();
      } else {
        toast.error(response.data?.message || 'Failed to update playlist');
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error(error.response?.data?.message || error.message || 'Server error updating playlist');
    } finally {
      setSavingEdit(false);
      setSavingText('');
      setEditUploadProgress(0);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  return (
    <div className='max-w-6xl pb-16'>
      {/* Page Header */}
      <div className='border-b border-gray-300 pb-3 mb-6'>
        <h2 className='text-2xl font-bold text-gray-900'>All Public Playlists</h2>
        <p className='text-sm text-gray-500 mt-1'>
          Curated playlists currently accessible to mobile app users. You can edit playlist metadata, add new songs, or remove existing tracks anytime.
        </p>
      </div>

      {loading ? (
        <div className='grid place-items-center min-h-[40vh]'>
          <div className='w-12 h-12 border-4 border-gray-400 border-t-purple-600 rounded-full animate-spin'></div>
        </div>
      ) : data.length === 0 ? (
        <div className='bg-white p-8 rounded-xl border border-gray-200 text-center max-w-lg'>
          <p className='text-gray-600 font-medium'>No public playlists created yet.</p>
          <p className='text-xs text-gray-400 mt-1'>
            Click "Add Playlist" in the sidebar to create your first public playlist.
          </p>
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          <div className='hidden md:grid grid-cols-[0.8fr_1.5fr_2fr_1fr_0.8fr_0.9fr] items-center gap-3 p-3 border border-gray-300 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 rounded-t-lg'>
            <span>Cover</span>
            <span>Title</span>
            <span>Description & Theory</span>
            <span>Songs Included</span>
            <span>Theme Color</span>
            <span className='text-center'>Actions</span>
          </div>

          {data.map((item) => {
            const songsCount = Array.isArray(item.songs) ? item.songs.filter(Boolean).length : 0;
            return (
              <div
                key={item._id}
                className='grid grid-cols-1 md:grid-cols-[0.8fr_1.5fr_2fr_1fr_0.8fr_0.9fr] items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-purple-300 transition'
              >
                <div className='flex items-center gap-3 md:block'>
                  <img
                    className='w-16 h-16 rounded-lg object-cover border border-gray-200 shadow-sm'
                    src={item.image}
                    alt={item.name}
                  />
                  <div className='md:hidden'>
                    <h3 className='font-bold text-gray-900'>{item.name}</h3>
                    <span className='text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium'>
                      {songsCount} Songs
                    </span>
                  </div>
                </div>

                <div className='hidden md:block'>
                  <p className='font-bold text-gray-900 text-sm'>{item.name}</p>
                  <span className='text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium inline-block mt-1'>
                    Public Playlist
                  </span>
                </div>

                <div className='text-xs text-gray-600'>
                  <p className='font-medium text-gray-800 line-clamp-1'>{item.desc}</p>
                  {item.theory && (
                    <p className='text-[11px] text-gray-500 italic mt-1 line-clamp-2'>
                      💡 <span className='font-semibold'>Theory:</span> {item.theory}
                    </p>
                  )}
                </div>

                <div className='hidden md:flex items-center gap-1.5 text-xs text-gray-700'>
                  <span className='w-2 h-2 rounded-full bg-green-500'></span>
                  <span className='font-semibold'>{songsCount}</span> tracks
                </div>

                <div className='hidden md:flex items-center gap-2'>
                  <div
                    className='w-6 h-6 rounded-md border border-gray-300 shadow-inner'
                    style={{ backgroundColor: item.bgColour || item.bgColor || '#7C3AED' }}
                  />
                  <span className='text-xs font-mono text-gray-500'>
                    {item.bgColour || item.bgColor || '#7C3AED'}
                  </span>
                </div>

                {/* Action Buttons: Edit + Delete */}
                <div className='flex items-center justify-end md:justify-center gap-2'>
                  <button
                    onClick={() => openEditModal(item)}
                    className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition cursor-pointer shadow-xs'
                    title='Edit Playlist, Add or Remove Songs'
                  >
                    <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                    </svg>
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => removePlaylist(item._id, item.name)}
                    className='w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold transition cursor-pointer border border-red-200'
                    title='Delete Playlist'
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT PLAYLIST MODAL */}
      {editingPlaylist && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in'>
          <div className='bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 my-8 overflow-hidden max-h-[92vh] flex flex-col'>
            {/* Modal Header */}
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-purple-50 to-white'>
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-sm'>
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                  </svg>
                </div>
                <div>
                  <h3 className='text-lg font-bold text-gray-900'>Edit Public Playlist</h3>
                  <p className='text-xs text-gray-500'>
                    Update details, remove tracks, or upload new songs exclusively to this playlist.
                  </p>
                </div>
              </div>

              <button
                disabled={savingEdit}
                onClick={closeEditModal}
                className='w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center transition cursor-pointer disabled:opacity-50'
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className='p-6 overflow-y-auto space-y-6 flex-1'>
              {/* SECTION 1: PLAYLIST METADATA */}
              <div className='bg-gray-50/80 p-5 rounded-xl border border-gray-200 space-y-4'>
                <h4 className='text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5'>
                  <span className='w-2 h-2 rounded-full bg-purple-600'></span>
                  1. Playlist Info & Artwork
                </h4>

                <div className='grid grid-cols-1 md:grid-cols-[140px_1fr] gap-5 items-start'>
                  {/* Artwork upload / preview */}
                  <div>
                    <label className='block text-xs font-semibold text-gray-700 mb-1.5'>Cover Artwork</label>
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      className='relative w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-500 overflow-hidden cursor-pointer group bg-white shadow-xs flex items-center justify-center'
                    >
                      <img
                        src={editCoverPreview || assets.upload_area}
                        alt='Cover'
                        className='w-full h-full object-cover'
                      />
                      <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[11px] font-medium'>
                        <span>Change Cover</span>
                      </div>
                    </div>
                    <input
                      ref={coverInputRef}
                      type='file'
                      accept='image/*'
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditCoverFile(file);
                          setEditCoverPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <p className='text-[10px] text-gray-400 mt-1'>Click image to replace</p>
                  </div>

                  {/* Title, Desc, Theory, Color */}
                  <div className='space-y-3'>
                    <div>
                      <label className='block text-xs font-semibold text-gray-700 mb-1'>Playlist Title *</label>
                      <input
                        type='text'
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder='e.g., Cyberpunk Pulse 2026'
                        className='w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-purple-600 shadow-xs'
                      />
                    </div>

                    <div>
                      <label className='block text-xs font-semibold text-gray-700 mb-1'>Short Description</label>
                      <input
                        type='text'
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder='Short description for app listeners'
                        className='w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-purple-600 shadow-xs'
                      />
                    </div>

                    <div>
                      <label className='block text-xs font-semibold text-gray-700 mb-1'>
                        Playlist Theory & Concept (Curator Notes)
                      </label>
                      <textarea
                        rows={2}
                        value={editTheory}
                        onChange={(e) => setEditTheory(e.target.value)}
                        placeholder='Musical theory, transition cues, aesthetic concept...'
                        className='w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-800 focus:outline-none focus:border-purple-600 shadow-xs resize-none'
                      />
                    </div>

                    {/* Color selector */}
                    <div>
                      <label className='block text-xs font-semibold text-gray-700 mb-1.5'>Theme Color</label>
                      <div className='flex items-center gap-2'>
                        {colorPalette.map((c) => (
                          <button
                            key={c.hex}
                            type='button'
                            onClick={() => setEditColour(c.hex)}
                            className={`w-7 h-7 rounded-full transition-transform cursor-pointer shadow-xs ${
                              editColour.toLowerCase() === c.hex.toLowerCase()
                                ? 'scale-125 ring-2 ring-offset-2 ring-purple-600'
                                : 'hover:scale-110 opacity-80'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                        <span className='text-xs font-mono text-gray-500 ml-2'>{editColour}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CURRENT SONGS IN PLAYLIST */}
              <div className='bg-gray-50/80 p-5 rounded-xl border border-gray-200 space-y-3'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5'>
                    <span className='w-2 h-2 rounded-full bg-purple-600'></span>
                    2. Existing Songs ({currentSongs.length})
                  </h4>
                  <span className='text-[11px] text-gray-500'>
                    Click "Remove" on any track to delete it from this playlist
                  </span>
                </div>

                {currentSongs.length === 0 ? (
                  <div className='bg-white p-6 rounded-lg border border-dashed border-gray-300 text-center text-xs text-gray-500'>
                    No existing songs remain in this playlist. Upload new tracks below!
                  </div>
                ) : (
                  <div className='bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-72 overflow-y-auto'>
                    {currentSongs.map((song, idx) => {
                      const songId = typeof song === 'string' ? song : (song._id || song.id);
                      const currentImg = existingSongImages[songId]?.previewUrl || song.image || editingPlaylist.image || assets.upload_area;
                      const hasNewImg = Boolean(existingSongImages[songId]);

                      return (
                        <div key={songId || idx} className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-gray-50/80 transition'>
                          <div className='flex items-center gap-3 min-w-0 flex-1'>
                            <span className='text-xs font-bold text-gray-400 w-5 text-right shrink-0'>{idx + 1}</span>

                            {/* Interactive Thumbnail: Click to replace artwork */}
                            <div className='relative group shrink-0'>
                              <img
                                src={currentImg}
                                alt={song.name}
                                className={`w-12 h-12 rounded-lg object-cover border shadow-xs transition ${
                                  hasNewImg ? 'border-amber-400 ring-2 ring-amber-300' : 'border-gray-200'
                                }`}
                              />
                              <label
                                htmlFor={`img-click-${songId}`}
                                className='absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
                                title='Click to choose new artwork image'
                              >
                                <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' />
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M15 13a3 3 0 11-6 0 3 3 0 016 0z' />
                                </svg>
                                <span className='text-[8px] font-bold text-white uppercase tracking-tight'>Edit</span>
                              </label>
                              <input
                                id={`img-click-${songId}`}
                                type='file'
                                accept='image/*'
                                hidden
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    setExistingSongImages((prev) => ({
                                      ...prev,
                                      [songId]: { file: f, previewUrl: URL.createObjectURL(f) },
                                    }));
                                    toast.success(`Queued new artwork for "${song.name}"! 🎨`);
                                  }
                                }}
                              />
                            </div>

                            <div className='min-w-0 flex-1'>
                              <p className='text-xs font-semibold text-gray-900 truncate'>{song.name}</p>
                              <div className='flex items-center gap-1.5 flex-wrap mt-0.5'>
                                <p className='text-[11px] text-gray-500 truncate'>{song.artist || 'Pulse Artist'}</p>

                                {/* Artwork Image Attached Status */}
                                {hasNewImg ? (
                                  <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs'>
                                    🖼️ New Artwork Queued: {existingSongImages[songId].file.name}
                                  </span>
                                ) : song.image ? (
                                  <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200 flex items-center gap-1'>
                                    🖼️ Custom Image Attached
                                  </span>
                                ) : (
                                  <span className='px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1'>
                                    🖼️ Using Playlist Cover
                                  </span>
                                )}

                                {/* Video Canvas Attached Status */}
                                {existingSongVideos[songId] ? (
                                  <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300 flex items-center gap-1 shadow-2xs'>
                                    🎬 New Video Queued: {existingSongVideos[songId].name}
                                  </span>
                                ) : song.video ? (
                                  <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1'>
                                    🎬 Video Canvas Attached
                                  </span>
                                ) : (
                                  <span className='px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1'>
                                    🚫 No Video Canvas
                                  </span>
                                )}

                                {(song.fullscreenImage === true || song.fullscreenImage === 'true' || song.imageDisplayMode === 'fullscreen') && (
                                  <span className='px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300'>
                                    🌟 Fullscreen BG
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Controls - Fully Responsive Wrap */}
                          <div className='flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap'>
                            {song.duration && (
                              <span className='text-xs font-mono text-gray-400 hidden md:inline mr-1'>
                                {song.duration}
                              </span>
                            )}

                            {/* Change Song Artwork Image Button */}
                            <div className='flex items-center gap-1'>
                              <label
                                htmlFor={`existing-image-${songId}`}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition shadow-2xs ${
                                  hasNewImg
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-400 font-bold'
                                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                                }`}
                                title='Select custom image artwork for this song'
                              >
                                <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' />
                                </svg>
                                <span>{hasNewImg ? '🖼️ Artwork Changed' : '🖼️ + Image'}</span>
                                <input
                                  id={`existing-image-${songId}`}
                                  type='file'
                                  accept='image/*'
                                  hidden
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) {
                                      setExistingSongImages((prev) => ({
                                        ...prev,
                                        [songId]: { file: f, previewUrl: URL.createObjectURL(f) },
                                      }));
                                      toast.success(`Queued new artwork for "${song.name}"! 🎨`);
                                    }
                                  }}
                                />
                              </label>

                              {hasNewImg && (
                                <button
                                  type='button'
                                  onClick={() => {
                                    setExistingSongImages((prev) => {
                                      const next = { ...prev };
                                      delete next[songId];
                                      return next;
                                    });
                                    toast.info(`Reverted artwork for "${song.name}"`);
                                  }}
                                  className='p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer'
                                  title='Cancel new image'
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Video Preview & Crop */}
                            {(song.video || existingSongVideos[songId]) && (
                              <button
                                type='button'
                                onClick={() => {
                                  setActiveTrimmerItem({
                                    type: 'existing',
                                    songId,
                                    source: existingSongVideos[songId] || song.video,
                                    name: song.name,
                                    videoStartTime: existingSongTimings[songId]?.videoStartTime ?? song.videoStartTime ?? 0,
                                    videoEndTime: existingSongTimings[songId]?.videoEndTime ?? song.videoEndTime ?? 0,
                                    videoSongDelay: existingSongTimings[songId]?.videoSongDelay ?? song.videoSongDelay ?? 5,
                                  });
                                  setTrimmerOpen(true);
                                }}
                                className='px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300 cursor-pointer transition flex items-center gap-1 shadow-2xs'
                                title='Preview video, crop start/end timing, and adjust song delay'
                              >
                                <span>👁️ Preview/Crop</span>
                              </button>
                            )}

                            {/* Attach/Edit Video Button */}
                            <label
                              htmlFor={`existing-video-${songId}`}
                              className='flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 cursor-pointer transition shadow-2xs'
                              title='Attach or replace video canvas for this song'
                            >
                              <span>{song.video || existingSongVideos[songId] ? '🎬 Edit Video' : '🎬 + Video'}</span>
                              <input
                                id={`existing-video-${songId}`}
                                type='file'
                                accept='video/*'
                                hidden
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    if (f.size > 98 * 1024 * 1024) {
                                      toast.error(`Video file is too large (${(f.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is 98MB for cloud canvas.`);
                                      e.target.value = '';
                                      return;
                                    }
                                    setExistingSongVideos((prev) => ({ ...prev, [songId]: f }));
                                    toast.success(`Queued video canvas for "${song.name}"!`);
                                  }
                                }}
                              />
                            </label>

                            {/* Remove Track Button */}
                            <button
                              type='button'
                              onClick={() => handleRemoveExistingSong(songId)}
                              className='flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition cursor-pointer border border-red-200 shadow-2xs'
                              title='Remove track from playlist'
                            >
                              ✕ Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 3: UPLOAD & ADD NEW SONGS */}
              <div className='bg-purple-50/50 p-5 rounded-xl border border-purple-200 space-y-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5'>
                    <span className='w-2 h-2 rounded-full bg-purple-700'></span>
                    3. Upload & Add New Songs (Exclusive to this playlist)
                  </h4>
                  <span className='text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded-full'>
                    Direct Multi-Upload
                  </span>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-purple-100'>
                  {/* Audio files upload */}
                  <div>
                    <label className='block text-xs font-semibold text-gray-700 mb-1.5'>
                      Select Audio Track(s) *
                    </label>
                    <input
                      ref={audioInputRef}
                      type='file'
                      accept='audio/*'
                      multiple
                      onChange={handleNewAudioFiles}
                      className='w-full text-xs text-gray-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer border border-gray-200 rounded-lg p-1'
                    />
                    {newSongAudioFiles.length > 0 && (
                      <p className='text-[11px] text-purple-700 font-medium mt-1'>
                        ✓ {newSongAudioFiles.length} file(s) selected ({formatMB(newSongAudioFiles.reduce((acc, f) => acc + f.size, 0))})
                      </p>
                    )}
                  </div>

                  {/* Song Cover Image Upload */}
                  <div>
                    <label className='block text-xs font-semibold text-gray-700 mb-1.5'>
                      Optional Song Artwork Image
                    </label>
                    <input
                      ref={songImageInputRef}
                      type='file'
                      accept='image/*'
                      onChange={(e) => setNewSongImageFile(e.target.files[0] || null)}
                      className='w-full text-xs text-gray-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-800 cursor-pointer border border-gray-200 rounded-lg p-1'
                    />
                    <p className='text-[10px] text-gray-400 mt-1'>
                      If empty, playlist thumbnail will be used.
                    </p>
                  </div>

                  {/* Video Canvas Upload */}
                  <div>
                    <div className='flex items-center justify-between mb-1.5'>
                      <label className='block text-xs font-semibold text-gray-700'>
                        Video Canvas <span className='text-emerald-700 font-normal'>(10-15s optional)</span>
                      </label>
                      {newSongVideoFile && (
                        <button
                          type='button'
                          onClick={() => {
                            setNewSongVideoFile(null);
                            if (songVideoInputRef.current) songVideoInputRef.current.value = '';
                          }}
                          className='text-[10px] text-red-500 hover:text-red-700 font-bold'
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      ref={songVideoInputRef}
                      type='file'
                      accept='video/*'
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && f.size > 98 * 1024 * 1024) {
                          toast.error(`Video file is too large (${(f.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is 98MB for cloud canvas.`);
                          e.target.value = '';
                          setNewSongVideoFile(null);
                          return;
                        }
                        setNewSongVideoFile(f || null);
                      }}
                      className='w-full text-xs text-gray-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer border border-gray-200 rounded-lg p-1'
                    />
                    {newSongVideoFile ? (
                      <div className='flex flex-col gap-1 mt-1'>
                        <p className='text-[10px] text-emerald-700 font-semibold truncate' title={newSongVideoFile.name}>
                          🎬 {newSongVideoFile.name} ({formatMB(newSongVideoFile.size)})
                        </p>
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          <button
                            type='button'
                            onClick={() => {
                              setActiveTrimmerItem({
                                type: 'newForm',
                                source: newSongVideoFile,
                                name: newSongTitle,
                                videoStartTime: newFormVideoStartTime,
                                videoEndTime: newFormVideoEndTime,
                                videoSongDelay: newFormVideoSongDelay,
                              });
                              setTrimmerOpen(true);
                            }}
                            className='px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer'
                          >
                            👁️ Preview & Crop
                          </button>
                          <span className='text-[9px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded'>
                            {newFormVideoStartTime}s → {newFormVideoEndTime > 0 ? `${newFormVideoEndTime}s` : 'Full'} | {newFormVideoSongDelay}s delay
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className='text-[10px] text-gray-400 mt-1'>
                        Loops in background when track plays.
                      </p>
                    )}
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-purple-100'>
                  {/* Song title & artist */}
                  <div className='space-y-2'>
                    <div>
                      <label className='block text-xs font-semibold text-gray-700 mb-1'>Song Title</label>
                      <input
                        type='text'
                        value={newSongTitle}
                        onChange={(e) => setNewSongTitle(e.target.value)}
                        placeholder='Track title (auto-detected from filename)'
                        className='w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-purple-600'
                      />
                    </div>
                    <div>
                      <label className='block text-xs font-semibold text-gray-700 mb-1'>Artist</label>
                      <input
                        type='text'
                        value={newSongArtist}
                        onChange={(e) => setNewSongArtist(e.target.value)}
                        placeholder='Pulse Artist'
                        className='w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-purple-600'
                      />
                    </div>
                  </div>

                  {/* Player Artwork Display Mode */}
                  <div>
                    <label className='block text-xs font-semibold text-gray-700 mb-1.5'>
                      Player Artwork Display Mode
                    </label>
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={() => setNewSongDisplayMode('regular')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
                          newSongDisplayMode === 'regular'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span>Square Box</span>
                        <span className='text-[10px] opacity-80'>(Regular)</span>
                      </button>
                      <button
                        type='button'
                        onClick={() => setNewSongDisplayMode('fullscreen')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
                          newSongDisplayMode === 'fullscreen'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span>🌟 Full Screen BG</span>
                      </button>
                    </div>
                    <p className='text-[10px] text-gray-500 mt-1.5'>
                      {newSongDisplayMode === 'fullscreen'
                        ? '🌟 Song artwork will fill full screen background behind player in song details.'
                        : 'Regular centered artwork box in song details.'}
                    </p>
                  </div>
                </div>

                {/* Button to queue selected audio files into the list */}
                <div className='flex justify-end'>
                  <button
                    type='button'
                    onClick={handleAddNewSongQueue}
                    className='flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer'
                  >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 4v16m8-8H4' />
                    </svg>
                    Queue Song(s) for Upload
                  </button>
                </div>

                {/* Queue of new songs to add */}
                {newSongsToAdd.length > 0 && (
                  <div className='bg-white rounded-lg border border-purple-200 overflow-hidden'>
                    <div className='px-3 py-2 bg-purple-100/60 border-b border-purple-200 flex items-center justify-between'>
                      <span className='text-xs font-bold text-purple-900'>
                        New Songs Ready to Upload ({newSongsToAdd.length})
                      </span>
                      <span className='text-[10px] text-purple-700 font-semibold'>
                        Exclusive to this playlist
                      </span>
                    </div>

                    <div className='divide-y divide-gray-100 max-h-48 overflow-y-auto'>
                      {newSongsToAdd.map((song, idx) => (
                        <div key={song.id} className='flex items-center justify-between p-2.5 hover:bg-gray-50'>
                          <div className='flex items-center gap-2.5 min-w-0'>
                            <span className='text-xs font-bold text-purple-600 w-5 text-right'>+{idx + 1}</span>
                            <div className='min-w-0'>
                              <p className='text-xs font-semibold text-gray-900 truncate'>{song.name}</p>
                              <div className='flex items-center gap-1.5 flex-wrap mt-0.5'>
                                <p className='text-[11px] text-gray-500 truncate'>
                                  {song.artist} • {formatMB(song.audioSize)}
                                </p>

                                {/* Artwork Attached Status */}
                                {song.imageFile ? (
                                  <span className='px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-800 border border-violet-300 flex items-center gap-1'>
                                    🖼️ Image Attached
                                  </span>
                                ) : (
                                  <span className='px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1'>
                                    🖼️ Playlist Cover
                                  </span>
                                )}

                                {/* Video Attached Status */}
                                {song.videoFile ? (
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setActiveTrimmerItem({
                                        type: 'newQueue',
                                        queueId: song.id,
                                        source: song.videoFile,
                                        name: song.name,
                                        videoStartTime: song.videoStartTime ?? 0,
                                        videoEndTime: song.videoEndTime ?? 0,
                                        videoSongDelay: song.videoSongDelay ?? 5,
                                      });
                                      setTrimmerOpen(true);
                                    }}
                                    className='px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 cursor-pointer flex items-center gap-1 shadow-2xs'
                                    title='Click to preview or crop video'
                                  >
                                    <span>🎬 Video Attached</span>
                                    <span className='underline text-[8px]'>(Preview/Crop)</span>
                                  </button>
                                ) : (
                                  <span className='px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1'>
                                    🚫 No Video
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className='flex items-center gap-2'>
                            <button
                              type='button'
                              onClick={() => handleToggleNewSongDisplayMode(song.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition ${
                                song.imageDisplayMode === 'fullscreen'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                              }`}
                              title='Click to switch between Regular and Fullscreen BG'
                            >
                              {song.imageDisplayMode === 'fullscreen' ? '🌟 Fullscreen BG' : 'Regular Box'}
                            </button>
                            <button
                              type='button'
                              onClick={() => handleRemoveQueuedNewSong(song.id)}
                              className='text-red-500 hover:text-red-700 text-xs font-bold p-1'
                              title='Remove from queue'
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className='px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between'>
              <div className='text-xs text-gray-500'>
                Total tracks after saving: <span className='font-bold text-gray-800'>{currentSongs.length + newSongsToAdd.length}</span>
              </div>

              <div className='flex items-center gap-3'>
                <button
                  type='button'
                  disabled={savingEdit}
                  onClick={closeEditModal}
                  className='px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50'
                >
                  Cancel
                </button>

                <button
                  type='button'
                  disabled={savingEdit}
                  onClick={handleSaveEdit}
                  className='flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-60'
                >
                  {savingEdit ? (
                    <>
                      <div className='w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                      <span>{savingText || 'Saving Changes...'}</span>
                    </>
                  ) : (
                    <>
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M5 13l4 4L19 7' />
                      </svg>
                      <span>Save & Update Playlist</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview & Trimmer Modal */}
      <VideoCanvasTrimmerModal
        isOpen={trimmerOpen}
        onClose={() => setTrimmerOpen(false)}
        videoSource={activeTrimmerItem?.source}
        initialStartTime={activeTrimmerItem?.videoStartTime || 0}
        initialEndTime={activeTrimmerItem?.videoEndTime || 0}
        initialDelay={activeTrimmerItem?.videoSongDelay ?? 5}
        songName={activeTrimmerItem?.name}
        onSave={({ videoStartTime: st, videoEndTime: et, videoSongDelay: sd }) => {
          if (!activeTrimmerItem) return;
          if (activeTrimmerItem.type === 'newForm') {
            setNewFormVideoStartTime(st);
            setNewFormVideoEndTime(et);
            setNewFormVideoSongDelay(sd);
          } else if (activeTrimmerItem.type === 'newQueue' && activeTrimmerItem.queueId) {
            setNewSongsToAdd((prev) =>
              prev.map((s) =>
                s.id === activeTrimmerItem.queueId
                  ? { ...s, videoStartTime: st, videoEndTime: et, videoSongDelay: sd }
                  : s
              )
            );
          } else if (activeTrimmerItem.type === 'existing' && activeTrimmerItem.songId) {
            setExistingSongTimings((prev) => ({
              ...prev,
              [activeTrimmerItem.songId]: {
                videoStartTime: st,
                videoEndTime: et,
                videoSongDelay: sd,
              },
            }));
          }
          toast.success('Video crop & timing applied!');
        }}
      />
    </div>
  );
};

export default ListPlaylist;
