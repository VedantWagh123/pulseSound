import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// 6 Concentric Tunnel Perspective Rings
const TUNNEL_RINGS = [
  { id: 1, baseScale: 0.45, color: '#10B981', border: 2 },
  { id: 2, baseScale: 0.72, color: '#06B6D4', border: 2.2 },
  { id: 3, baseScale: 1.05, color: '#8B5CF6', border: 2.5 },
  { id: 4, baseScale: 1.42, color: '#EC4899', border: 2 },
  { id: 5, baseScale: 1.85, color: '#38BDF8', border: 1.8 },
  { id: 6, baseScale: 2.30, color: '#F59E0B', border: 1.5 },
];

// 16 Velocity depth streak nodes
const TUNNEL_STREAKS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  angle: (i * 360) / 16,
  distRatio: 0.45 + (i % 3) * 0.22,
  size: 4 + (i % 3) * 2.5,
  color: ['#10B981', '#06B6D4', '#8B5CF6', '#EC4899', '#38BDF8'][i % 5],
}));

export const InfiniteBeatTunnel = React.memo(({
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
  // Continuous Tunnel Depth Travel Loop
  const tunnelTravel = useRef(new Animated.Value(0)).current;
  const tunnelRotate = useRef(new Animated.Value(0)).current;

  // Real-time Beat Warp Acceleration
  const warpPulse = useRef(new Animated.Value(1)).current;
  const shockwavePulse = useRef(new Animated.Value(1)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlaying) return;

    const loopTravel = Animated.loop(
      Animated.timing(tunnelTravel, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true })
    );
    const loopRotate = Animated.loop(
      Animated.timing(tunnelRotate, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true })
    );

    loopTravel.start();
    loopRotate.start();

    return () => {
      loopTravel.stop();
      loopRotate.stop();
    };
  }, [isPlaying]);

  // React to Bass & Beats with warp speed expansion
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    Animated.sequence([
      Animated.timing(warpPulse, {
        toValue: 1.28 + (bassEnergy || 0.2) * 0.22,
        duration: 75,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(warpPulse, {
        toValue: 1.0,
        friction: 5,
        tension: 42,
        useNativeDriver: true,
      }),
    ]).start();

    shockwavePulse.setValue(0.9);
    shockwaveOpacity.setValue(0.75 + (bassEnergy || 0.2) * 0.25);
    Animated.parallel([
      Animated.timing(shockwavePulse, {
        toValue: 2.1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(shockwaveOpacity, {
        toValue: 0,
        duration: 620,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatCount, isPlaying, bassEnergy]);

  const spinTunnel = tunnelRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const continuousExpand = tunnelTravel.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.35],
  });

  const tunnelBaseSize = artworkSize * 0.88;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Background (Only when no video) */}
      {!hasVideo && (
        <LinearGradient
          colors={['#040914', '#0E0720', '#02040A']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Center Tunnel Stage */}
      <View style={styles.centerStage}>
        {/* Glowing Vanishing Point Energy Core */}
        <Animated.View
          style={[
            styles.vanishingCore,
            {
              width: tunnelBaseSize * 0.55,
              height: tunnelBaseSize * 0.55,
              borderRadius: (tunnelBaseSize * 0.55) / 2,
              transform: [{ scale: warpPulse }],
            },
          ]}
        />

        {/* 6 Layered Concentric Depth Rings */}
        {TUNNEL_RINGS.map((ring) => {
          const ringDimension = tunnelBaseSize * ring.baseScale;
          return (
            <Animated.View
              key={ring.id}
              style={[
                styles.tunnelRing,
                {
                  width: ringDimension,
                  height: ringDimension,
                  borderRadius: ringDimension / 2,
                  borderColor: ring.color,
                  borderWidth: ring.border,
                  shadowColor: ring.color,
                  shadowOpacity: 0.85,
                  shadowRadius: 10,
                  transform: [
                    { scale: Animated.multiply(continuousExpand, warpPulse) },
                  ],
                },
              ]}
            />
          );
        })}

        {/* 16 Tunnel Velocity Streaks */}
        <Animated.View
          style={[
            styles.streaksContainer,
            {
              width: tunnelBaseSize * 2,
              height: tunnelBaseSize * 2,
              transform: [{ rotate: spinTunnel }],
            },
          ]}
        >
          {TUNNEL_STREAKS.map((s) => {
            const rad = (s.angle * Math.PI) / 180;
            const dist = tunnelBaseSize * s.distRatio;
            const posX = Math.cos(rad) * dist;
            const posY = Math.sin(rad) * dist;

            return (
              <Animated.View
                key={s.id}
                style={[
                  styles.streakDot,
                  {
                    width: s.size,
                    height: s.size,
                    borderRadius: s.size / 2,
                    backgroundColor: s.color,
                    shadowColor: s.color,
                    transform: [
                      { translateX: posX },
                      { translateY: posY },
                      { scale: warpPulse },
                    ],
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* High-Velocity Beat Shockwave */}
        <Animated.View
          style={[
            styles.tunnelRing,
            {
              width: tunnelBaseSize * 1.2,
              height: tunnelBaseSize * 1.2,
              borderRadius: (tunnelBaseSize * 1.2) / 2,
              borderColor: '#10B981',
              borderWidth: 2.5,
              opacity: shockwaveOpacity,
              transform: [{ scale: shockwavePulse }],
            },
          ]}
        />
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
  vanishingCore: {
    position: 'absolute',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 28,
  },
  tunnelRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
  },
  streaksContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDot: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default InfiniteBeatTunnel;

