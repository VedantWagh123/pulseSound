import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { url } from '../../App';
import { toast } from 'react-toastify';
import VideoCanvasTrimmerModal from '../../components/VideoCanvasTrimmerModal';

const ListSong = () => {
  const [data, setData] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [targetPlaylistId, setTargetPlaylistId] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [modalVideoStartTime, setModalVideoStartTime] = useState(0);
  const [modalVideoEndTime, setModalVideoEndTime] = useState(0);
  const [modalVideoSongDelay, setModalVideoSongDelay] = useState(5);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Video preview trimmer state
  const [previewSong, setPreviewSong] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchSongs = async () => {
    try {
      const response = await axios.get(`${url}/api/song/list`);
      if (response.data.success) {
        setData(response.data.songs);
      }
    } catch (error) {
      toast.error("Error occurred while fetching songs");
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await axios.get(`${url}/api/playlist/list`);
      if (response.data.success) {
        setPlaylists(response.data.playlists || []);
        if (response.data.playlists && response.data.playlists.length > 0) {
          setTargetPlaylistId(response.data.playlists[0]._id);
        }
      }
    } catch (error) {
      console.log("Error loading playlists:", error.message);
    }
  };

  const removeSong = async (id) => {
    try {
      const response = await axios.post(`${url}/api/song/remove`, { id });
      if (response.data.success) {
        toast.success(response.data.message);
        await fetchSongs();
        await fetchPlaylists();
      }
    } catch (error) {
      toast.error("Error occurred while removing song");
    }
  };

  const openAddToPlaylistModal = (song) => {
    setSelectedSong(song);
    setVideoFile(null);
    setModalVideoStartTime(song.videoStartTime || 0);
    setModalVideoEndTime(song.videoEndTime || 0);
    setModalVideoSongDelay(song.videoSongDelay ?? 5);
    if (playlists.length > 0 && !targetPlaylistId) {
      setTargetPlaylistId(playlists[0]._id);
    }
    setIsModalOpen(true);
  };

  const handleAddToPlaylistSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSong || !targetPlaylistId) {
      toast.error("Please select a valid playlist");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("songId", selectedSong._id || selectedSong.id);
      formData.append("playlistId", targetPlaylistId);

      if (videoFile) {
        formData.append("video", videoFile);
      }
      formData.append("videoStartTime", modalVideoStartTime);
      formData.append("videoEndTime", modalVideoEndTime);
      formData.append("videoSongDelay", modalVideoSongDelay);

      const response = await axios.post(`${url}/api/playlist/add-song-to-playlist`, formData);

      if (response.data.success) {
        toast.success(response.data.message || "Song added to playlist successfully!");
        setIsModalOpen(false);
        setSelectedSong(null);
        setVideoFile(null);
        await fetchSongs();
        await fetchPlaylists();
      } else {
        toast.error(response.data.message || "Could not add song to playlist");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to add song to playlist");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchSongs();
    fetchPlaylists();
  }, []);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4 mr-5">
        <p className="font-semibold text-lg text-gray-800">All Songs List</p>
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          Total: {data.length} songs
        </span>
      </div>

      <div>
        <div className="sm:grid hidden grid-cols-[0.5fr_1.8fr_1.2fr_0.8fr_1.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100 font-semibold text-gray-700">
          <b>Image</b>
          <b>Name</b>
          <b>Album</b>
          <b>Duration</b>
          <b>Actions</b>
        </div>

        {data.map((item, index) => {
          return (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[0.5fr_1.8fr_1.2fr_0.8fr_1.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 hover:bg-gray-50 transition-colors"
            >
              <img className="w-12 h-12 object-cover rounded shadow-sm" src={item.image} alt="" />
              
              <div className="flex flex-col gap-1">
                <span className="font-medium text-gray-800">{item.name}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Artwork Image Attached Status */}
                  {item.image ? (
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded-full border border-purple-200 inline-flex items-center gap-1">
                      🖼️ Image Attached
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full border border-gray-200 inline-flex items-center gap-1">
                      🚫 No Image
                    </span>
                  )}

                  {/* Canvas Video Attached Status */}
                  {item.video ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewSong(item);
                        setPreviewOpen(true);
                      }}
                      className="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-300 inline-flex items-center gap-1 cursor-pointer transition shadow-xs"
                      title="Watch video, crop start/end, and adjust song delay"
                    >
                      <span>🎬 Video Canvas Attached</span>
                      <span className="underline text-[9px]">(👁️ Watch/Crop)</span>
                    </button>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full border border-gray-200 inline-flex items-center gap-1">
                      🚫 No Video
                    </span>
                  )}

                  {item.fullscreenImage || item.imageDisplayMode === 'fullscreen' ? (
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded-full border border-purple-300 inline-flex items-center gap-1">
                      🌟 Fullscreen BG
                    </span>
                  ) : null}
                  <span className="text-[11px] text-gray-500 truncate max-w-[200px]">
                    {item.desc}
                  </span>
                </div>
              </div>

              <p className="text-gray-600">{item.album}</p>
              <p className="text-gray-600">{item.duration}</p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openAddToPlaylistModal(item)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                  title="Add to existing playlist"
                >
                  <span>➕</span>
                  <span>Add to Playlist</span>
                </button>

                <button
                  type="button"
                  onClick={() => removeSong(item._id)}
                  className="text-red-500 hover:text-red-700 font-bold px-2 py-1 hover:bg-red-50 rounded transition-all cursor-pointer"
                  title="Delete song"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add To Playlist Modal */}
      {isModalOpen && selectedSong && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                <span>🎵</span> Add Song to Playlist
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddToPlaylistSubmit} className="flex flex-col gap-4">
              {/* Song Preview Card */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <img
                  src={selectedSong.image}
                  alt={selectedSong.name}
                  className="w-14 h-14 object-cover rounded-md shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {selectedSong.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {selectedSong.album} • {selectedSong.artist || "Pulse Artist"}
                  </p>
                  {selectedSong.video && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full inline-block mt-1">
                      🎬 Current Video Canvas Active
                    </span>
                  )}
                </div>
              </div>

              {/* Select Existing Playlist Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Choose Existing Playlist *
                </label>
                {playlists.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    No playlists found. Please create a playlist first from the "Add Playlist" tab.
                  </p>
                ) : (
                  <select
                    className="border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-emerald-500 cursor-pointer"
                    value={targetPlaylistId}
                    onChange={(e) => setTargetPlaylistId(e.target.value)}
                    required
                  >
                    {playlists.map((pl) => (
                      <option key={pl._id} value={pl._id}>
                        {pl.name} ({pl.songs?.length || 0} tracks)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Attach / Update Video Canvas Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Attach / Update Video Canvas</span>
                  <span className="text-[11px] text-gray-400 font-normal">Optional (10-15s MP4/WebM)</span>
                </label>
                
                <input
                  type="file"
                  id="playlistSongVideo"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files[0])}
                  hidden
                />
                <label
                  htmlFor="playlistSongVideo"
                  className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-lg p-3 text-center cursor-pointer transition-colors bg-gray-50 hover:bg-emerald-50/30 flex flex-col items-center justify-center gap-1"
                >
                  {videoFile ? (
                    <div className="flex items-center gap-2 text-emerald-700 text-xs font-medium">
                      <span>🎬</span>
                      <span className="truncate max-w-[220px]">{videoFile.name}</span>
                      <span className="text-[10px] text-gray-500">
                        ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xs flex flex-col items-center">
                      <span className="text-xl mb-0.5">📹</span>
                      <span className="font-medium text-gray-700">Select Video File</span>
                      <span className="text-[10px] text-gray-400">Plays full-screen canvas loop during playback</span>
                    </div>
                  )}
                </label>
                {videoFile && (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewSong({
                          name: selectedSong?.name,
                          video: videoFile,
                          videoStartTime: modalVideoStartTime,
                          videoEndTime: modalVideoEndTime,
                          videoSongDelay: modalVideoSongDelay,
                        });
                        setPreviewOpen(true);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <span>👁️ Preview & Crop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoFile(null)}
                      className="text-[11px] text-red-500 hover:underline"
                    >
                      Remove selected video
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 mt-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || playlists.length === 0}
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add to Playlist</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview & Trimmer Modal */}
      <VideoCanvasTrimmerModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        videoSource={previewSong?.video}
        initialStartTime={previewSong?.videoStartTime || 0}
        initialEndTime={previewSong?.videoEndTime || 0}
        initialDelay={previewSong?.videoSongDelay ?? 5}
        songName={previewSong?.name}
        onSave={({ videoStartTime: st, videoEndTime: et, videoSongDelay: sd }) => {
          setModalVideoStartTime(st);
          setModalVideoEndTime(et);
          setModalVideoSongDelay(sd);
          toast.success("Video crop & song timing applied!");
        }}
      />
    </div>
  );
};

export default ListSong;
