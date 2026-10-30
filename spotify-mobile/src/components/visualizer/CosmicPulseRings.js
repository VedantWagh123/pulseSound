import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Orbiting satellite nodes configuration
const SATELLITE_NODES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  angle: (i * 360) / 12,
  size: 4 + (i % 3) * 2,
  color: ['#06B6D4', '#8B5CF6', '#EC4899', '#38BDF8', '#10B981'][i % 5],
}));

export const CosmicPulseRings = React.memo(({
  width,
  height,
  artworkSize = 260,
  isPlaying,
  audioEnergy = 0.2,
  bassEnergy = 0.2,
  midEnergy = 0.2,
  trebleEnergy = 0.2,
  beatCount = 0,
  hasVideo = false,
}) => {
  // Continuous Ambient Rotation
  const rotateAnimCW = useRef(new Animated.Value(0)).current;
  const rotateAnimCCW = useRef(new Animated.Value(0)).current;
  const ambientBreathe = useRef(new Animated.Value(1)).current;

  // Real-time Beat Shockwaves
  const innerRingScale = useRef(new Animated.Value(1)).current;
  const midRingScale = useRef(new Animated.Value(1)).current;
  const outerRingScale = useRef(new Animated.Value(1)).current;
  const outerRingOpacity = useRef(new Animated.Value(0)).current;
  const satellitePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isPlaying) return;

    const loopCW = Animated.loop(
      Animated.timing(rotateAnimCW, {
        toValue: 1,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const loopCCW = Animated.loop(
      Animated.timing(rotateAnimCCW, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const loopBreathe = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientBreathe, { toValue: 1.06, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ambientBreathe, { toValue: 0.98, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    loopCW.start();
    loopCCW.start();
    loopBreathe.start();

    return () => {
      loopCW.stop();
      loopCCW.stop();
      loopBreathe.stop();
    };
  }, [isPlaying]);

  // React to Bass & Beats
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    // 1. Inner Ring elastic kick
    Animated.sequence([
      Animated.timing(innerRingScale, {
        toValue: 1.08 + bassEnergy * 0.12,
        duration: 70,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(innerRingScale, {
        toValue: 1.0,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Mid Ring pulse
    Animated.sequence([
      Animated.timing(midRingScale, {
        toValue: 1.15 + midEnergy * 0.15,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(midRingScale, {
        toValue: 1.0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Outer Ring deep acoustic expansion
    outerRingScale.setValue(1.0);
    outerRingOpacity.setValue(0.70 + bassEnergy * 0.30);
    Animated.parallel([
      Animated.timing(outerRingScale, {
        toValue: 1.55 + bassEnergy * 0.40,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(outerRingOpacity, {
        toValue: 0,
        duration: 720,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // 4. Satellite flare
    Animated.sequence([
      Animated.timing(satellitePulse, {
        toValue: 1.45,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(satellitePulse, {
        toValue: 1.0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatCount, isPlaying, bassEnergy, midEnergy]);

  const spinCW = rotateAnimCW.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinCCW = rotateAnimCCW.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const ring1Size = artworkSize * 1.14;
  const ring2Size = artworkSize * 1.34;
  const ring3Size = artworkSize * 1.56;
  const ringOrbitSize = artworkSize * 1.42;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dark Ambient Base Gradient (rendered only when video is not active) */}
      {!hasVideo && (
        <LinearGradient
          colors={['#080816', '#140D2B', '#060710']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Central Ring Anchor (Aligned with Song Artwork center stage) */}
      <View style={styles.centerStage}>
        {/* Soft Depth Aura behind Artwork */}
        <Animated.View
          style={[
            styles.ambientGlow,
            {
              width: artworkSize * 1.25,
              height: artworkSize * 1.25,
              borderRadius: (artworkSize * 1.25) / 2,
              transform: [{ scale: ambientBreathe }],
            },
          ]}
        />

        {/* Ring 1: Inner Cyan Sub-Bass Precision Ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: ring1Size,
              height: ring1Size,
              borderRadius: ring1Size / 2,
              borderColor: '#06B6D4',
              borderWidth: 2,
              shadowColor: '#06B6D4',
              shadowOpacity: 0.85,
              shadowRadius: 10,
              transform: [{ scale: Animated.multiply(innerRingScale, ambientBreathe) }],
            },
          ]}
        />

        {/* Ring 2: Mid Harmonic Violet Ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: ring2Size,
              height: ring2Size,
              borderRadius: ring2Size / 2,
              borderColor: '#8B5CF6',
              borderWidth: 1.8,
              shadowColor: '#8B5CF6',
              shadowOpacity: 0.75,
              shadowRadius: 12,
              transform: [
                { scale: midRingScale },
                { rotate: spinCCW },
              ],
            },
          ]}
        />

        {/* Ring 3: Outer Deep Acoustic Shockwave Ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: ring3Size,
              height: ring3Size,
              borderRadius: ring3Size / 2,
              borderColor: '#EC4899',
              borderWidth: 1.5,
              opacity: outerRingOpacity,
              transform: [{ scale: outerRingScale }],
            },
          ]}
        />

        {/* Ring 4: Dashed Celestial Orbit Ring with Rotating Satellites */}
        <Animated.View
          style={[
            styles.orbitContainer,
            {
              width: ringOrbitSize,
              height: ringOrbitSize,
              transform: [{ rotate: spinCW }],
            },
          ]}
        >
          <View
            style={[
              styles.dashedRing,
              {
                width: ringOrbitSize,
                height: ringOrbitSize,
                borderRadius: ringOrbitSize / 2,
              },
            ]}
          />

          {/* 12 Satellite Nodes */}
          {SATELLITE_NODES.map((s) => {
            const rad = (s.angle * Math.PI) / 180;
            const dist = ringOrbitSize / 2;
            const posX = Math.cos(rad) * dist;
            const posY = Math.sin(rad) * dist;

            return (
              <Animated.View
                key={s.id}
                style={[
                  styles.satelliteNode,
                  {
                    width: s.size,
                    height: s.size,
                    borderRadius: s.size / 2,
                    backgroundColor: s.color,
                    shadowColor: s.color,
                    transform: [
                      { translateX: posX },
                      { translateY: posY },
                      { scale: satellitePulse },
                    ],
                  },
                ]}
              />
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  centerStage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 64,
  },
  ambientGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
  },
  orbitContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedRing: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(56, 189, 248, 0.40)',
  },
  satelliteNode: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default CosmicPulseRings;

