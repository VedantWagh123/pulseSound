import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Ring 1: 12 Inner Glowing Dots
const INNER_DOTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 360) / 12;
  const rad = (angle * Math.PI) / 180;
  return {
    id: `inner-${i}`,
    x: Math.cos(rad),
    y: Math.sin(rad),
    color: i % 2 === 0 ? '#38BDF8' : '#06B6D4',
  };
});

// Ring 2: 24 Mid Matrix Dots
const MID_DOTS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i * 360) / 24;
  const rad = (angle * Math.PI) / 180;
  const colors = ['#A855F7', '#EC4899', '#C084FC', '#8B5CF6'];
  return {
    id: `mid-${i}`,
    x: Math.cos(rad),
    y: Math.sin(rad),
    color: colors[i % colors.length],
  };
});

// Ring 3: 36 Outer Halo Dots
const OUTER_DOTS = Array.from({ length: 36 }, (_, i) => {
  const angle = (i * 360) / 36;
  const rad = (angle * Math.PI) / 180;
  const colors = ['#10B981', '#34D399', '#F59E0B', '#38BDF8'];
  return {
    id: `outer-${i}`,
    x: Math.cos(rad),
    y: Math.sin(rad),
    color: colors[i % colors.length],
  };
});

// 8 Radial Equalizer Beams (4 dots each)
const RADIAL_BEAMS = Array.from({ length: 8 }, (_, bIdx) => {
  const angle = (bIdx * 360) / 8;
  const rad = (angle * Math.PI) / 180;
  const dots = Array.from({ length: 4 }, (_, dIdx) => ({
    id: `beam-${bIdx}-${dIdx}`,
    baseDist: 40 + dIdx * 24,
    size: 3.5 + dIdx * 1.2,
    color: dIdx % 2 === 0 ? '#EC4899' : '#38BDF8',
  }));
  return {
    angle,
    cos: Math.cos(rad),
    sin: Math.sin(rad),
    dots,
  };
});

// Ambient Cosmic Stardust Grid for Fullscreen Immersion (Top to Bottom screen coverage)
const STARDUST_PARTICLES = Array.from({ length: 48 }, (_, i) => {
  const seedX = ((i * 37 + 13) % 100) / 100;
  const seedY = ((i * 59 + 29) % 100) / 100;
  const size = 2 + (i % 3) * 1.4;
  const colors = ['#38BDF8', '#C084FC', '#34D399', '#F472B6', '#FBBF24', '#818CF8', '#A78BFA'];
  return {
    id: `stardust-${i}`,
    relX: seedX,
    relY: seedY,
    size,
    color: colors[i % colors.length],
    delay: (i % 5) * 400,
  };
});

export const AdvancedDotVortex = React.memo(({
  width,
  height,
  artworkSize = 280,
  isPlaying,
  audioEnergy = 0.2,
  bassEnergy = 0.2,
  midEnergy = 0.2,
  trebleEnergy = 0.2,
  beatCount = 0,
  hasVideo = false,
  fullscreenProgress,
}) => {
  // Center anchor point (matching where artwork sits)
  const centerX = width / 2;
  const centerY = height * 0.42;

  // Safe fallback if fullscreenProgress is not provided
  const fallbackProgress = useRef(new Animated.Value(0)).current;
  const effectiveProgress = (fullscreenProgress && typeof fullscreenProgress.interpolate === 'function')
    ? fullscreenProgress
    : fallbackProgress;

  // Orbital rotations
  const rotateClockwise = useRef(new Animated.Value(0)).current;
  const rotateCounterClockwise = useRef(new Animated.Value(0)).current;
  const breathingWave = useRef(new Animated.Value(0)).current;

  // Continuous Color Cycle for dynamic, rich ambient shifting
  const colorCycle = useRef(new Animated.Value(0)).current;

  // Beat transient reactions
  const corePulse = useRef(new Animated.Value(1)).current;
  const shockwaveScale = useRef(new Animated.Value(1)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;
  const radialPush = useRef(new Animated.Value(0)).current;

  // Continuous rotational, breathing, and color loops
  useEffect(() => {
    if (!isPlaying) return;

    const animRotateCW = Animated.loop(
      Animated.timing(rotateClockwise, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const animRotateCCW = Animated.loop(
      Animated.timing(rotateCounterClockwise, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const animBreath = Animated.loop(
      Animated.sequence([
        Animated.timing(breathingWave, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathingWave, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const animColorCycle = Animated.loop(
      Animated.timing(colorCycle, {
        toValue: 3,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animRotateCW.start();
    animRotateCCW.start();
    animBreath.start();
    animColorCycle.start();

    return () => {
      animRotateCW.stop();
      animRotateCCW.stop();
      animBreath.stop();
      animColorCycle.stop();
    };
  }, [isPlaying]);

  // Transients & Sub-Bass Reactions
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    // Core expansion burst
    Animated.sequence([
      Animated.timing(corePulse, {
        toValue: 1.35 + (bassEnergy || 0.2) * 0.25,
        duration: 65,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(corePulse, {
        toValue: 1.0,
        friction: 5,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // Shockwave ring expansion
    shockwaveScale.setValue(1.0);
    shockwaveOpacity.setValue(0.85);
    Animated.parallel([
      Animated.timing(shockwaveScale, {
        toValue: 2.3,
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

    // Radial beam dot jump
    Animated.sequence([
      Animated.timing(radialPush, {
        toValue: 20 + (audioEnergy || 0.2) * 24,
        duration: 75,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(radialPush, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatCount, isPlaying, bassEnergy, audioEnergy]);

  const spinCW = rotateClockwise.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinCCW = rotateCounterClockwise.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const breathScale = breathingWave.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.08],
  });

  // Fullscreen Expansion Interpolations
  // Moves anchor smoothly from height * 0.42 to height * 0.50 (true screen center)
  const fullscreenTranslateY = effectiveProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height * 0.08],
  });

  // Scales entire vortex outward to span the entire phone viewport
  const fullscreenScale = effectiveProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.62],
  });

  // Ambient Stardust Opacity (appears smoothly as fullscreen engages)
  const stardustOpacity = effectiveProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.45, 0.85],
  });

  // Color Cycling Auras (Continuous smooth color crossfades)
  const auraCyanOpacity = colorCycle.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0.75, 0.15, 0.15, 0.75],
  });
  const auraPurpleOpacity = colorCycle.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0.15, 0.85, 0.15, 0.15],
  });
  const auraEmeraldOpacity = colorCycle.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0.15, 0.15, 0.8, 0.15],
  });

  const innerRadius = 52 + (midEnergy || 0.2) * 14;
  const midRadius = 96 + (bassEnergy || 0.2) * 20;
  const outerRadius = 142 + (bassEnergy || 0.2) * 28;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Rich Deep Cosmic Gradient when Video is off */}
      {!hasVideo && (
        <LinearGradient
          colors={['#050614', '#0A061E', '#020308']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Atmospheric Shifting Color Auras */}
      <Animated.View
        style={[
          styles.glowAura,
          {
            left: centerX - 160,
            top: centerY - 160,
            backgroundColor: 'rgba(56, 189, 248, 0.28)',
            opacity: auraCyanOpacity,
            transform: [{ translateY: fullscreenTranslateY }, { scale: fullscreenScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowAura,
          {
            left: centerX - 160,
            top: centerY - 160,
            backgroundColor: 'rgba(168, 85, 247, 0.32)',
            opacity: auraPurpleOpacity,
            transform: [{ translateY: fullscreenTranslateY }, { scale: fullscreenScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowAura,
          {
            left: centerX - 160,
            top: centerY - 160,
            backgroundColor: 'rgba(16, 185, 129, 0.26)',
            opacity: auraEmeraldOpacity,
            transform: [{ translateY: fullscreenTranslateY }, { scale: fullscreenScale }],
          },
        ]}
      />

      {/* Fullscreen Ambient Stardust Particles (Spanning top to bottom of screen) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: stardustOpacity,
            transform: [{ scale: breathScale }],
          },
        ]}
      >
        {STARDUST_PARTICLES.map((particle) => (
          <View
            key={particle.id}
            style={[
              styles.stardustDot,
              {
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                backgroundColor: particle.color,
                shadowColor: particle.color,
                left: particle.relX * width,
                top: particle.relY * height,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Main Vortex Scaling Container (Smooth native transform to fullscreen) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { translateY: fullscreenTranslateY },
              { scale: fullscreenScale },
            ],
          },
        ]}
      >
        {/* Pulsing Shockwave Ripple on Beats */}
        <Animated.View
          style={[
            styles.shockwaveRing,
            {
              left: centerX - 80,
              top: centerY - 80,
              opacity: shockwaveOpacity,
              transform: [{ scale: shockwaveScale }],
            },
          ]}
        />

        {/* Central Core Energy Dot Sun */}
        <Animated.View
          style={[
            styles.centerSun,
            {
              left: centerX - 22,
              top: centerY - 22,
              transform: [{ scale: corePulse }, { scale: breathScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#38BDF8', '#8B5CF6']}
            style={styles.sunGradient}
          />
        </Animated.View>

        {/* 8-Way Radial Equalizer Dots */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [{ scale: breathScale }],
            },
          ]}
        >
          {RADIAL_BEAMS.map((beam, bIdx) => (
            <React.Fragment key={`beam-group-${bIdx}`}>
              {beam.dots.map((dot, dIdx) => {
                const currentDist = dot.baseDist;
                return (
                  <Animated.View
                    key={dot.id}
                    style={[
                      styles.matrixDot,
                      {
                        width: dot.size,
                        height: dot.size,
                        borderRadius: dot.size / 2,
                        backgroundColor: dot.color,
                        shadowColor: dot.color,
                        left: centerX + beam.cos * currentDist - dot.size / 2,
                        top: centerY + beam.sin * currentDist - dot.size / 2,
                        transform: [
                          {
                            translateX: radialPush.interpolate({
                              inputRange: [0, 40],
                              outputRange: [0, beam.cos * (14 + dIdx * 6)],
                            }),
                          },
                          {
                            translateY: radialPush.interpolate({
                              inputRange: [0, 40],
                              outputRange: [0, beam.sin * (14 + dIdx * 6)],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </Animated.View>

        {/* Ring 1: Inner Orbiting Cyan Dots (Clockwise) */}
        <Animated.View
          style={[
            styles.rotationContainer,
            {
              left: centerX - innerRadius,
              top: centerY - innerRadius,
              width: innerRadius * 2,
              height: innerRadius * 2,
              transform: [{ rotate: spinCW }],
            },
          ]}
        >
          {INNER_DOTS.map((dot) => (
            <View
              key={dot.id}
              style={[
                styles.matrixDot,
                {
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: dot.color,
                  shadowColor: dot.color,
                  left: innerRadius + dot.x * innerRadius - 3,
                  top: innerRadius + dot.y * innerRadius - 3,
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Ring 2: Mid Orbiting Electric Violet Dots (Counter-Clockwise) */}
        <Animated.View
          style={[
            styles.rotationContainer,
            {
              left: centerX - midRadius,
              top: centerY - midRadius,
              width: midRadius * 2,
              height: midRadius * 2,
              transform: [{ rotate: spinCCW }, { scale: breathScale }],
            },
          ]}
        >
          {MID_DOTS.map((dot) => (
            <View
              key={dot.id}
              style={[
                styles.matrixDot,
                {
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: dot.color,
                  shadowColor: dot.color,
                  left: midRadius + dot.x * midRadius - 3.5,
                  top: midRadius + dot.y * midRadius - 3.5,
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Ring 3: Outer Halo Emerald & Gold Dots (Clockwise, Slow Wave) */}
        <Animated.View
          style={[
            styles.rotationContainer,
            {
              left: centerX - outerRadius,
              top: centerY - outerRadius,
              width: outerRadius * 2,
              height: outerRadius * 2,
              transform: [{ rotate: spinCW }],
            },
          ]}
        >
          {OUTER_DOTS.map((dot) => (
            <View
              key={dot.id}
              style={[
                styles.matrixDot,
                {
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: dot.color,
                  shadowColor: dot.color,
                  left: outerRadius + dot.x * outerRadius - 4,
                  top: outerRadius + dot.y * outerRadius - 4,
                },
              ]}
            />
          ))}
        </Animated.View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  glowAura: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  shockwaveRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  centerSun: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 18,
    elevation: 10,
  },
  sunGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  rotationContainer: {
    position: 'absolute',
  },
  matrixDot: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 6,
  },
  stardustDot: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 4,
  },
});

export default AdvancedDotVortex;
