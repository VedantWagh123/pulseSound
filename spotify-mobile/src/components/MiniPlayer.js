import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

export const MiniPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    playbackPosition,
    playbackDuration,
    togglePlayPause,
    nextTrack,
    setIsFullPlayerOpen,
    dismissCurrentTrack,
  } = usePlayer();

  const panX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Ensure mini-player is immediately centered and fully visible when track starts or changes
  useEffect(() => {
    if (currentTrack) {
      panX.setValue(0);
      fadeAnim.setValue(1);
    }
  }, [currentTrack]);

  // Swipe gesture handler to dismiss on swipe left or right
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Trigger swipe only when horizontal movement is clear and > 10px
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        panX.setValue(gestureState.dx);
        // Dim subtly as user drags further out
        const opacity = Math.max(0.15, 1 - Math.abs(gestureState.dx) / 320);
        fadeAnim.setValue(opacity);
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipeThreshold = 75;
        if (gestureState.dx > swipeThreshold) {
          // Swiped Right -> Animate off-screen to the right and dismiss
          Animated.parallel([
            Animated.timing(panX, {
              toValue: 450,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (dismissCurrentTrack) dismissCurrentTrack();
            panX.setValue(0);
            fadeAnim.setValue(1);
          });
        } else if (gestureState.dx < -swipeThreshold) {
          // Swiped Left -> Animate off-screen to the left and dismiss
          Animated.parallel([
            Animated.timing(panX, {
              toValue: -450,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (dismissCurrentTrack) dismissCurrentTrack();
            panX.setValue(0);
            fadeAnim.setValue(1);
          });
        } else {
          // Snap back smoothly if swipe was cancelled
          Animated.parallel([
            Animated.spring(panX, {
              toValue: 0,
              friction: 7,
              tension: 50,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  if (!currentTrack) return null;

  const currentTrackImage = typeof currentTrack.image === 'string'
    ? { uri: currentTrack.image }
    : currentTrack.image?.uri
    ? { uri: currentTrack.image.uri }
    : currentTrack.image;

  const progressPercent =
    playbackDuration > 0
      ? Math.min((playbackPosition / playbackDuration) * 100, 100)
      : 0;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            transform: [{ translateX: panX }],
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => setIsFullPlayerOpen(true)}
          style={styles.innerTouchable}
        >
          {/* Glowing Progress Bar */}
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>

          <View style={styles.contentRow}>
            {/* Album Art with violet border */}
            <View style={styles.artWrapper}>
              <Image source={currentTrackImage} style={styles.art} resizeMode="cover" />
            </View>

            {/* Title & Desc */}
            <View style={styles.meta}>
              <Text numberOfLines={1} style={styles.title}>
                {currentTrack.name}
              </Text>
              <Text numberOfLines={1} style={styles.desc}>
                {currentTrack.album || currentTrack.desc}
              </Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                onPress={togglePlayPause}
                style={styles.playBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6D28D9']}
                  style={styles.playBtnGradient}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={18}
                    color="#FFFFFF"
                    style={{ marginLeft: isPlaying ? 0 : 2 }}
                  />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={nextTrack}
                style={styles.nextBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="play-skip-forward" size={20} color="#C4B5FD" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  container: {
    backgroundColor: '#0E1226',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  innerTouchable: {
    width: '100%',
  },
  progressBarBg: {
    height: 3,
    backgroundColor: '#1E243D',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  artWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#3B4265',
  },
  art: {
    width: '100%',
    height: '100%',
  },
  meta: {
    flex: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  desc: {
    color: '#A78BFA',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 6,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  playBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtn: {
    padding: 4,
  },
});
