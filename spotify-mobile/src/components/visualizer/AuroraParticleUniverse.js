import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Pre-calculated deterministic particle seeds for depth and performance
const PARTICLE_SEEDS = [
  // Background Layer (Distant twinkling stardust)
  { id: 1, depth: 'bg', xPct: 0.12, yPct: 0.18, size: 3, color: '#38BDF8', speed: 4200 },
  { id: 2, depth: 'bg', xPct: 0.85, yPct: 0.15, size: 2.5, color: '#C084FC', speed: 3800 },
  { id: 3, depth: 'bg', xPct: 0.22, yPct: 0.38, size: 3.5, color: '#34D399', speed: 4600 },
  { id: 4, depth: 'bg', xPct: 0.78, yPct: 0.42, size: 2.8, color: '#F472B6', speed: 3900 },
  { id: 5, depth: 'bg', xPct: 0.08, yPct: 0.65, size: 3.2, color: '#60A5FA', speed: 4400 },
  { id: 6, depth: 'bg', xPct: 0.90, yPct: 0.72, size: 2.4, color: '#A78BFA', speed: 3600 },
  { id: 7, depth: 'bg', xPct: 0.35, yPct: 0.82, size: 3.0, color: '#38BDF8', speed: 4100 },
  { id: 8, depth: 'bg', xPct: 0.68, yPct: 0.88, size: 2.6, color: '#F43F5E', speed: 4500 },

  // Mid Layer (Floating radiant energy orbs)
  { id: 9, depth: 'mid', xPct: 0.18, yPct: 0.28, size: 6, color: '#06B6D4', speed: 3100 },
  { id: 10, depth: 'mid', xPct: 0.82, yPct: 0.26, size: 7, color: '#8B5CF6', speed: 2800 },
  { id: 11, depth: 'mid', xPct: 0.14, yPct: 0.52, size: 5.5, color: '#10B981', speed: 3300 },
  { id: 12, depth: 'mid', xPct: 0.86, yPct: 0.56, size: 6.5, color: '#EC4899', speed: 2900 },
  { id: 13, depth: 'mid', xPct: 0.25, yPct: 0.75, size: 8, color: '#3B82F6', speed: 3500 },
  { id: 14, depth: 'mid', xPct: 0.75, yPct: 0.78, size: 6, color: '#F59E0B', speed: 3200 },
  { id: 15, depth: 'mid', xPct: 0.50, yPct: 0.12, size: 7.5, color: '#A855F7', speed: 3000 },
  { id: 16, depth: 'mid', xPct: 0.50, yPct: 0.88, size: 7, color: '#06B6D4', speed: 3400 },

  // Foreground Layer (Orbital aurora particles near center stage)
  { id: 17, depth: 'fg', xPct: 0.32, yPct: 0.34, size: 4.5, color: '#22D3EE', speed: 2400 },
  { id: 18, depth: 'fg', xPct: 0.68, yPct: 0.34, size: 4.5, color: '#E879F9', speed: 2600 },
  { id: 19, depth: 'fg', xPct: 0.28, yPct: 0.60, size: 5, color: '#4ADE80', speed: 2200 },
  { id: 20, depth: 'fg', xPct: 0.72, yPct: 0.60, size: 5, color: '#F472B6', speed: 2500 },
];

export const AuroraParticleUniverse = React.memo(({
  width,
  height,
  isPlaying,
  audioEnergy = 0.2,
  bassEnergy = 0.2,
  midEnergy = 0.2,
  trebleEnergy = 0.2,
  beatCount = 0,
  hasVideo = false,
}) => {
  // Continuous Ambient Float Animation
  const ambientDrift = useRef(new Animated.Value(0)).current;
  const auroraGlowScale = useRef(new Animated.Value(1)).current;

  // Real-Time Beat Pulses
  const beatExpansion = useRef(new Animated.Value(1)).current;
  const shockwavePulse = useRef(new Animated.Value(0.85)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;

  // Continuous sinusoidal drift loop
  useEffect(() => {
    if (!isPlaying) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientDrift, {
          toValue: 1,
          duration: 5400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ambientDrift, {
          toValue: 0,
          duration: 5400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isPlaying]);

  // React to Bass & Beats
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    // Elastic particle expansion on bass kick
    Animated.sequence([
      Animated.timing(beatExpansion, {
        toValue: 1.25 + bassEnergy * 0.25,
        duration: 75,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(beatExpansion, {
        toValue: 1.0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Cosmic shockwave ripple
    shockwavePulse.setValue(0.85);
    shockwaveOpacity.setValue(0.55 + bassEnergy * 0.35);
    Animated.parallel([
      Animated.timing(shockwavePulse, {
        toValue: 2.2,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(shockwaveOpacity, {
        toValue: 0,
        duration: 750,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatCount, isPlaying, bassEnergy]);

  const floatY = ambientDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 14],
  });

  const floatX = ambientDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -10],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Fluid Ambient Aurora Gradient Glow (Only if no video) */}
      <View style={styles.auroraBackdrop}>
        {!hasVideo && (
          <LinearGradient
            colors={['#080816', '#120E2E', '#091829', '#05060D']}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* Soft Radial Aurora Glow Blobs */}
        <Animated.View
          style={[
            styles.ambientAuraBlob,
            {
              width: width * 0.85,
              height: width * 0.85,
              borderRadius: (width * 0.85) / 2,
              backgroundColor: 'rgba(6, 182, 212, 0.18)',
              top: height * 0.18,
              left: width * 0.08,
              transform: [
                { scale: beatExpansion },
                { translateY: floatY },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ambientAuraBlob,
            {
              width: width * 0.9,
              height: width * 0.9,
              borderRadius: (width * 0.9) / 2,
              backgroundColor: 'rgba(139, 92, 246, 0.16)',
              top: height * 0.32,
              right: width * 0.05,
              transform: [
                { scale: beatExpansion },
                { translateY: floatX },
              ],
            },
          ]}
        />
      </View>

      {/* 2. Cosmic Beat Shockwave Ring */}
      <Animated.View
        style={[
          styles.shockwaveRing,
          {
            width: width * 0.65,
            height: width * 0.65,
            borderRadius: (width * 0.65) / 2,
            top: height * 0.35 - (width * 0.65) / 2,
            left: width * 0.5 - (width * 0.65) / 2,
            opacity: shockwaveOpacity,
            transform: [{ scale: shockwavePulse }],
          },
        ]}
      />

      {/* 3. Multi-Layer Star & Particle Universe */}
      {PARTICLE_SEEDS.map((p) => {
        const posX = p.xPct * width;
        const posY = p.yPct * height;
        const isFg = p.depth === 'fg';
        const isBg = p.depth === 'bg';

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                left: posX,
                top: posY,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.color,
                shadowColor: p.color,
                shadowOpacity: isFg ? 0.95 : 0.65,
                shadowRadius: isFg ? 10 : 5,
                elevation: isFg ? 6 : 2,
                opacity: isBg
                  ? 0.45 + trebleEnergy * 0.45
                  : isFg
                  ? 0.92
                  : 0.72 + midEnergy * 0.25,
                transform: [
                  { translateY: isFg ? floatY : isBg ? floatX : floatY },
                  { scale: isBg ? 1.0 : beatExpansion },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  auroraBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  ambientAuraBlob: {
    position: 'absolute',
    opacity: 0.65,
  },
  shockwaveRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#06B6D4',
    backgroundColor: 'transparent',
  },
  particle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
  },
});

export default AuroraParticleUniverse;

