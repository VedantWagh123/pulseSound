import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Soft Glowing Aurora Motes (36 drifting luminous particles)
const AURORA_MOTES = Array.from({ length: 36 }, (_, i) => {
  const seedX = ((i * 47 + 19) % 100) / 100;
  const seedY = ((i * 71 + 37) % 100) / 100;
  const size = 2.5 + (i % 4) * 1.5;
  const colors = [
    '#34D399', // Emerald
    '#38BDF8', // Sky Cyan
    '#A78BFA', // Soft Violet
    '#F472B6', // Luminous Rose
    '#FBBF24', // Amber Gold
    '#2DD4BF', // Teal
  ];
  return {
    id: `mote-${i}`,
    relX: seedX,
    relY: seedY,
    size,
    color: colors[i % colors.length],
    swayPeriod: 3000 + (i % 5) * 800,
  };
});

// Shimmering Vertical Aurora Ray Beams (10 vertical curtain pillars)
const AURORA_RAYS = Array.from({ length: 10 }, (_, i) => {
  const relLeft = (i / 10) * 100 + ((i % 3) * 2);
  const widthRatio = 0.08 + (i % 3) * 0.04;
  return {
    id: `ray-${i}`,
    relLeft,
    widthRatio,
    tilt: i % 2 === 0 ? '-3deg' : '4deg',
  };
});

export const AuroraFlowVisualizer = React.memo(({
  width,
  height,
  isPlaying,
  audioEnergy = 0.2,
  bassEnergy = 0.2,
  midEnergy = 0.2,
  trebleEnergy = 0.2,
  beatCount = 0,
  hasVideo = false,
  fullscreenProgress,
}) => {
  // Safe progress fallback
  const fallbackProgress = useRef(new Animated.Value(0)).current;
  const effectiveProgress = (fullscreenProgress && typeof fullscreenProgress.interpolate === 'function')
    ? fullscreenProgress
    : fallbackProgress;

  // Flowing Wave Animations (Harmonic oscillating sinusoidal swaying)
  const wave1Sway = useRef(new Animated.Value(0)).current;
  const wave2Sway = useRef(new Animated.Value(0)).current;
  const wave3Sway = useRef(new Animated.Value(0)).current;
  const upwardSurge = useRef(new Animated.Value(0)).current;

  // Particle Mote Drifting (Gentle vertical lift)
  const moteDrift = useRef(new Animated.Value(0)).current;

  // Continuous Dynamic Color Phase Cycle (0 -> 1 -> 2 -> 3 -> 0)
  const colorCycle = useRef(new Animated.Value(0)).current;

  // Beat Transient Reaction (Sub-bass burst)
  const beatBurst = useRef(new Animated.Value(1)).current;
  const flareOpacity = useRef(new Animated.Value(0)).current;

  // Fluid Waving Loops
  useEffect(() => {
    if (!isPlaying) return;

    // Ribbon Wave 1 (Emerald/Cyan flow: 7.5s cycle)
    const animWave1 = Animated.loop(
      Animated.sequence([
        Animated.timing(wave1Sway, {
          toValue: 1,
          duration: 3750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wave1Sway, {
          toValue: -1,
          duration: 3750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Ribbon Wave 2 (Violet/Rose flow: 9.2s cycle)
    const animWave2 = Animated.loop(
      Animated.sequence([
        Animated.timing(wave2Sway, {
          toValue: -1,
          duration: 4600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wave2Sway, {
          toValue: 1,
          duration: 4600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Ribbon Wave 3 (Amber/Teal flow: 6.2s cycle)
    const animWave3 = Animated.loop(
      Animated.sequence([
        Animated.timing(wave3Sway, {
          toValue: 1,
          duration: 3100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wave3Sway, {
          toValue: -1,
          duration: 3100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Continuous Ethereal Upward Surge (Bottom to Top fluid lift: 5.5s)
    const animSurge = Animated.loop(
      Animated.sequence([
        Animated.timing(upwardSurge, {
          toValue: 1,
          duration: 2750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(upwardSurge, {
          toValue: 0,
          duration: 2750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Continuous Color Cycle (16s smooth transition between palettes)
    const animColor = Animated.loop(
      Animated.timing(colorCycle, {
        toValue: 3,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Mote Drifting (Slow infinite ascent)
    const animMotes = Animated.loop(
      Animated.timing(moteDrift, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animWave1.start();
    animWave2.start();
    animWave3.start();
    animSurge.start();
    animColor.start();
    animMotes.start();

    return () => {
      animWave1.stop();
      animWave2.stop();
      animWave3.stop();
      animSurge.stop();
      animColor.stop();
      animMotes.stop();
    };
  }, [isPlaying]);

  // Transients & Sub-Bass Reactions
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    // Beat pulse burst
    Animated.sequence([
      Animated.timing(beatBurst, {
        toValue: 1.25 + (bassEnergy || 0.2) * 0.22,
        duration: 75,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(beatBurst, {
        toValue: 1.0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Luminescent flare flash
    flareOpacity.setValue(0.75);
    Animated.timing(flareOpacity, {
      toValue: 0,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [beatCount, isPlaying, bassEnergy]);

  // Color Crossfade Interpolations
  const nordicEmeraldOpacity = colorCycle.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0.85, 0.2, 0.2, 0.85],
  });
  const violetRoseOpacity = colorCycle.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0.2, 0.9, 0.2, 0.2],
  });
  const solarTealOpacity = colorCycle.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0.2, 0.2, 0.85, 0.2],
  });

  // Wave Sway Interpolations (Horizontal drift + vertical surge)
  const wave1TranslateX = wave1Sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width * 0.12, width * 0.12],
  });
  const wave2TranslateX = wave2Sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [width * 0.14, -width * 0.14],
  });
  const wave3TranslateX = wave3Sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width * 0.08, width * 0.08],
  });

  const surgeTranslateY = upwardSurge.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.06],
  });

  // Fullscreen coverage scale
  const fullscreenScale = effectiveProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.25],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Deep Cosmic Night Sky Background Layer */}
      {!hasVideo && (
        <LinearGradient
          colors={['#02040D', '#040B1E', '#090518']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Atmospheric Flare Burst on Beats */}
      <Animated.View
        style={[
          styles.auroraFlare,
          {
            opacity: flareOpacity,
            transform: [{ scale: beatBurst }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(56, 189, 248, 0.35)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Main Aurora Waves Container */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { translateY: surgeTranslateY },
              { scale: fullscreenScale },
            ],
          },
        ]}
      >
        {/* =============================================================== */}
        {/* Layer 1: Nordic Emerald & Arctic Cyan Curtain Wave              */}
        {/* =============================================================== */}
        <Animated.View
          style={[
            styles.curtainWaveContainer,
            {
              opacity: nordicEmeraldOpacity,
              transform: [{ translateX: wave1TranslateX }, { scale: beatBurst }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              'transparent',
              'rgba(16, 185, 129, 0.45)',
              'rgba(6, 182, 212, 0.55)',
              'rgba(56, 189, 248, 0.35)',
              'transparent',
            ]}
            start={{ x: 0.1, y: 1 }}
            end={{ x: 0.9, y: 0 }}
            style={[
              styles.curtainWave,
              { width: width * 1.5, height: height * 0.8 },
            ]}
          />
        </Animated.View>

        {/* =============================================================== */}
        {/* Layer 2: Ethereal Violet & Radiant Magenta Curtain Wave          */}
        {/* =============================================================== */}
        <Animated.View
          style={[
            styles.curtainWaveContainer,
            {
              opacity: violetRoseOpacity,
              transform: [{ translateX: wave2TranslateX }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              'transparent',
              'rgba(168, 85, 247, 0.50)',
              'rgba(236, 72, 153, 0.60)',
              'rgba(192, 132, 252, 0.35)',
              'transparent',
            ]}
            start={{ x: 0.8, y: 1 }}
            end={{ x: 0.2, y: 0 }}
            style={[
              styles.curtainWave,
              { width: width * 1.6, height: height * 0.85 },
            ]}
          />
        </Animated.View>

        {/* =============================================================== */}
        {/* Layer 3: Solar Teal & Luminous Amber Curtain Wave                */}
        {/* =============================================================== */}
        <Animated.View
          style={[
            styles.curtainWaveContainer,
            {
              opacity: solarTealOpacity,
              transform: [{ translateX: wave3TranslateX }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              'transparent',
              'rgba(20, 184, 166, 0.45)',
              'rgba(245, 158, 11, 0.45)',
              'rgba(56, 189, 248, 0.30)',
              'transparent',
            ]}
            start={{ x: 0.3, y: 1 }}
            end={{ x: 0.7, y: 0 }}
            style={[
              styles.curtainWave,
              { width: width * 1.5, height: height * 0.75 },
            ]}
          />
        </Animated.View>

        {/* =============================================================== */}
        {/* Layer 4: Shimmering Vertical Aurora Ray Pillars                 */}
        {/* =============================================================== */}
        <View style={StyleSheet.absoluteFill}>
          {AURORA_RAYS.map((ray, idx) => {
            const rayHeight = height * (0.45 + (idx % 4) * 0.12);
            return (
              <Animated.View
                key={ray.id}
                style={[
                  styles.auroraRay,
                  {
                    left: (width * ray.relLeft) / 100,
                    width: width * ray.widthRatio,
                    height: rayHeight,
                    bottom: height * 0.05,
                    transform: [
                      { rotate: ray.tilt },
                      { scaleY: beatBurst },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    'transparent',
                    idx % 2 === 0
                      ? 'rgba(56, 189, 248, 0.22)'
                      : 'rgba(168, 85, 247, 0.24)',
                    'transparent',
                  ]}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            );
          })}
        </View>

        {/* =============================================================== */}
        {/* Layer 5: Soft Floating Auroral Stardust Motes                    */}
        {/* =============================================================== */}
        <View style={StyleSheet.absoluteFill}>
          {AURORA_MOTES.map((mote) => {
            return (
              <Animated.View
                key={mote.id}
                style={[
                  styles.auroraMote,
                  {
                    width: mote.size,
                    height: mote.size,
                    borderRadius: mote.size / 2,
                    backgroundColor: mote.color,
                    shadowColor: mote.color,
                    left: mote.relX * width,
                    top: mote.relY * height,
                    transform: [
                      {
                        translateY: moteDrift.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -height * 0.15],
                        }),
                      },
                      { scale: beatBurst },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>
      </Animated.View>

      {/* Horizon Ambient Light Glow (Spanning bottom to top) */}
      <LinearGradient
        colors={['transparent', 'rgba(16, 185, 129, 0.10)', 'rgba(56, 189, 248, 0.18)']}
        style={styles.horizonGlow}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  auroraFlare: {
    ...StyleSheet.absoluteFillObject,
  },
  curtainWaveContainer: {
    position: 'absolute',
    bottom: -60,
    left: -80,
    right: -80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  curtainWave: {
    borderRadius: 180,
    transform: [{ rotate: '-8deg' }],
  },
  auroraRay: {
    position: 'absolute',
    borderRadius: 40,
    opacity: 0.65,
  },
  auroraMote: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 4,
  },
  horizonGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
});

export default AuroraFlowVisualizer;

