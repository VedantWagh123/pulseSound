import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

export const PulseFindBubble = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const {
    isPulseFindOpen,
    setIsPulseFindOpen,
    isPulseBubbleVisible = true,
    setIsPulseBubbleVisible,
    isPulseFindLocked = true,
    showInAppToast,
  } = usePlayer();

  const BUBBLE_SIZE = 58;
  const MARGIN = 14;

  // Position state (starts near bottom-right above mini player)
  const pan = useRef(
    new Animated.ValueXY({
      x: windowWidth - BUBBLE_SIZE - MARGIN,
      y: windowHeight - 210,
    })
  ).current;

  // Breathing pulse animation
  const breatheAnim = useRef(new Animated.Value(1)).current;
  // Sound wave ripple ring 1
  const ripple1 = useRef(new Animated.Value(0)).current;
  // Sound wave ripple ring 2
  const ripple2 = useRef(new Animated.Value(0)).current;

  // Drag-to-dismiss state & animations
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDismissZone, setIsOverDismissZone] = useState(false);
  const isOverDismissZoneRef = useRef(false);
  const isDraggingRef = useRef(false);

  const dismissZoneAnim = useRef(new Animated.Value(0)).current; // 0 -> 1 for entry / fade
  const dismissScaleAnim = useRef(new Animated.Value(1)).current; // 1 -> 1.25 when over target
  const bubbleScaleAnim = useRef(new Animated.Value(1)).current; // 1 -> 0 when dismissed

  // Reset bubble scale whenever visibility is toggled back on
  useEffect(() => {
    if (isPulseBubbleVisible) {
      bubbleScaleAnim.setValue(1);
    }
  }, [isPulseBubbleVisible]);

  useEffect(() => {
    // Breathing scale loop
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.08,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    breatheLoop.start();

    // Concentric sound-wave ripple rings
    const rippleLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ripple1, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(ripple1, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    rippleLoop1.start();

    const rippleLoop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(1100),
        Animated.timing(ripple2, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(ripple2, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    rippleLoop2.start();

    return () => {
      breatheLoop.stop();
      rippleLoop1.stop();
      rippleLoop2.stop();
    };
  }, []);

  // Drag physics with proximity detection to bottom dismiss zone & magnetic edge snap
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
        isDraggingRef.current = true;
        setIsDragging(true);
        setIsOverDismissZone(false);
        isOverDismissZoneRef.current = false;
        dismissScaleAnim.setValue(1);

        // Animate dismiss target entry at bottom
        Animated.spring(dismissZoneAnim, {
          toValue: 1,
          friction: 7,
          tension: 45,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gesture) => {
        pan.x.setValue(gesture.dx);
        pan.y.setValue(gesture.dy);

        // Center coordinates of dragging bubble
        const currentBubbleX = pan.x._offset + gesture.dx + BUBBLE_SIZE / 2;
        const currentBubbleY = pan.y._offset + gesture.dy + BUBBLE_SIZE / 2;

        // Dismiss zone center coordinates (bottom center of screen)
        const targetCenterX = windowWidth / 2;
        const targetCenterY = windowHeight - 90;

        const distance = Math.hypot(
          currentBubbleX - targetCenterX,
          currentBubbleY - targetCenterY
        );
        const isNear = distance < 85;

        if (isNear !== isOverDismissZoneRef.current) {
          isOverDismissZoneRef.current = isNear;
          setIsOverDismissZone(isNear);
          Animated.spring(dismissScaleAnim, {
            toValue: isNear ? 1.25 : 1,
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        isDraggingRef.current = false;

        // 1. If user just tapped without dragging
        if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) {
          Animated.timing(dismissZoneAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setIsDragging(false);
          });
          setIsPulseFindOpen(true);
          return;
        }

        const targetCenterX = windowWidth / 2;
        const targetCenterY = windowHeight - 90;

        // 2. If user dragged onto the bottom cancel/dismiss cross: DISAPPEAR!
        if (isOverDismissZoneRef.current) {
          Animated.parallel([
            Animated.spring(pan.x, {
              toValue: targetCenterX - BUBBLE_SIZE / 2,
              friction: 6,
              useNativeDriver: false,
            }),
            Animated.spring(pan.y, {
              toValue: targetCenterY - BUBBLE_SIZE / 2,
              friction: 6,
              useNativeDriver: false,
            }),
            Animated.timing(bubbleScaleAnim, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(dismissZoneAnim, {
              toValue: 0,
              duration: 250,
              delay: 80,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setIsDragging(false);
            setIsOverDismissZone(false);
            isOverDismissZoneRef.current = false;
            setIsPulseBubbleVisible(false);
            showInAppToast?.('Floating mic dismissed. Re-enable in Search or Header.');
          });
        } else {
          // 3. Normal snap to screen edge
          Animated.timing(dismissZoneAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            setIsDragging(false);
            setIsOverDismissZone(false);
            isOverDismissZoneRef.current = false;
          });

          // Calculate clamped Y
          const currentY = pan.y._value;
          const clampedY = Math.max(
            60,
            Math.min(windowHeight - BUBBLE_SIZE - 120, currentY)
          );

          // Magnetic snap to nearest horizontal edge (left or right)
          const currentX = pan.x._value;
          const midPoint = windowWidth / 2;
          const targetX =
            currentX + BUBBLE_SIZE / 2 < midPoint
              ? MARGIN
              : windowWidth - BUBBLE_SIZE - MARGIN;

          Animated.parallel([
            Animated.spring(pan.x, {
              toValue: targetX,
              friction: 6,
              tension: 50,
              useNativeDriver: false,
            }),
            Animated.spring(pan.y, {
              toValue: clampedY,
              friction: 7,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // If mic feature is locked under development, hidden by user, or modal is open: DO NOT DISPLAY
  if (isPulseFindLocked || isPulseBubbleVisible === false || isPulseFindOpen) {
    return null;
  }

  // Ripple transforms
  const ripple1Scale = ripple1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });
  const ripple1Opacity = ripple1.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.6, 0.25, 0],
  });

  const ripple2Scale = ripple2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });
  const ripple2Opacity = ripple2.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.6, 0.25, 0],
  });

  return (
    <>
      {/* Bottom Dismiss Target Zone (Visible while dragging) */}
      {isDragging && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dismissOverlay,
            {
              opacity: dismissZoneAnim,
              transform: [
                {
                  translateY: dismissZoneAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                { scale: dismissScaleAnim },
              ],
            },
          ]}
        >
          {/* Subtle glowing halo when hovering over target */}
          {isOverDismissZone && <View style={styles.dismissHalo} />}

          <View style={[styles.dismissCircle, isOverDismissZone && styles.dismissCircleActive]}>
            <Ionicons
              name="close"
              size={28}
              color={isOverDismissZone ? '#FFFFFF' : '#EF4444'}
            />
          </View>

          <Text style={[styles.dismissLabel, isOverDismissZone && styles.dismissLabelActive]}>
            {isOverDismissZone ? 'Release to remove' : 'Drag here to hide'}
          </Text>
        </Animated.View>
      )}

      {/* Draggable Bubble */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: pan.getTranslateTransform(),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[
            styles.bubbleScaleWrapper,
            {
              transform: [{ scale: bubbleScaleAnim }],
            },
          ]}
        >
          {/* Sound-Wave Ring 1 */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.rippleRing,
              {
                transform: [{ scale: ripple1Scale }],
                opacity: ripple1Opacity,
              },
            ]}
          />

          {/* Sound-Wave Ring 2 */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.rippleRing,
              {
                transform: [{ scale: ripple2Scale }],
                opacity: ripple2Opacity,
              },
            ]}
          />

          {/* Main Glowing Circular Button */}
          <Animated.View style={{ transform: [{ scale: breatheAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsPulseFindOpen(true)}
              style={styles.bubbleTouchable}
            >
              {/* Vibrant Multi-Stop Radial Gradient */}
              <LinearGradient
                colors={['#C084FC', '#A855F7', '#EC4899', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBubble}
              >
                {/* Inner Dark Vignette for Premium Depth */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'transparent', 'rgba(0,0,0,0.35)']}
                  style={StyleSheet.absoluteFill}
                />

                {/* Glowing Border */}
                <View style={styles.borderGlow} />

                {/* Modern Microphone Icon */}
                <Ionicons name="mic" size={27} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleScaleWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleTouchable: {
    width: 58,
    height: 58,
    borderRadius: 29,
    ...Platform.select({
      ios: {
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.65,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  gradientBubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    overflow: 'hidden',
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: 'rgba(236, 72, 153, 0.6)',
  },
  rippleRing: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#EC4899',
  },
  dismissOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
  },
  dismissHalo: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(239, 68, 68, 0.24)',
    top: -13,
  },
  dismissCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(23, 16, 28, 0.94)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  dismissCircleActive: {
    backgroundColor: '#DC2626',
    borderColor: '#FFFFFF',
    borderWidth: 2.5,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.9,
        shadowRadius: 18,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  dismissLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  dismissLabelActive: {
    color: '#FCA5A5',
    fontWeight: '800',
  },
});

export default PulseFindBubble;
