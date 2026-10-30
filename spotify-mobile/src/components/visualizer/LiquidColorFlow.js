import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Complementary palette sets derived from track attributes
const PALETTE_PRESETS = [
  {
    bg: ['#0B081E', '#180B2D', '#070D1F'],
    blob1: 'rgba(139, 92, 246, 0.45)', // Electric Violet
    blob2: 'rgba(236, 72, 153, 0.38)', // Radiant Rose
    blob3: 'rgba(6, 182, 212, 0.32)',  // Neon Cyan
  },
  {
    bg: ['#06121E', '#0B1E2D', '#080C1A'],
    blob1: 'rgba(6, 182, 212, 0.42)',  // Ocean Cyan
    blob2: 'rgba(16, 185, 129, 0.35)', // Emerald Mist
    blob3: 'rgba(99, 102, 241, 0.36)', // Deep Indigo
  },
  {
    bg: ['#1A0B1A', '#260B1F', '#0D0614'],
    blob1: 'rgba(244, 63, 94, 0.40)',  // Sunset Crimson
    blob2: 'rgba(168, 85, 247, 0.42)', // Mystic Purple
    blob3: 'rgba(245, 158, 11, 0.30)', // Amber Warmth
  },
  {
    bg: ['#080E1A', '#11172E', '#05070F'],
    blob1: 'rgba(59, 130, 246, 0.42)', // Sapphire Blue
    blob2: 'rgba(139, 92, 246, 0.38)', // Royal Violet
    blob3: 'rgba(34, 211, 238, 0.34)', // Sky Cyan
  },
];

export const LiquidColorFlow = React.memo(({
  width,
  height,
  isPlaying,
  audioEnergy = 0.2,
  bassEnergy = 0.2,
  midEnergy = 0.2,
  trebleEnergy = 0.2,
  beatCount = 0,
  trackId,
}) => {
  // Derive complementary palette based on track ID
  const palette = useMemo(() => {
    const key = String(trackId || '0');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % PALETTE_PRESETS.length;
    return PALETTE_PRESETS[idx];
  }, [trackId]);

  // Continuous Fluid Morphing Loops
  const fluidDrift1 = useRef(new Animated.Value(0)).current;
  const fluidDrift2 = useRef(new Animated.Value(0)).current;
  const colorBreathe = useRef(new Animated.Value(1)).current;

  // Real-time Beat Soft Expansion
  const beatColorScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isPlaying) return;

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(fluidDrift1, { toValue: 1, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(fluidDrift1, { toValue: 0, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(fluidDrift2, { toValue: 1, duration: 8200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(fluidDrift2, { toValue: 0, duration: 8200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loopBreathe = Animated.loop(
      Animated.sequence([
        Animated.timing(colorBreathe, { toValue: 1.14, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(colorBreathe, { toValue: 0.95, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    loop1.start();
    loop2.start();
    loopBreathe.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loopBreathe.stop();
    };
  }, [isPlaying]);

  // React to Bass & Beats with subtle organic expansion
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    Animated.sequence([
      Animated.timing(beatColorScale, {
        toValue: 1.18 + bassEnergy * 0.15,
        duration: 95,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(beatColorScale, {
        toValue: 1.0,
        friction: 6,
        tension: 35,
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatCount, isPlaying, bassEnergy]);

  const transX1 = fluidDrift1.interpolate({
    inputRange: [0, 1],
    outputRange: [-25, 25],
  });

  const transY1 = fluidDrift1.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -20],
  });

  const transX2 = fluidDrift2.interpolate({
    inputRange: [0, 1],
    outputRange: [30, -30],
  });

  const transY2 = fluidDrift2.interpolate({
    inputRange: [0, 1],
    outputRange: [-25, 25],
  });

  const blobSize = Math.max(width, height) * 0.65;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Base Ambient Complementary Gradient */}
      <LinearGradient
        colors={palette.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Morphing Fluid Color Field Blob 1 (Top-Left / Mid) */}
      <Animated.View
        style={[
          styles.fluidBlob,
          {
            width: blobSize,
            height: blobSize,
            borderRadius: blobSize / 2,
            backgroundColor: palette.blob1,
            top: height * 0.10,
            left: -blobSize * 0.25,
            transform: [
              { translateX: transX1 },
              { translateY: transY1 },
              { scale: Animated.multiply(beatColorScale, colorBreathe) },
            ],
          },
        ]}
      />

      {/* 3. Morphing Fluid Color Field Blob 2 (Center-Right / Bottom) */}
      <Animated.View
        style={[
          styles.fluidBlob,
          {
            width: blobSize * 1.1,
            height: blobSize * 1.1,
            borderRadius: (blobSize * 1.1) / 2,
            backgroundColor: palette.blob2,
            bottom: height * 0.12,
            right: -blobSize * 0.30,
            transform: [
              { translateX: transX2 },
              { translateY: transY2 },
              { scale: beatColorScale },
            ],
          },
        ]}
      />

      {/* 4. Center Harmonizing Aura Blob 3 */}
      <Animated.View
        style={[
          styles.fluidBlob,
          {
            width: blobSize * 0.9,
            height: blobSize * 0.9,
            borderRadius: (blobSize * 0.9) / 2,
            backgroundColor: palette.blob3,
            top: height * 0.32,
            left: width * 0.5 - (blobSize * 0.9) / 2,
            transform: [
              { translateY: transX1 },
              { scale: Animated.multiply(colorBreathe, new Animated.Value(1 + midEnergy * 0.12)) },
            ],
          },
        ]}
      />

      {/* 5. Contrast Vignette Scrim (Ensures Controls & Text Always Pop) */}
      <LinearGradient
        colors={['rgba(5, 6, 12, 0.25)', 'transparent', 'rgba(5, 6, 12, 0.45)']}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  fluidBlob: {
    position: 'absolute',
    opacity: 0.60,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 40,
    elevation: 8,
  },
});

export default LiquidColorFlow;

