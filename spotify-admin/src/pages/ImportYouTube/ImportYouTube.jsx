import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { url } from '../../App';
import { assets } from '../../assets/assets';

const ImportYouTube = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-captured metadata
  const [songName, setSongName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [desc, setDesc] = useState('');
  const [duration, setDuration] = useState('');
  const [youtubeThumbnail, setYoutubeThumbnail] = useState('');

  // Custom artwork
  const [customImage, setCustomImage] = useState(null);
  const [customImagePreview, setCustomImagePreview] = useState('');

  // Canvas Video
  const [videoFile, setVideoFile] = useState(null);

  // Destination Options: 'playlist' or 'single'
  const [destinationType, setDestinationType] = useState('playlist');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [albumName, setAlbumName] = useState('Single');

  // Display mode
  const [imageDisplayMode, setImageDisplayMode] = useState('regular');

  // Playlists list
  const [playlists, setPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      setLoadingPlaylists(true);
      const res = await axios.get(`${url}/api/playlist/list`);
      if (res.data && res.data.success && Array.isArray(res.data.playlists)) {
        setPlaylists(res.data.playlists);
        if (res.data.playlists.length > 0 && !selectedPlaylistId) {
          setSelectedPlaylistId(res.data.playlists[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching playlists in ImportYouTube:', err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // Step 1: Auto-fetch & resolve YouTube details
  const handleFetchYouTube = async () => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    try {
      setIsFetching(true);
      const res = await axios.post(`${url}/api/youtube/resolve`, { url: trimmed });

      if (res.data && res.data.success && res.data.song) {
        const s = res.data.song;
        setSongName(s.name || '');
        setArtistName(s.artist || 'Pulse Artist');
        setDesc(s.desc || `YouTube track by ${s.artist || 'Pulse Artist'}`);
        setDuration(s.duration || '3:30');
        setYoutubeThumbnail(s.image || '');
        setCustomImage(null);
        setCustomImagePreview('');
        toast.success(`⚡ Captured: "${s.name}"`);
      } else {
        toast.error(res.data?.message || 'Could not resolve this YouTube link');
      }
    } catch (err) {
      console.error('Fetch YouTube error:', err);
      toast.error(err.response?.data?.message || 'Failed to resolve YouTube audio stream');
    } finally {
      setIsFetching(false);
    }
  };

  // Custom Image file change handler
  const handleCustomImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomImage(file);
      setCustomImagePreview(URL.createObjectURL(file));
      toast.info('Custom artwork selected! 🖼️');
    }
  };

  const handleResetImage = () => {
    setCustomImage(null);
    setCustomImagePreview('');
  };

  // Step 2: Submit import to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!youtubeUrl.trim()) {
      toast.error('Please provide a YouTube video URL');
      return;
    }

    if (!songName.trim()) {
      toast.error('Song name cannot be empty');
      return;
    }

    if (destinationType === 'playlist' && !selectedPlaylistId) {
      toast.error('Please select a target playlist');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('url', youtubeUrl.trim());
      formData.append('name', songName.trim());
      formData.append('artist', artistName.trim());
      formData.append('desc', desc.trim());
      formData.append('duration', duration.trim());
      formData.append('destinationType', destinationType);
      formData.append('imageDisplayMode', imageDisplayMode);
      formData.append('fullscreenImage', imageDisplayMode === 'fullscreen');

      if (destinationType === 'playlist') {
        formData.append('playlistId', selectedPlaylistId);
      } else {
        formData.append('album', albumName.trim() || 'Single');
      }

      if (customImage) {
        formData.append('image', customImage);
      }

      if (videoFile) {
        formData.append('video', videoFile);
      }

      const res = await axios.post(`${url}/api/youtube/import-admin`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Track successfully published to app! 🚀');

        // Reset form for next song
        setYoutubeUrl('');
        setSongName('');
        setArtistName('');
        setDesc('');
        setDuration('');
        setYoutubeThumbnail('');
        setCustomImage(null);
        setCustomImagePreview('');
        setVideoFile(null);
      } else {
        toast.error(res.data?.message || 'Failed to import track');
      }
    } catch (err) {
      console.error('Import submit error:', err);
      toast.error(err.response?.data?.message || 'Server error importing YouTube track');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayThumbnail = customImagePreview || youtubeThumbnail;

  return (
    <div className='max-w-4xl pb-16'>
      {/* Page Header */}
      <div className='border-b border-gray-300 pb-3 mb-6'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center text-red-600 font-extrabold text-xl'>
            ▶
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Import Track from YouTube</h1>
            <p className='text-xs text-gray-500'>
              Instant 0-Storage Music Ingestion • Auto Metadata Capture • Add to Playlists or Publish as Single
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='flex flex-col gap-6 text-gray-700 text-sm'>
        {/* 1. YouTube Link Input Bar */}
        <div className='bg-white p-5 rounded-2xl border border-gray-200 shadow-xs'>
          <label className='font-bold text-gray-800 text-sm block mb-2'>
            1. Paste YouTube Video / Song URL <span className='text-red-500'>*</span>
          </label>
          <div className='flex flex-col sm:flex-row gap-3'>
            <input
              type='text'
              placeholder='https://www.youtube.com/watch?v=... or https://youtu.be/...'
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className='flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-red-500 text-sm'
            />
            <button
              type='button'
              onClick={handleFetchYouTube}
              disabled={isFetching || !youtubeUrl.trim()}
              className='px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0'
            >
              {isFetching ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  <span>Capturing...</span>
                </>
              ) : (
                <>
                  <span>⚡ Auto-Capture Details</span>
                </>
              )}
            </button>
          </div>
          <p className='text-[11px] text-gray-400 mt-2'>
            💡 Works with standard YouTube music videos, official songs, and YouTube Shorts.
          </p>
        </div>

        {/* 2. Destination Selector: Playlist vs Single Song */}
        <div className='bg-white p-5 rounded-2xl border border-gray-200 shadow-xs'>
          <label className='font-bold text-gray-800 text-sm block mb-3'>
            2. Choose Destination (Playlist or Single Song) <span className='text-red-500'>*</span>
          </label>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4'>
            {/* Playlist Option */}
            <div
              onClick={() => setDestinationType('playlist')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                destinationType === 'playlist'
                  ? 'border-purple-600 bg-purple-50/50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type='radio'
                name='destination'
                checked={destinationType === 'playlist'}
                onChange={() => setDestinationType('playlist')}
                className='mt-1 accent-purple-600'
              />
              <div>
                <p className='font-bold text-gray-900 text-sm'>Add to Public Playlist</p>
                <p className='text-xs text-gray-500 mt-0.5'>
                  Song will appear inside the chosen Curated Public Playlist in the mobile app.
                </p>
              </div>
            </div>

            {/* Single Song Option */}
            <div
              onClick={() => setDestinationType('single')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                destinationType === 'single'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type='radio'
                name='destination'
                checked={destinationType === 'single'}
                onChange={() => setDestinationType('single')}
                className='mt-1 accent-emerald-600'
              />
              <div>
                <p className='font-bold text-gray-900 text-sm'>Publish as Single Song</p>
                <p className='text-xs text-gray-500 mt-0.5'>
                  Appears on the app Home screen feed, All Songs catalogue, and search.
                </p>
              </div>
            </div>
          </div>

          {/* Conditional Dropdown for Playlist */}
          {destinationType === 'playlist' ? (
            <div>
              <label className='text-xs font-semibold text-gray-700 block mb-1'>Select Target Playlist:</label>
              {loadingPlaylists ? (
                <p className='text-xs text-gray-400'>Loading playlists...</p>
              ) : playlists.length === 0 ? (
                <p className='text-xs text-amber-600 font-medium'>
                  No public playlists found. Please create a playlist first in "Add Playlist".
                </p>
              ) : (
                <select
                  value={selectedPlaylistId}
                  onChange={(e) => setSelectedPlaylistId(e.target.value)}
                  className='w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-purple-600 text-sm'
                >
                  {playlists.map((pl) => (
                    <option key={pl._id} value={pl._id}>
                      {pl.name} ({Array.isArray(pl.songs) ? pl.songs.length : 0} tracks)
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className='text-xs font-semibold text-gray-700 block mb-1'>Album / Category Name:</label>
              <input
                type='text'
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                placeholder='e.g. Single, Trending, Chill Mix'
                className='w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-600 text-sm'
              />
            </div>
          )}
        </div>

        {/* 3. Auto-Captured Song Details (Editable) */}
        <div className='bg-white p-5 rounded-2xl border border-gray-200 shadow-xs'>
          <label className='font-bold text-gray-800 text-sm block mb-3'>
            3. Track Details (Auto-Captured & Fully Editable)
          </label>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
            {/* Song Name */}
            <div>
              <label className='text-xs font-semibold text-gray-700 block mb-1'>Song Title *</label>
              <input
                type='text'
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                placeholder='Auto-captured from YouTube'
                required
                className='w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-purple-600 text-sm font-medium'
              />
            </div>

            {/* Artist Name */}
            <div>
              <label className='text-xs font-semibold text-gray-700 block mb-1'>Artist / Channel *</label>
              <input
                type='text'
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder='Auto-captured from YouTube'
                required
                className='w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-purple-600 text-sm'
              />
            </div>
          </div>

          {/* Description & Duration */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
            <div className='md:col-span-2'>
              <label className='text-xs font-semibold text-gray-700 block mb-1'>Song Description</label>
              <input
                type='text'
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder='Auto-captured track description'
                className='w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-purple-600 text-sm'
              />
            </div>

            <div>
              <label className='text-xs font-semibold text-gray-700 block mb-1'>Duration (mm:ss)</label>
              <input
                type='text'
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder='e.g. 3:45'
                className='w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-purple-600 text-sm'
              />
            </div>
          </div>

          {/* Artwork Management: Auto Thumbnail + Custom Upload Option */}
          <div className='border-t border-gray-100 pt-4 mt-2'>
            <label className='text-xs font-bold text-gray-800 block mb-2'>
              Song Artwork (YouTube Thumbnail or Custom Image)
            </label>

            <div className='flex flex-col sm:flex-row items-center gap-4'>
              {/* Image Preview */}
              <div className='w-24 h-24 rounded-xl border border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 shadow-2xs relative'>
                {displayThumbnail ? (
                  <img src={displayThumbnail} alt='Cover Preview' className='w-full h-full object-cover' />
                ) : (
                  <span className='text-xs text-gray-400 text-center px-2'>No image captured</span>
                )}
                {customImagePreview && (
                  <span className='absolute bottom-1 right-1 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded'>
                    Custom
                  </span>
                )}
              </div>

              {/* Upload or Reset Buttons */}
              <div className='flex-1 flex flex-col gap-2'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <label
                    htmlFor='custom-song-image'
                    className='px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 font-semibold text-xs cursor-pointer transition shadow-2xs'
                  >
                    📷 Upload Custom Artwork
                    <input
                      id='custom-song-image'
                      type='file'
                      accept='image/*'
                      hidden
                      onChange={handleCustomImageChange}
                    />
                  </label>

                  {customImagePreview && (
                    <button
                      type='button'
                      onClick={handleResetImage}
                      className='px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition cursor-pointer'
                    >
                      ↺ Use YouTube Thumbnail
                    </button>
                  )}
                </div>
                <p className='text-[11px] text-gray-500'>
                  {customImage
                    ? `Selected file: ${customImage.name} (Will replace YouTube thumbnail)`
                    : youtubeThumbnail
                    ? 'Using high-resolution thumbnail captured from YouTube video.'
                    : 'Paste a link above to auto-capture thumbnail, or upload your own.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Player Display Mode & Optional Video Canvas */}
        <div className='bg-white p-5 rounded-2xl border border-gray-200 shadow-xs'>
          <label className='font-bold text-gray-800 text-sm block mb-3'>
            4. Player Visuals & Background Mode (Optional)
          </label>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
            {/* Display Mode */}
            <div>
              <label className='text-xs font-semibold text-gray-700 block mb-1'>Artwork Display Mode</label>
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => setImageDisplayMode('regular')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    imageDisplayMode === 'regular'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Square Box (Regular)
                </button>
                <button
                  type='button'
                  onClick={() => setImageDisplayMode('fullscreen')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    imageDisplayMode === 'fullscreen'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  🌟 Fullscreen BG
                </button>
              </div>
            </div>

            {/* Optional Video Canvas */}
            <div>
              <label className='text-xs font-semibold text-gray-700 block mb-1'>
                Video Canvas (10-15s optional looping video)
              </label>
              <input
                type='file'
                accept='video/*'
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className='w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-600 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700'
              />
            </div>
          </div>
        </div>

        {/* 5. Submit Button */}
        <button
          type='submit'
          disabled={isSubmitting || !songName.trim()}
          className='w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 hover:from-red-700 hover:via-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-base transition flex items-center justify-center gap-2 cursor-pointer shadow-md'
        >
          {isSubmitting ? (
            <>
              <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
              <span>Importing & Publishing Track...</span>
            </>
          ) : (
            <>
              <span>🚀 Import & Publish Track to App</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ImportYouTube;

