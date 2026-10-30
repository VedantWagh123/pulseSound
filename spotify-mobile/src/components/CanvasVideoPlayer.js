import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

let VideoView = null;
let useVideoPlayer = null;

try {
  const expoVideo = require('expo-video');
  VideoView = expoVideo.VideoView;
  useVideoPlayer = expoVideo.useVideoPlayer;
} catch (e) {
  console.log('[CanvasVideo] expo-video load notice:', e?.message);
}

const NativeVideoCanvas = ({
  videoUri,
  videoStartTime = 0,
  videoEndTime = 0,
  isPlaying,
  cycleIndex = 0,
  onVideoFinished,
  onReady,
}) => {
  // Normalize URI to HTTPS for Android security compliance
  const normalizedUri = useMemo(() => {
    if (typeof videoUri === 'string') {
      return videoUri.replace(/^http:\/\//i, 'https://').trim();
    }
    return videoUri;
  }, [videoUri]);

  const startTime = typeof videoStartTime === 'number' ? Math.max(0, videoStartTime) : 0;
  const endTime = typeof videoEndTime === 'number' && videoEndTime > startTime ? videoEndTime : 0;

  const player = useVideoPlayer(normalizedUri, (p) => {
    try {
      p.loop = false; // Set to false so playToEnd fires on actual completion
      p.muted = true;
      if (startTime > 0) {
        p.currentTime = startTime;
      }
      if (isPlaying) {
        p.play();
      }
    } catch (e) {
      console.log('[CanvasVideo] Setup notice:', e?.message);
    }
  });

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const hasFiredReadyRef = useRef(false);

  const onFinishedRef = useRef(onVideoFinished);
  onFinishedRef.current = onVideoFinished;
  const hasFiredFinishedRef = useRef(false);

  // Reset completion flag and jump to trim start whenever cycleIndex or videoUri changes
  useEffect(() => {
    hasFiredReadyRef.current = false;
    hasFiredFinishedRef.current = false;
    if (player) {
      try {
        player.currentTime = startTime;
        if (isPlaying) {
          player.play();
        }
      } catch (_) {}
    }
  }, [videoUri, cycleIndex, player, startTime]);

  // Keep player playback synchronized with isPlaying state
  useEffect(() => {
    if (!player) return;
    try {
      player.loop = false;
      player.muted = true;
      if (isPlaying) {
        player.play();
      } else {
        player.pause();
      }
    } catch (e) {
      console.log('[CanvasVideo] Playback control notice:', e?.message);
    }
  }, [player, isPlaying]);

  // Ensure playback starts once video buffer is ready (fires onReady safely once)
  useEffect(() => {
    if (!player) return;
    try {
      if (player.status === 'readyToPlay' && !hasFiredReadyRef.current) {
        hasFiredReadyRef.current = true;
        onReadyRef.current?.();
      }
      const sub = player.addListener('statusChange', (payload) => {
        if (payload?.status === 'readyToPlay') {
          if (!hasFiredReadyRef.current) {
            hasFiredReadyRef.current = true;
            onReadyRef.current?.();
          }
          if (isPlaying) {
            try {
              player.play();
            } catch (_) {}
          }
        }
      });
      return () => {
        try { sub?.remove?.(); } catch (_) {}
      };
    } catch (e) {
      console.log('[CanvasVideo] Status listener notice:', e?.message);
    }
  }, [player, isPlaying]);

  // Video completion listener: Fires onVideoFinished when actual video ends
  useEffect(() => {
    if (!player) return;
    try {
      const sub = player.addListener('playToEnd', () => {
        if (!hasFiredFinishedRef.current) {
          hasFiredFinishedRef.current = true;
          onFinishedRef.current?.();
        }
      });
      return () => {
        try { sub?.remove?.(); } catch (_) {}
      };
    } catch (e) {
      console.log('[CanvasVideo] playToEnd notice:', e?.message);
    }
  }, [player]);

  // Trim End & Fallback duration check: When video reaches endTime or natural end
  useEffect(() => {
    if (!player || !isPlaying) return;
    const interval = setInterval(() => {
      try {
        const curr = player.currentTime;
        // Trim End check (kahan tak chalana)
        if (endTime > 0 && curr >= endTime) {
          if (!hasFiredFinishedRef.current) {
            hasFiredFinishedRef.current = true;
            onFinishedRef.current?.();
          }
        } else if (
          player.duration > 0 &&
          curr > 0 &&
          curr >= player.duration - 0.25 &&
          !hasFiredFinishedRef.current
        ) {
          hasFiredFinishedRef.current = true;
          onFinishedRef.current?.();
        }
      } catch (_) {}
    }, 250);

    return () => clearInterval(interval);
  }, [player, isPlaying, endTime]);

  if (!player || !VideoView) return null;

  return (
    <VideoView
      player={player}
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      showsTimecodes={false}
      requiresLinearPlayback={true}
      surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
    />
  );
};

export const CanvasVideoPlayer = ({
  videoUri,
  videoStartTime = 0,
  videoEndTime = 0,
  isPlaying,
  cycleIndex,
  onVideoFinished,
  onReady,
  style,
}) => {
  if (!videoUri || !VideoView || !useVideoPlayer) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { width: '100%', height: '100%' },
        style,
      ]}
      pointerEvents="none"
    >
      <NativeVideoCanvas
        videoUri={videoUri}
        videoStartTime={videoStartTime}
        videoEndTime={videoEndTime}
        isPlaying={isPlaying}
        cycleIndex={cycleIndex}
        onVideoFinished={onVideoFinished}
        onReady={onReady}
      />
    </View>
  );
};

export default CanvasVideoPlayer;
