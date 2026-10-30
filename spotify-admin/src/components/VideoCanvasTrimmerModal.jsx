import React, { useState, useRef, useEffect } from 'react';

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const VideoCanvasTrimmerModal = ({
  isOpen,
  onClose,
  videoSource, // File | string (URL)
  initialStartTime = 0,
  initialEndTime = 0,
  initialDelay = 5,
  songName = '',
  onSave,
}) => {
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Trimming State
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [songDelay, setSongDelay] = useState(initialDelay);

  // Loop test mode
  const [isLoopTesting, setIsLoopTesting] = useState(false);

  // Create or set URL when modal opens or videoSource changes
  useEffect(() => {
    if (!isOpen || !videoSource) {
      setVideoUrl('');
      return;
    }

    let url = '';
    if (typeof videoSource === 'string') {
      url = videoSource;
    } else if (videoSource instanceof File || videoSource instanceof Blob) {
      url = URL.createObjectURL(videoSource);
    }
    setVideoUrl(url);

    setStartTime(Number(initialStartTime) || 0);
    setEndTime(Number(initialEndTime) || 0);
    setSongDelay(initialDelay !== undefined ? Number(initialDelay) : 5);
    setIsPlaying(false);
    setIsLoopTesting(false);

    return () => {
      if (url && (videoSource instanceof File || videoSource instanceof Blob)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [isOpen, videoSource, initialStartTime, initialEndTime, initialDelay]);

  // Video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const vidDur = videoRef.current.duration || 0;
      setDuration(vidDur);
      if (!endTime || endTime > vidDur) {
        setEndTime(Math.floor(vidDur));
      }
    }
  };

  // Track playback time and loop between startTime & endTime if in loop testing or playback
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    if (isLoopTesting && endTime > startTime) {
      if (curr >= endTime || curr < startTime) {
        videoRef.current.currentTime = startTime;
        videoRef.current.play();
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Jump to specific time
  const seekTo = (seconds) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, duration));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  // Set current video playback position as trim start
  const handleSetCurrentAsStart = () => {
    if (!videoRef.current) return;
    const curr = Math.floor(videoRef.current.currentTime);
    const newStart = Math.min(curr, endTime > 0 ? endTime - 1 : curr);
    setStartTime(Math.max(0, newStart));
  };

  // Set current video playback position as trim end
  const handleSetCurrentAsEnd = () => {
    if (!videoRef.current) return;
    const curr = Math.ceil(videoRef.current.currentTime);
    const newEnd = Math.max(curr, startTime + 1);
    setEndTime(Math.min(Math.floor(duration) || newEnd, newEnd));
  };

  // Test Cropped Loop
  const handleTestLoop = () => {
    if (!videoRef.current) return;
    setIsLoopTesting(true);
    videoRef.current.currentTime = startTime;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const handleStopTestLoop = () => {
    setIsLoopTesting(false);
  };

  // Presets
  const applyPresetFull = () => {
    setStartTime(0);
    setEndTime(Math.floor(duration));
  };

  const applyPreset10s = () => {
    setStartTime(0);
    setEndTime(Math.min(10, Math.floor(duration)));
  };

  const applyPreset15s = () => {
    setStartTime(0);
    setEndTime(Math.min(15, Math.floor(duration)));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        videoStartTime: Number(startTime) || 0,
        videoEndTime: Number(endTime) || 0,
        videoSongDelay: Number(songDelay) || 0,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  const effectiveEnd = endTime > 0 ? endTime : duration;
  const clipDuration = Math.max(0, effectiveEnd - startTime);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fade-in'>
      <div className='bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-6 max-h-[95vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-linear-to-r from-emerald-50 via-teal-50 to-white'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-lg shadow-sm'>
              🎬
            </div>
            <div>
              <h3 className='text-base font-bold text-gray-900 flex items-center gap-2'>
                <span>Video Canvas Preview & Trimmer</span>
                {songName && (
                  <span className='text-xs font-normal text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full truncate max-w-[200px]'>
                    {songName}
                  </span>
                )}
              </h3>
              <p className='text-xs text-gray-500'>
                Watch video, crop start/end timing, and choose when it starts in song playback.
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center transition cursor-pointer'
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className='p-6 overflow-y-auto space-y-6 flex-1'>
          {/* Top: Video Player Preview */}
          <div className='bg-gray-950 rounded-2xl p-3 border border-gray-800 shadow-inner flex flex-col items-center'>
            <div className='relative w-full max-w-md aspect-video sm:aspect-[9/14] max-h-[320px] bg-black rounded-xl overflow-hidden flex items-center justify-center'>
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className='w-full h-full object-contain'
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setIsPlaying(false);
                    if (isLoopTesting) {
                      videoRef.current.currentTime = startTime;
                      videoRef.current.play();
                    }
                  }}
                  playsInline
                />
              ) : (
                <p className='text-xs text-gray-400'>No video loaded</p>
              )}

              {/* Loop Testing Badge Overlay */}
              {isLoopTesting && (
                <div className='absolute top-3 left-3 bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow'>
                  <span className='w-2 h-2 rounded-full bg-white animate-pulse'></span>
                  <span>Testing Loop ({formatTime(startTime)} - {formatTime(endTime)})</span>
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            <div className='w-full max-w-md mt-3 space-y-2'>
              {/* Scrubber slider */}
              <input
                type='range'
                min='0'
                max={duration || 100}
                step='0.1'
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className='w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg'
              />

              <div className='flex items-center justify-between text-xs text-gray-300'>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={togglePlay}
                    className='px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer'
                  >
                    <span>{isPlaying ? '⏸️ Pause' : '▶️ Play'}</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => seekTo(startTime)}
                    className='px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium transition cursor-pointer'
                    title='Rewind to start of crop'
                  >
                    ⏪ Start ({formatTime(startTime)})
                  </button>
                </div>

                <div className='font-mono text-xs text-gray-300'>
                  <span className='text-emerald-400 font-bold'>{formatTime(currentTime)}</span> / {formatTime(duration)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Video Crop / Trimming (Kaha se Kaha tak) */}
          <div className='bg-emerald-50/60 p-4 sm:p-5 rounded-xl border border-emerald-200 space-y-4'>
            <div className='flex items-center justify-between flex-wrap gap-2'>
              <div>
                <h4 className='text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2'>
                  <span>✂️</span> 1. Video Crop / Trim (Kahan Se Kahan Tak)
                </h4>
                <p className='text-xs text-gray-600 mt-0.5'>
                  Choose exact start and end points of the video to play in the app.
                </p>
              </div>

              {/* Quick Presets */}
              <div className='flex items-center gap-1.5'>
                <span className='text-[10px] text-gray-500 font-semibold'>Presets:</span>
                <button
                  type='button'
                  onClick={applyPreset10s}
                  className='px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer'
                >
                  10s Loop
                </button>
                <button
                  type='button'
                  onClick={applyPreset15s}
                  className='px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer'
                >
                  15s Loop
                </button>
                <button
                  type='button'
                  onClick={applyPresetFull}
                  className='px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer'
                >
                  Full Video
                </button>
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-emerald-100 shadow-xs'>
              {/* Crop Start Time */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <label className='text-xs font-bold text-gray-700'>
                    Start Time (Kahan se shuru)
                  </label>
                  <span className='text-xs font-mono text-emerald-700 font-semibold'>
                    {formatTime(startTime)}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <input
                    type='number'
                    min='0'
                    max={endTime > 1 ? endTime - 1 : duration}
                    step='1'
                    value={startTime}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setStartTime(val);
                      seekTo(val);
                    }}
                    className='w-20 bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs font-bold text-gray-800 text-center outline-emerald-500'
                  />
                  <button
                    type='button'
                    onClick={handleSetCurrentAsStart}
                    className='flex-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer'
                    title='Set current playback time as crop start'
                  >
                    📍 Set Current ({formatTime(currentTime)})
                  </button>
                </div>
              </div>

              {/* Crop End Time */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <label className='text-xs font-bold text-gray-700'>
                    End Time (Kahan tak chalana)
                  </label>
                  <span className='text-xs font-mono text-emerald-700 font-semibold'>
                    {formatTime(endTime)}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <input
                    type='number'
                    min={startTime + 1}
                    max={duration || 600}
                    step='1'
                    value={endTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEndTime(val);
                      seekTo(val);
                    }}
                    className='w-20 bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs font-bold text-gray-800 text-center outline-emerald-500'
                  />
                  <button
                    type='button'
                    onClick={handleSetCurrentAsEnd}
                    className='flex-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer'
                    title='Set current playback time as crop end'
                  >
                    📍 Set Current ({formatTime(currentTime)})
                  </button>
                </div>
              </div>
            </div>

            {/* Crop Summary + Test Loop Button */}
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1'>
              <div className='text-xs text-gray-700 flex items-center gap-2'>
                <span className='w-2 h-2 rounded-full bg-emerald-500'></span>
                <span>Selected Crop Duration:</span>
                <span className='font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded'>
                  {clipDuration.toFixed(1)} seconds
                </span>
                <span className='text-[10px] text-gray-400'>({formatTime(startTime)} → {formatTime(endTime)})</span>
              </div>

              <div>
                {isLoopTesting ? (
                  <button
                    type='button'
                    onClick={handleStopTestLoop}
                    className='px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm'
                  >
                    ⏹️ Stop Loop Test
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={handleTestLoop}
                    className='px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1.5'
                  >
                    <span>🔄</span>
                    <span>Test Cropped Loop</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Song Play Delay Timing (Video kab se shuru karna hai) */}
          <div className='bg-purple-50/60 p-4 sm:p-5 rounded-xl border border-purple-200 space-y-4'>
            <div>
              <h4 className='text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2'>
                <span>⏱️</span> 2. Song Play Timing (Video kab se shuru karna hai)
              </h4>
              <p className='text-xs text-gray-600 mt-0.5'>
                Configure how many seconds after the song starts playing should this video canvas begin.
              </p>
            </div>

            <div className='bg-white p-4 rounded-xl border border-purple-100 space-y-3 shadow-xs'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-bold text-gray-700'>Start Video After:</span>
                  <input
                    type='number'
                    min='0'
                    max='60'
                    step='1'
                    value={songDelay}
                    onChange={(e) => setSongDelay(Math.max(0, parseInt(e.target.value) || 0))}
                    className='w-16 bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs font-bold text-gray-800 text-center outline-purple-500'
                  />
                  <span className='text-xs font-semibold text-gray-600'>seconds into song</span>
                </div>

                {/* Quick Delay Presets */}
                <div className='flex items-center gap-1.5'>
                  {[
                    { label: '0s (Instant)', val: 0 },
                    { label: '3s', val: 3 },
                    { label: '5s (Default)', val: 5 },
                    { label: '10s', val: 10 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type='button'
                      onClick={() => setSongDelay(p.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        songDelay === p.val
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-purple-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className='text-[11px] text-gray-500 bg-purple-50 p-2.5 rounded-lg border border-purple-200/60'>
                {songDelay === 0 ? (
                  <span>⚡ <b>Instant:</b> User jaise hi song play karega, video canvas turant shuru ho jayega.</span>
                ) : (
                  <span>✨ <b>Smooth transition:</b> Song shuru hone ke <b>{songDelay} seconds</b> baad artwork se video canvas par smooth transition hoga. Video khatam hone par wapas song artwork display hoga.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between'>
          <div className='text-xs text-gray-600 font-medium'>
            Crop: <span className='font-bold text-emerald-800'>{formatTime(startTime)} - {formatTime(endTime)} ({clipDuration.toFixed(1)}s)</span> • Delay: <span className='font-bold text-purple-800'>{songDelay}s</span>
          </div>

          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={handleSave}
              className='px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5'
            >
              <span>✓</span>
              <span>Apply Video Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCanvasTrimmerModal;

