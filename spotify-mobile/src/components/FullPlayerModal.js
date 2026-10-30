import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  PanResponder,
  Share,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import CanvasVideoPlayer from './CanvasVideoPlayer';

// =========================================================================
// Real-Time Audio Spectrum Bars for HUD Controls Area
// =========================================================================
const AudioSpectrumWaveform = React.memo(({ isPlaying, energy = 0.2, beatCount = 0 }) => {
  const barCount = 18;
  const barAnims = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(6))
  ).current;

  useEffect(() => {
    if (!isPlaying) {
      barAnims.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 5,
          duration: 350,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    const animations = barAnims.map((anim, i) => {
      const harmonic = Math.sin((i / barCount) * Math.PI);
      const targetHeight = Math.max(6, Math.min(26, harmonic * (18 + energy * 20)));
      return Animated.timing(anim, {
        toValue: targetHeight,
        duration: 95,
        easing: Easing.linear,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [isPlaying, energy, beatCount]);

  return (
    <View style={styles.waveformContainer}>
      {barAnims.map((anim, i) => {
        const barColor =
          i < 6 ? '#EC4899' : i < 12 ? '#A855F7' : '#38BDF8';
        return (
          <Animated.View
            key={i}
            style={[
              styles.waveBar,
              {
                height: anim,
                backgroundColor: barColor,
                opacity: isPlaying ? 0.9 : 0.3,
              },
            ]}
          />
        );
      })}
    </View>
  );
});

// =========================================================================
// Smooth Right-to-Left Marquee Song Title Component
// Continuous seamless linear horizontal scrolling for long titles.
// Unconstrained intrinsic measurement via horizontal ScrollView.
// Never permanently truncates with ellipsis; short titles stay static.
// =========================================================================
const MarqueeSongTitle = React.memo(({ text, style }) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const animLoopRef = useRef(null);

  // Reset measurements & animation when text changes
  useEffect(() => {
    setTextWidth(0);
    scrollAnim.setValue(0);
  }, [text, scrollAnim]);

  const isOverflowing = containerWidth > 0 && textWidth > containerWidth + 4;
  const gap = 44;
  const scrollDistance = textWidth + gap;
  // Dynamic smooth duration proportional to distance (~36px/sec reading speed)
  const duration = Math.max(3500, (scrollDistance / 36) * 1000);

  useEffect(() => {
    if (animLoopRef.current) {
      animLoopRef.current.stop();
      animLoopRef.current = null;
    }
    scrollAnim.setValue(0);

    if (!isOverflowing || textWidth === 0) return;

    // Continuous linear right-to-left loop with seamless reset
    const animation = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -scrollDistance,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animLoopRef.current = animation;
    animation.start();

    return () => {
      if (animLoopRef.current) {
        animLoopRef.current.stop();
        animLoopRef.current = null;
      }
    };
  }, [text, isOverflowing, scrollDistance, duration, scrollAnim, textWidth]);

  return (
    <View
      style={styles.marqueeContainer}
      onLayout={(e) => {
        const w = Math.floor(e.nativeEvent.layout.width);
        if (w > 0 && w !== containerWidth) {
          setContainerWidth(w);
        }
      }}
    >
      {/* Invisible horizontal canvas to measure TRUE unconstrained pixel width without clipping */}
      <View
        pointerEvents="none"
        style={styles.hiddenMeasurerContainer}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
        >
          <Text
            style={[style, { flexShrink: 0 }]}
            onLayout={(e) => {
              const measured = Math.ceil(e.nativeEvent.layout.width);
              if (measured > 0) {
                setTextWidth(measured);
              }
            }}
          >
            {text}
          </Text>
        </ScrollView>
      </View>

      {/* Render seamless infinite marquee when overflowing, or clean static text when fitting */}
      {isOverflowing ? (
        <Animated.View
          style={[
            styles.marqueeRow,
            {
              width: (textWidth + gap) * 2,
              transform: [{ translateX: scrollAnim }],
            },
          ]}
        >
          <View style={{ width: textWidth }}>
            <Text style={[style, { flexShrink: 0 }]}>
              {text}
            </Text>
          </View>
          <View style={{ width: gap }} />
          <View style={{ width: textWidth }}>
            <Text style={[style, { flexShrink: 0 }]}>
              {text}
            </Text>
          </View>
        </Animated.View>
      ) : (
        <Text numberOfLines={1} style={style}>
          {text}
        </Text>
      )}
    </View>
  );
});

// =========================================================================
// Main FullPlayerModal Component
// =========================================================================
export const FullPlayerModal = () => {
  const { width, height } = useWindowDimensions();
  // Slightly larger, prominent and centered artwork sizing
  const artworkSize = Math.min(width * 0.82, height * 0.36, 320);

  const {
    currentTrack,
    isPlaying,
    playbackPosition,
    playbackDuration,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    formatTime,
    isFullPlayerOpen,
    setIsFullPlayerOpen,
    isShuffle,
    setIsShuffle,
    isRepeat,
    setIsRepeat,
    isSongLiked,
    toggleLikeSong,
    setAddToPlaylistSong,
    setIsEqualizerOpen,
    isTrackDownloaded,
    isTrackCached,
    isTrackDownloading,
    downloadSong,
    exportSongToDevice,
    removeDownload,
    audioEnergy,
    bassEnergy,
    midEnergy,
    trebleEnergy,
    beatCount,
  } = usePlayer();

  // Action Menu Sheet and Song Info state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSongInfoOpen, setIsSongInfoOpen] = useState(false);

  // Screen content is kept permanently visible (no auto-hide removal)
  const resetAutoHideTimer = useCallback(() => {}, []);

  // Determine if track has video
  const hasVideo = Boolean(
    currentTrack?.video &&
    typeof currentTrack.video === 'string' &&
    currentTrack.video.trim().length > 0
  );

  // Fullscreen vs Regular Artwork mode (Admin configured)
  const isFullscreenCover = Boolean(
    currentTrack?.fullscreenImage === true ||
    currentTrack?.fullscreenImage === 'true' ||
    currentTrack?.imageDisplayMode === 'fullscreen'
  );

  // Clean Album metadata: hides "None" and prevents empty layout gaps
  const albumName = useMemo(() => {
    if (!currentTrack?.album) return null;
    const trimmed = String(currentTrack.album).trim();
    if (trimmed.toLowerCase() === 'none' || trimmed.length === 0) return null;
    return trimmed;
  }, [currentTrack?.album]);

  // =========================================================================
  // SIMPLE SONG & VIDEO PLAYBACK SEQUENCE:
  // 1. When user plays a song:
  //    - Display song image (artwork) simply.
  //    - Screen content (title, artist, controls, seekbar) is ALWAYS visible.
  // 2. If song has a video:
  //    - After 5 seconds, video starts playing smoothly.
  //    - Video plays until it finishes (for its full actual duration).
  // 3. After video finishes:
  //    - Smoothly return to the simple song image.
  // =========================================================================
  const [sequencePhase, setSequencePhase] = useState('COVER');
  const phaseRef = useRef('COVER');
  const sequenceTimerRef = useRef(null);
  const phaseRemainingMsRef = useRef(5000);
  const phaseStartTimeRef = useRef(Date.now());
  const videoCycleRef = useRef(0);
  const videoHasPlayedRef = useRef(false);

  // Animated values
  const artworkFadeAnim = useRef(new Animated.Value(1)).current;
  const videoOpacityAnim = useRef(new Animated.Value(0)).current;

  // Artwork entrance and beat transients
  const artworkEntranceScale = useRef(new Animated.Value(1)).current;
  const artworkEntranceOpacity = useRef(new Animated.Value(1)).current;
  const artworkBeatPulse = useRef(new Animated.Value(1)).current;

  // Horizontal Swipe Navigation Animated Value
  const swipeX = useRef(new Animated.Value(0)).current;

  // Clear sequence timers safely
  const clearSequenceTimer = useCallback(() => {
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  }, []);

  // Forward declarations
  const triggerVideoRef = useRef(null);
  const handleVideoFinishedRef = useRef(null);

  // Start sequence phase
  const startPhase = useCallback((nextPhase, durationMs = 5000) => {
    clearSequenceTimer();
    phaseRef.current = nextPhase;
    setSequencePhase(nextPhase);
    phaseRemainingMsRef.current = durationMs;
    phaseStartTimeRef.current = Date.now();

    if (nextPhase === 'COVER') {
      // Show song artwork simply
      Animated.parallel([
        Animated.timing(artworkFadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(videoOpacityAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      // If track has video and hasn't played video yet for this song session:
      if (hasVideo && !videoHasPlayedRef.current && isPlaying) {
        sequenceTimerRef.current = setTimeout(() => {
          triggerVideoRef.current?.();
        }, durationMs);
      }
    } else if (nextPhase === 'VIDEO') {
      videoCycleRef.current += 1;
      videoHasPlayedRef.current = true;

      Animated.parallel([
        Animated.timing(artworkFadeAnim, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(videoOpacityAnim, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Fallback safety timeout in case video doesn't emit finished
      sequenceTimerRef.current = setTimeout(() => {
        handleVideoFinishedRef.current?.();
      }, 60000);
    }
  }, [clearSequenceTimer, hasVideo, isPlaying, artworkFadeAnim, videoOpacityAnim]);

  triggerVideoRef.current = () => {
    if (hasVideo) {
      startPhase('VIDEO', 0);
    } else {
      startPhase('COVER', 0);
    }
  };

  handleVideoFinishedRef.current = () => {
    if (phaseRef.current === 'VIDEO') {
      // Video finished -> return to simple song image
      clearSequenceTimer();
      startPhase('COVER', 0);
    }
  };

  // Video Ready Callback
  const [isVideoReady, setIsVideoReady] = useState(false);
  const handleVideoReady = useCallback(() => {
    setIsVideoReady((prev) => (prev ? prev : true));
  }, []);

  // Configured Video Delay (kab se shuru karna hai in seconds -> ms)
  const videoDelayMs = useMemo(() => {
    const sec = typeof currentTrack?.videoSongDelay === 'number'
      ? Math.max(0, currentTrack.videoSongDelay)
      : 5;
    return sec * 1000;
  }, [currentTrack?.videoSongDelay]);

  // Synchronize Play / Pause with Video Delay Timer
  useEffect(() => {
    if (!isPlaying) {
      clearSequenceTimer();
      const elapsed = Date.now() - phaseStartTimeRef.current;
      phaseRemainingMsRef.current = Math.max(0, phaseRemainingMsRef.current - elapsed);
    } else {
      phaseStartTimeRef.current = Date.now();
      const remaining = phaseRemainingMsRef.current > 0 ? phaseRemainingMsRef.current : videoDelayMs;

      if (phaseRef.current === 'COVER' && hasVideo && !videoHasPlayedRef.current) {
        sequenceTimerRef.current = setTimeout(() => {
          triggerVideoRef.current?.();
        }, remaining);
      }
    }

    return () => {
      clearSequenceTimer();
    };
  }, [isPlaying, hasVideo, clearSequenceTimer, videoDelayMs]);

  // Track Change: Reset video played state and start Step 1 fresh
  const trackId = currentTrack?._id || currentTrack?.id;
  useEffect(() => {
    clearSequenceTimer();
    videoHasPlayedRef.current = false;
    swipeX.setValue(0);
    phaseRemainingMsRef.current = videoDelayMs;
    phaseStartTimeRef.current = Date.now();
    startPhase('COVER', videoDelayMs);

    // Artwork entrance animation
    artworkEntranceScale.setValue(0.92);
    artworkEntranceOpacity.setValue(0.35);
    Animated.parallel([
      Animated.spring(artworkEntranceScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(artworkEntranceOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [trackId, clearSequenceTimer, startPhase, swipeX, artworkEntranceScale, artworkEntranceOpacity]);

  // Sub-Bass Beat Pulse on detected transients
  useEffect(() => {
    if (!isPlaying || beatCount === 0) {
      Animated.spring(artworkBeatPulse, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.sequence([
      Animated.timing(artworkBeatPulse, {
        toValue: 1.036 + (bassEnergy || 0.2) * 0.03,
        duration: 70,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(artworkBeatPulse, {
        toValue: 1.0,
        friction: 5,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatCount, isPlaying, bassEnergy, artworkBeatPulse]);

  // =========================================================================
  // Horizontal Swipe Navigation PanResponder
  // Swipe LEFT  -> prevTrack()
  // Swipe RIGHT -> nextTrack()
  // Smooth horizontal slide animation with release springs
  // =========================================================================
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        return (
          Math.abs(dx) > 16 &&
          Math.abs(dx) > Math.abs(dy) * 1.5 &&
          phaseRef.current === 'COVER'
        );
      },
      onPanResponderGrant: () => {
        resetAutoHideTimer();
      },
      onPanResponderMove: (evt, gestureState) => {
        swipeX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, vx } = gestureState;
        // Swipe LEFT (dx < 0): Play previous song
        if (dx < -55 || (dx < -25 && vx < -0.35)) {
          Animated.timing(swipeX, {
            toValue: -width,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            prevTrack();
            swipeX.setValue(width);
            Animated.spring(swipeX, {
              toValue: 0,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }).start();
          });
        }
        // Swipe RIGHT (dx > 0): Play next song
        else if (dx > 55 || (dx > 25 && vx > 0.35)) {
          Animated.timing(swipeX, {
            toValue: width,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            nextTrack();
            swipeX.setValue(-width);
            Animated.spring(swipeX, {
              toValue: 0,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }).start();
          });
        }
        // Threshold not reached: spring back to center
        else {
          Animated.spring(swipeX, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  }, [width, prevTrack, nextTrack, resetAutoHideTimer, swipeX]);

  // Native Share Functionality
  const handleShare = async () => {
    resetAutoHideTimer();
    if (!currentTrack) return;
    try {
      const artist = currentTrack.desc || currentTrack.artist || 'Unknown Artist';
      const shareUrl = currentTrack.audio || currentTrack.image || '';
      const message = `🎵 Check out "${currentTrack.name}" by ${artist} on Spotify!\n${shareUrl}`;
      await Share.share({
        title: currentTrack.name,
        message,
        url: shareUrl || undefined,
      });
    } catch (error) {
      if (error?.message !== 'User did not share') {
        Alert.alert('Share Song', `"${currentTrack.name}" by ${currentTrack.desc || 'Unknown Artist'}`);
      }
    }
  };

  if (!currentTrack) return null;

  const isLiked = isSongLiked
    ? isSongLiked(trackId) || isSongLiked(currentTrack.id)
    : false;
  const isDownloaded = isTrackDownloaded ? isTrackDownloaded(trackId) : false;
  const isCached = !isDownloaded && isTrackCached ? isTrackCached(trackId) : false;
  const isDownloading = isTrackDownloading ? isTrackDownloading(trackId) : false;

  const currentTrackImage =
    typeof currentTrack.image === 'string'
      ? { uri: currentTrack.image }
      : currentTrack.image?.uri
      ? { uri: currentTrack.image.uri }
      : currentTrack.image;

  const handleDownloadToggle = () => {
    resetAutoHideTimer();
    if (!currentTrack) return;
    if (isDownloaded) {
      Alert.alert(
        'Offline Song',
        `"${currentTrack.name}" is saved on your device for offline playback. Would you like to remove it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove Download',
            style: 'destructive',
            onPress: () => removeDownload && removeDownload(trackId),
          },
        ]
      );
    } else if (isCached) {
      Alert.alert(
        '⚡ Auto-Cached Track',
        `"${currentTrack.name}" was automatically cached in the background and is ready to play offline! Would you like to pin it permanently so it never gets evicted?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pin Permanently',
            onPress: () => downloadSong && downloadSong(currentTrack),
          },
        ]
      );
    } else if (!isDownloading) {
      downloadSong && downloadSong(currentTrack);
    }
  };

  const progressPercent =
    playbackDuration > 0
      ? Math.min((playbackPosition / playbackDuration) * 100, 100)
      : 0;

  const handleSeekPress = (event) => {
    resetAutoHideTimer();
    const { locationX } = event.nativeEvent;
    const barWidth = width - 48;
    const percent = Math.max(0, Math.min(locationX / barWidth, 1));
    const targetMillis = percent * playbackDuration;
    seekTo(targetMillis);
  };

  // Combined artwork scale & transforms
  const artworkTransform = [
    { scale: Animated.multiply(artworkEntranceScale, artworkBeatPulse) },
    { translateX: swipeX },
    {
      scale: swipeX.interpolate({
        inputRange: [-width, 0, width],
        outputRange: [0.88, 1, 0.88],
        extrapolate: 'clamp',
      }),
    },
  ];

  const finalArtworkOpacity = Animated.multiply(
    artworkEntranceOpacity,
    artworkFadeAnim
  );

  return (
    <Modal
      visible={isFullPlayerOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setIsFullPlayerOpen(false)}
    >
      <View style={styles.container}>
        {/* Base Dark Theme Layer */}
        <LinearGradient
          colors={['#080914', '#04050A', '#020205']}
          style={StyleSheet.absoluteFill}
        />

        {/* =============================================================== */}
        {/* Fullscreen Song Image Background (Admin configured Fullscreen)  */}
        {/* =============================================================== */}
        {isFullscreenCover && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: finalArtworkOpacity,
                zIndex: 0,
              },
            ]}
          >
            <Image
              source={currentTrackImage}
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
              resizeMode="cover"
            />
            {/* Atmospheric dark gradient vignette for readable controls */}
            <LinearGradient
              colors={[
                'rgba(3, 4, 10, 0.70)',
                'rgba(3, 4, 10, 0.20)',
                'rgba(3, 4, 10, 0.50)',
                'rgba(2, 3, 8, 0.94)',
              ]}
              locations={[0, 0.28, 0.65, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}

        {/* =============================================================== */}
        {/* Canvas Video Layer (Plays after 5s until video finishes)        */}
        {/* =============================================================== */}
        {hasVideo && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: videoOpacityAnim,
                zIndex: 1,
              },
            ]}
          >
            <CanvasVideoPlayer
              videoUri={currentTrack.video}
              videoStartTime={currentTrack.videoStartTime || 0}
              videoEndTime={currentTrack.videoEndTime || 0}
              isPlaying={isPlaying && sequencePhase === 'VIDEO'}
              cycleIndex={videoCycleRef.current}
              onReady={handleVideoReady}
              onVideoFinished={() => handleVideoFinishedRef.current?.()}
            />
            <LinearGradient
              colors={[
                'rgba(2, 3, 6, 0.45)',
                'rgba(2, 3, 6, 0.15)',
                'rgba(2, 3, 6, 0.55)',
                'rgba(2, 3, 6, 0.92)',
              ]}
              locations={[0, 0.25, 0.65, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}

        {/* =============================================================== */}
        {/* Main Player Foreground Controls & Centered Artwork Stage        */}
        {/* Screen content is ALWAYS VISIBLE and NEVER REMOVED             */}
        {/* =============================================================== */}
        <View style={[styles.safeArea, { zIndex: 10 }]} pointerEvents="box-none">
          {/* Header: Clean, balanced, removes "None" completely */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setIsFullPlayerOpen(false)}
              style={styles.headerBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-down" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <Text
                style={[
                  styles.headerSubtitle,
                  !albumName && { marginBottom: 0, fontSize: 11 },
                ]}
              >
                NOW PLAYING
              </Text>
              {albumName ? (
                <Text numberOfLines={1} style={styles.headerTitle}>
                  {albumName}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => {
                setIsMenuOpen(true);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Central Song Artwork Stage (Sharp, Centered, Swipe-Responsive) */}
          <View
            style={styles.artworkSection}
            pointerEvents="box-none"
            {...panResponder.panHandlers}
          >
            {!isFullscreenCover ? (
              <Animated.View
                style={[
                  styles.artworkShadow,
                  {
                    width: artworkSize,
                    height: artworkSize,
                    opacity: finalArtworkOpacity,
                    transform: artworkTransform,
                  },
                ]}
                pointerEvents="none"
              >
                <Image
                  source={currentTrackImage}
                  style={styles.artwork}
                  resizeMode="cover"
                />
              </Animated.View>
            ) : (
              /* Fullscreen Image Active: Center remains open & uncluttered, swipe gesture preserved */
              <View
                style={{
                  width: '100%',
                  minHeight: artworkSize,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                pointerEvents="none"
              />
            )}
          </View>

          {/* Bottom Controls Group (Always visible, never removed) */}
          <View style={styles.bottomControlsGroup}>
              {/* Real-Time Audio Spectrum Bars */}
              <AudioSpectrumWaveform
                isPlaying={isPlaying}
                energy={audioEnergy}
                beatCount={beatCount}
              />

              {/* Track Info & Like / Equalizer Controls */}
              <View style={styles.trackInfoRow}>
                <View style={styles.titleArtist}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ flex: 1, overflow: 'hidden' }}>
                      <MarqueeSongTitle
                        text={currentTrack.name}
                        style={styles.trackTitle}
                      />
                    </View>
                    {isDownloaded ? (
                      <Ionicons name="arrow-down-circle" size={17} color="#10B981" />
                    ) : isCached ? (
                      <Ionicons name="flash" size={16} color="#C084FC" />
                    ) : null}
                  </View>
                  <Text numberOfLines={1} style={styles.trackArtist}>
                    {currentTrack.desc}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {/* Like Button */}
                  <TouchableOpacity
                    onPress={() => {
                      resetAutoHideTimer();
                      toggleLikeSong && toggleLikeSong(trackId);
                    }}
                    style={styles.iconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityLabel="Like song"
                  >
                    <Ionicons
                      name={isLiked ? 'heart' : 'heart-outline'}
                      size={25}
                      color={isLiked ? '#F43F5E' : '#94A3B8'}
                    />
                  </TouchableOpacity>

                  {/* Offline Download Button */}
                  <TouchableOpacity
                    onPress={handleDownloadToggle}
                    style={styles.iconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityLabel={
                      isDownloaded
                        ? 'Remove offline download'
                        : isCached
                        ? 'Cached offline - Tap to pin'
                        : 'Download offline'
                    }
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : isDownloaded ? (
                      <Ionicons name="checkmark-circle" size={25} color="#10B981" />
                    ) : isCached ? (
                      <Ionicons name="flash" size={23} color="#C084FC" />
                    ) : (
                      <Ionicons
                        name="arrow-down-circle-outline"
                        size={25}
                        color="#94A3B8"
                      />
                    )}
                  </TouchableOpacity>

                  {/* Audio Customizer & Equalizer Button */}
                  <TouchableOpacity
                    onPress={() => {
                      resetAutoHideTimer();
                      setIsEqualizerOpen && setIsEqualizerOpen(true);
                    }}
                    style={styles.equalizerBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityLabel="Audio Customizer & Equalizer"
                  >
                    <LinearGradient
                      colors={[
                        'rgba(168, 85, 247, 0.35)',
                        'rgba(236, 72, 153, 0.35)',
                      ]}
                      style={styles.equalizerGradientIcon}
                    >
                      <Ionicons name="options-outline" size={19} color="#C084FC" />
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Add to Playlist Button */}
                  <TouchableOpacity
                    onPress={() => {
                      resetAutoHideTimer();
                      setAddToPlaylistSong && setAddToPlaylistSong(currentTrack);
                    }}
                    style={styles.iconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityLabel="Add to playlist"
                  >
                    <Ionicons name="add-circle-outline" size={26} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Seek Bar */}
              <View style={styles.seekSection}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={handleSeekPress}
                  style={styles.seekBarTouchArea}
                >
                  <View style={styles.seekBarTrack}>
                    <LinearGradient
                      colors={['#8B5CF6', '#EC4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.seekBarFill, { width: `${progressPercent}%` }]}
                    />
                    <View style={[styles.seekThumb, { left: `${progressPercent}%` }]} />
                  </View>
                </TouchableOpacity>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
                  <Text style={styles.timeText}>{formatTime(playbackDuration)}</Text>
                </View>
              </View>

              {/* Playback Controls (Well spaced & responsive) */}
              <View style={styles.controlsRow}>
                <TouchableOpacity
                  onPress={() => {
                    resetAutoHideTimer();
                    setIsShuffle(!isShuffle);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="shuffle"
                    size={23}
                    color={isShuffle ? '#A855F7' : '#64748B'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    resetAutoHideTimer();
                    prevTrack();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="play-skip-back" size={30} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    resetAutoHideTimer();
                    togglePlayPause();
                  }}
                  style={styles.mainPlayBtn}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#D946EF', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.mainPlayGradient}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={30}
                      color="#FFFFFF"
                      style={{ marginLeft: isPlaying ? 0 : 3 }}
                    />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    resetAutoHideTimer();
                    nextTrack();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="play-skip-forward" size={30} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    resetAutoHideTimer();
                    setIsRepeat(!isRepeat);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="repeat"
                    size={23}
                    color={isRepeat ? '#A855F7' : '#64748B'}
                  />
                </TouchableOpacity>
              </View>

              {/* Bottom Utility Bar */}
              <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.bottomBtn} onPress={resetAutoHideTimer}>
                  <Ionicons name="radio-outline" size={18} color="#A855F7" />
                  <Text style={styles.deviceText}>High Fidelity Audio</Text>
                </TouchableOpacity>

                <View style={styles.bottomActions}>
                  {/* Share Icon (Fully Functional) */}
                  <TouchableOpacity
                    style={styles.bottomIconBtn}
                    onPress={handleShare}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="share-social-outline" size={20} color="#C084FC" />
                  </TouchableOpacity>

                  {/* Bookmark / Playlist */}
                  <TouchableOpacity
                    style={styles.bottomIconBtn}
                    onPress={() => {
                      resetAutoHideTimer();
                      setAddToPlaylistSong(currentTrack);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="bookmark-outline" size={20} color="#C084FC" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* =============================================================== */}
          {/* 4. Three-Dot Action Sheet Menu Modal                            */}
          {/* =============================================================== */}
          <Modal
            visible={isMenuOpen}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setIsMenuOpen(false)}
          >
            <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.menuSheet}>
                    {/* Header Track Preview */}
                    <View style={styles.menuTrackHeader}>
                      <Image source={currentTrackImage} style={styles.menuTrackThumb} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text numberOfLines={1} style={styles.menuTrackTitle}>
                          {currentTrack.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.menuTrackArtist}>
                          {currentTrack.desc || 'Unknown Artist'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.menuDivider} />

                    {/* Action Items */}
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setIsMenuOpen(false);
                        toggleLikeSong && toggleLikeSong(trackId);
                      }}
                    >
                      <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isLiked ? '#F43F5E' : '#C084FC'}
                      />
                      <Text style={styles.menuItemText}>
                        {isLiked ? 'Remove from Liked Songs' : 'Like this Song'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setIsMenuOpen(false);
                        setAddToPlaylistSong && setAddToPlaylistSong(currentTrack);
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={22} color="#C084FC" />
                      <Text style={styles.menuItemText}>Add to Playlist</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setIsMenuOpen(false);
                        setIsEqualizerOpen && setIsEqualizerOpen(true);
                      }}
                    >
                      <Ionicons name="options-outline" size={22} color="#C084FC" />
                      <Text style={styles.menuItemText}>
                        Audio Customizer & Equalizer
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setIsMenuOpen(false);
                        handleDownloadToggle();
                      }}
                    >
                      <Ionicons
                        name={
                          isDownloaded
                            ? 'checkmark-circle'
                            : isCached
                            ? 'flash'
                            : 'arrow-down-circle-outline'
                        }
                        size={22}
                        color={
                          isDownloaded
                            ? '#10B981'
                            : isCached
                            ? '#C084FC'
                            : '#94A3B8'
                        }
                      />
                      <Text style={styles.menuItemText}>
                        {isDownloaded
                          ? 'Remove Offline Download'
                          : isCached
                          ? 'Pin Cached Song Offline'
                          : 'Download Offline'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setIsMenuOpen(false);
                        if (exportSongToDevice) {
                          exportSongToDevice(currentTrack);
                        }
                      }}
                    >
                      <Ionicons
                        name="phone-portrait-outline"
                        size={22}
                        color="#34D399"
                      />
                      <Text style={[styles.menuItemText, { color: '#34D399', fontWeight: 'bold' }]}>
                        Save to Phone Storage (.mp3)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setIsMenuOpen(false);
                        handleShare();
                      }}
                    >
                      <Ionicons
                        name="share-social-outline"
                        size={22}
                        color="#C084FC"
                      />
                      <Text style={styles.menuItemText}>Share Song</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setIsMenuOpen(false);
                        setIsSongInfoOpen(true);
                      }}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={22}
                        color="#C084FC"
                      />
                      <Text style={styles.menuItemText}>View Song Information</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuCloseBtn}
                      onPress={() => setIsMenuOpen(false)}
                    >
                      <Text style={styles.menuCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* =============================================================== */}
          {/* 5. Song Information Modal                                       */}
          {/* =============================================================== */}
          <Modal
            visible={isSongInfoOpen}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setIsSongInfoOpen(false)}
          >
            <TouchableWithoutFeedback onPress={() => setIsSongInfoOpen(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.infoSheet}>
                    <Text style={styles.infoSheetTitle}>Song Information</Text>
                    <View style={styles.menuDivider} />

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Title</Text>
                      <Text style={styles.infoVal}>{currentTrack.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Artist</Text>
                      <Text style={styles.infoVal}>
                        {currentTrack.desc || 'Unknown Artist'}
                      </Text>
                    </View>
                    {albumName ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Album</Text>
                        <Text style={styles.infoVal}>{albumName}</Text>
                      </View>
                    ) : null}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Duration</Text>
                      <Text style={styles.infoVal}>
                        {formatTime(playbackDuration)}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Audio Quality</Text>
                      <Text style={styles.infoVal}>320 kbps Lossless Hi-Fi</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.menuCloseBtn}
                      onPress={() => setIsSongInfoOpen(false)}
                    >
                      <Text style={styles.menuCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020205',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 42,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginBottom: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
    maxWidth: '65%',
  },
  headerSubtitle: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Central Artwork Stage
  artworkSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
    minHeight: 280,
  },
  artworkShadow: {
    borderRadius: 22,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1B38',
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },

  // Bottom Controls Group
  bottomControlsGroup: {
    justifyContent: 'space-between',
  },

  // Spectrum Waveform
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    gap: 4,
    marginVertical: 4,
  },
  waveBar: {
    width: 3.5,
    borderRadius: 2,
  },

  // Track Info Row
  trackInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  titleArtist: {
    flex: 1,
    marginRight: 12,
  },
  marqueeContainer: {
    overflow: 'hidden',
    width: '100%',
    justifyContent: 'center',
  },
  hiddenMeasurerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  marqueeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  trackArtist: {
    color: '#C4B5FD',
    fontSize: 13,
    fontWeight: '500',
  },
  iconBtn: {
    padding: 4,
  },
  equalizerBtn: {
    padding: 3,
  },
  equalizerGradientIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.45)',
  },

  // Seek Section
  seekSection: {
    marginVertical: 6,
  },
  seekBarTouchArea: {
    paddingVertical: 10,
  },
  seekBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  seekBarFill: {
    height: 4,
    borderRadius: 2,
  },
  seekThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginLeft: -7,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },

  // Playback Controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingHorizontal: 12,
  },
  mainPlayBtn: {
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  mainPlayGradient: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bottom Utility Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  bottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bottomIconBtn: {
    padding: 4,
  },

  // Modals & Sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#111022',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  menuTrackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  menuTrackThumb: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#1E1B38',
  },
  menuTrackTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  menuTrackArtist: {
    color: '#94A3B8',
    fontSize: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 14,
  },
  menuItemText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  menuCloseBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  menuCloseText: {
    color: '#C084FC',
    fontSize: 14,
    fontWeight: '700',
  },

  // Info Sheet
  infoSheet: {
    backgroundColor: '#111022',
    borderRadius: 24,
    marginHorizontal: 24,
    marginBottom: 80,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  infoSheetTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  infoVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
});

export default FullPlayerModal;
