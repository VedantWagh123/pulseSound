import React, { useEffect, useState } from 'react'
import { assets } from '../../assets/assets'
import { url } from '../../App'
import { toast } from 'react-toastify'
import axios from 'axios'
import VideoCanvasTrimmerModal from '../../components/VideoCanvasTrimmerModal'

const AddSong = () => {

  const [image, setImage] = useState(false);
  const [song, setSong] = useState(false);
  const [video, setVideo] = useState(false);
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [videoEndTime, setVideoEndTime] = useState(0);
  const [videoSongDelay, setVideoSongDelay] = useState(5);
  const [isTrimmerOpen, setIsTrimmerOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [album, setAlbum] = useState("none");
  const [imageDisplayMode, setImageDisplayMode] = useState("regular"); // "regular" | "fullscreen"
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [albumData, setAlbumData] = useState([]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      formData.append("name", name);
      formData.append("desc", desc);
      formData.append("image", image);
      formData.append("audio", song);
      formData.append("album", album);
      formData.append("fullscreenImage", imageDisplayMode === "fullscreen");
      formData.append("imageDisplayMode", imageDisplayMode);
      if (video) {
        formData.append("video", video);
        formData.append("videoStartTime", videoStartTime);
        formData.append("videoEndTime", videoEndTime);
        formData.append("videoSongDelay", videoSongDelay);
      }

      const response = await axios.post(`${url}/api/song/add`, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      if (response.data.success) {
        toast.success("Song Added Successfully ⚡");
        setName("");
        setDesc("");
        setAlbum("none");
        setImage(false);
        setSong(false);
        setVideo(false);
        setVideoStartTime(0);
        setVideoEndTime(0);
        setVideoSongDelay(5);
        setImageDisplayMode("regular");
        setUploadProgress(0);
      }
      else {
        toast.error(response.data.message || "Something went wrong");
      }

      setLoading(false);

    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while adding song");
      setLoading(false);
      setUploadProgress(0);
    }
  }

  const loadAlbumData = async () => {
    try {
      const response = await axios.get(`${url}/api/album/list`);
      setAlbumData(response.data.albums);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadAlbumData();
  }, [])

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
            {uploadProgress < 100 ? `Uploading Media (${uploadProgress}%)` : '⚡ Parallel Cloud Ingestion & Edge CDN Encoding...'}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {uploadProgress < 100
              ? 'Transferring studio audio, artwork & video canvas directly to high-speed stream servers...'
              : 'Applying byte-range optimization for instantaneous 1-click mobile playback.'}
          </p>
        </div>
      </div>
    </div>
  ) : (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600'>

      <div className='flex flex-wrap gap-8 items-start'>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-sm">Upload song (Audio)</p>
          <input onChange={(e) => setSong(e.target.files[0])} type="file" id='song' accept='audio/*' hidden />
          <label htmlFor="song" className="cursor-pointer">
            <img className='w-24 h-24 object-contain rounded-lg border border-gray-300 p-2' src={song ? assets.upload_added : assets.upload_song} alt="" />
          </label>
          {song && <span className="text-[11px] text-green-700 max-w-[100px] truncate">{song.name}</span>}
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-medium text-sm">Upload Image (Artwork)</p>
          <input onChange={(e) => setImage(e.target.files[0])} type="file" id='image' accept='image/*' hidden />
          <label htmlFor="image" className="cursor-pointer">
            <img className='w-24 h-24 object-cover rounded-lg border border-gray-300' src={image ? URL.createObjectURL(image) : assets.upload_area} alt="" />
          </label>
          {image && <span className="text-[11px] text-green-700 max-w-[100px] truncate">{image.name}</span>}
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-medium text-sm">Upload Video Canvas <span className="text-xs text-gray-400 font-normal">(10-15s optional)</span></p>
          <input onChange={(e) => {
            const f = e.target.files[0];
            setVideo(f || false);
            if (f) {
              setVideoStartTime(0);
              setVideoEndTime(0);
              setVideoSongDelay(5);
            }
          }} type="file" id='video' accept='video/*' hidden />
          <label htmlFor="video" className="cursor-pointer">
            {video ? (
              <div className="w-24 h-24 border-2 border-dashed border-emerald-500 rounded-lg flex flex-col items-center justify-center bg-emerald-50 text-emerald-800 p-2 text-center text-xs font-medium">
                <span className="text-xl">🎬</span>
                <span className="truncate w-full text-[11px] mt-1">{video.name}</span>
                <span className="text-[10px] text-gray-500">{(video.size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-emerald-50/40 text-gray-500 p-2 text-center text-xs transition-colors">
                <span className="text-2xl mb-1">▶️</span>
                <span className="text-[11px] font-medium text-gray-600">Select Video</span>
              </div>
            )}
          </label>
          {video && (
            <div className="flex flex-col gap-1.5 items-start">
              <button
                type="button"
                onClick={() => setIsTrimmerOpen(true)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                title="Preview video, trim crop window, and adjust song delay"
              >
                <span>👁️ Preview & Crop</span>
              </button>
              <div className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded max-w-[170px] leading-tight">
                <p><b>Crop:</b> {videoStartTime}s → {videoEndTime > 0 ? `${videoEndTime}s` : 'Full'}</p>
                <p><b>Starts:</b> {videoSongDelay}s into song</p>
              </div>
              <button type="button" onClick={() => setVideo(false)} className="text-[11px] text-red-500 hover:underline">
                Remove video
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="font-medium text-sm">Song name</p>
        <input className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250px)] rounded' onChange={(e) => setName(e.target.value)} value={name} type="text" placeholder='Type here' required />
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="font-medium text-sm">Song description</p>
        <input className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250px)] rounded' onChange={(e) => setDesc(e.target.value)} value={desc} type="text" placeholder='Type here' required />
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="font-medium text-sm">Album</p>
        <select className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[150px] rounded' onChange={(e) => setAlbum(e.target.value)} value={album} >
          <option value="none">None</option>
          {albumData.map((item, index) => (<option key={index} value={item.name}>{item.name}</option>))}
        </select>
      </div>

      {/* Song Image Display in User Player: Regular vs Fullscreen Background */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold text-sm text-gray-800">
            Song Image Display Mode (User Player)
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose how this song's artwork appears in the user's Song Detail player screen:
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <label
            onClick={() => setImageDisplayMode('regular')}
            className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all w-[240px] ${
              imageDisplayMode === 'regular'
                ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
          >
            <input
              type="radio"
              name="imageDisplayMode"
              value="regular"
              checked={imageDisplayMode === 'regular'}
              onChange={() => setImageDisplayMode('regular')}
              className="accent-emerald-600 w-4 h-4 cursor-pointer"
            />
            <div>
              <p className="text-sm font-bold text-gray-800">Regular Artwork</p>
              <p className="text-xs text-gray-500 font-normal">Centered square cover box</p>
            </div>
          </label>

          <label
            onClick={() => setImageDisplayMode('fullscreen')}
            className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all w-[240px] ${
              imageDisplayMode === 'fullscreen'
                ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
          >
            <input
              type="radio"
              name="imageDisplayMode"
              value="fullscreen"
              checked={imageDisplayMode === 'fullscreen'}
              onChange={() => setImageDisplayMode('fullscreen')}
              className="accent-purple-600 w-4 h-4 cursor-pointer"
            />
            <div>
              <p className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                <span>🌟 Full Screen BG</span>
              </p>
              <p className="text-xs text-purple-700 font-normal">Fills full screen in background</p>
            </div>
          </label>
        </div>
      </div>

      <button className='text-base bg-black hover:bg-gray-800 text-white font-medium py-2.5 px-14 cursor-pointer rounded transition-colors' type='submit'>
        ADD SONG
      </button>

      {/* Video Preview & Trimmer Modal */}
      <VideoCanvasTrimmerModal
        isOpen={isTrimmerOpen}
        onClose={() => setIsTrimmerOpen(false)}
        videoSource={video}
        initialStartTime={videoStartTime}
        initialEndTime={videoEndTime}
        initialDelay={videoSongDelay}
        songName={name}
        onSave={({ videoStartTime: st, videoEndTime: et, videoSongDelay: sd }) => {
          setVideoStartTime(st);
          setVideoEndTime(et);
          setVideoSongDelay(sd);
          toast.success("Video crop & timing applied!");
        }}
      />
    </form>
  )
}

export default AddSong
