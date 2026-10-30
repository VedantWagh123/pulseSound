import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// 12 Radial portal light rays
const PORTAL_RAYS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  angle: (i * 360) / 12,
  color: i % 2 === 0 ? 'rgba(6, 182, 212, 0.45)' : 'rgba(139, 92, 246, 0.45)',
}));

// 16 Portal stardust nodes
const PORTAL_STARDUST = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  angle: (i * 360) / 16,
  distRatio: 0.62 + (i % 3) * 0.12,
  size: 4 + (i % 3) * 2,
  color: ['#06B6D4', '#8B5CF6', '#F59E0B', '#38BDF8', '#EC4899'][i % 5],
}));

export const CinematicPortalReveal = React.memo(({
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
  // Continuous Portal Rotations & Breathing
  const spinCW = useRef(new Animated.Value(0)).current;
  const spinCCW = useRef(new Animated.Value(0)).current;
  const portalBreathe = useRef(new Animated.Value(1)).current;

  // Real-time Beat Pulses
  const portalKick = useRef(new Animated.Value(1)).current;
  const shockwavePulse = useRef(new Animated.Value(1)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlaying) return;

    const loopCW = Animated.loop(
      Animated.timing(spinCW, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true })
    );
    const loopCCW = Animated.loop(
      Animated.timing(spinCCW, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true })
    );
    const loopBreathe = Animated.loop(
      Animated.sequence([
        Animated.timing(portalBreathe, { toValue: 1.10, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(portalBreathe, { toValue: 0.96, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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

  // React to Bass Beats
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    Animated.sequence([
      Animated.timing(portalKick, {
        toValue: 1.20 + (bassEnergy || 0.2) * 0.18,
        duration: 75,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(portalKick, {
        toValue: 1.0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    shockwavePulse.setValue(1.0);
    shockwaveOpacity.setValue(0.70 + (bassEnergy || 0.2) * 0.25);
    Animated.parallel([
      Animated.timing(shockwavePulse, {
        toValue: 1.65,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(shockwaveOpacity, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatCount, isPlaying, bassEnergy]);

  const rotateClockwise = spinCW.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateCounterClockwise = spinCCW.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const portalCoreSize = artworkSize * 1.18;
  const outerRingSize = artworkSize * 1.48;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Background: Ambient Deep Void (Only if no video) */}
      {!hasVideo && (
        <LinearGradient
          colors={['#080816', '#140A28', '#05060E']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Center Portal Anchor */}
      <View style={styles.centerStage}>
        {/* Glowing Portal Depth Aura */}
        <Animated.View
          style={[
            styles.portalAura,
            {
              width: portalCoreSize * 1.25,
              height: portalCoreSize * 1.25,
              borderRadius: (portalCoreSize * 1.25) / 2,
              transform: [{ scale: Animated.multiply(portalBreathe, portalKick) }],
            },
          ]}
        />

        {/* 12 Radiant Light Rays */}
        <Animated.View
          style={[
            styles.raysContainer,
            {
              width: outerRingSize,
              height: outerRingSize,
              transform: [{ rotate: rotateClockwise }],
            },
          ]}
        >
          {PORTAL_RAYS.map((r) => {
            const rad = (r.angle * Math.PI) / 180;
            const dist = outerRingSize * 0.48;
            const posX = Math.cos(rad) * dist;
            const posY = Math.sin(rad) * dist;

            return (
              <Animated.View
                key={r.id}
                style={[
                  styles.lightRay,
                  {
                    backgroundColor: r.color,
                    shadowColor: r.color,
                    transform: [
                      { translateX: posX },
                      { translateY: posY },
                      { rotate: `${r.angle}deg` },
                      { scaleY: portalKick },
                    ],
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Inner Cyan Portal Ring */}
        <Animated.View
          style={[
            styles.portalRing,
            {
              width: portalCoreSize,
              height: portalCoreSize,
              borderRadius: portalCoreSize / 2,
              borderColor: '#06B6D4',
              borderWidth: 2.5,
              shadowColor: '#06B6D4',
              shadowOpacity: 0.9,
              shadowRadius: 14,
              transform: [{ scale: Animated.multiply(portalBreathe, portalKick) }],
            },
          ]}
        />

        {/* Mid Violet Portal Ring */}
        <Animated.View
          style={[
            styles.portalRing,
            {
              width: portalCoreSize * 1.28,
              height: portalCoreSize * 1.28,
              borderRadius: (portalCoreSize * 1.28) / 2,
              borderColor: '#8B5CF6',
              borderWidth: 2,
              shadowColor: '#8B5CF6',
              shadowOpacity: 0.8,
              shadowRadius: 16,
              transform: [
                { scale: portalBreathe },
                { rotate: rotateCounterClockwise },
              ],
            },
          ]}
        />

        {/* Expanding Beat Shockwave Ring */}
        <Animated.View
          style={[
            styles.portalRing,
            {
              width: outerRingSize,
              height: outerRingSize,
              borderRadius: outerRingSize / 2,
              borderColor: '#F59E0B',
              borderWidth: 1.8,
              opacity: shockwaveOpacity,
              transform: [{ scale: shockwavePulse }],
            },
          ]}
        />

        {/* Orbiting Stardust Nodes */}
        <Animated.View
          style={[
            styles.raysContainer,
            {
              width: outerRingSize,
              height: outerRingSize,
              transform: [{ rotate: rotateCounterClockwise }],
            },
          ]}
        >
          {PORTAL_STARDUST.map((s) => {
            const rad = (s.angle * Math.PI) / 180;
            const dist = outerRingSize * 0.5 * s.distRatio;
            const posX = Math.cos(rad) * dist;
            const posY = Math.sin(rad) * dist;

            return (
              <Animated.View
                key={s.id}
                style={[
                  styles.stardustDot,
                  {
                    width: s.size,
                    height: s.size,
                    borderRadius: s.size / 2,
                    backgroundColor: s.color,
                    shadowColor: s.color,
                    transform: [
                      { translateX: posX },
                      { translateY: posY },
                      { scale: portalKick },
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
  portalAura: {
    position: 'absolute',
    backgroundColor: 'rgba(6, 182, 212, 0.22)',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 36,
  },
  raysContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightRay: {
    position: 'absolute',
    width: 3.5,
    height: 48,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  portalRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
  },
  stardustDot: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default CinematicPortalReveal;

