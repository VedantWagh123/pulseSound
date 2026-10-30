import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const LiquidBeatWaves = React.memo(({
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
  // Continuous undulating wave loops
  const waveFlow1 = useRef(new Animated.Value(0)).current;
  const waveFlow2 = useRef(new Animated.Value(0)).current;
  const waveFlow3 = useRef(new Animated.Value(0)).current;

  // Real-time Beat Surges
  const waveSurge = useRef(new Animated.Value(1)).current;
  const subBassScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isPlaying) return;

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(waveFlow1, { toValue: 1, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveFlow1, { toValue: 0, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(waveFlow2, { toValue: 1, duration: 4900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveFlow2, { toValue: 0, duration: 4900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loop3 = Animated.loop(
      Animated.sequence([
        Animated.timing(waveFlow3, { toValue: 1, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveFlow3, { toValue: 0, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    loop1.start();
    loop2.start();
    loop3.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [isPlaying]);

  // React to Bass & Beats
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    // Controlled wave surge on detected beats
    Animated.sequence([
      Animated.timing(waveSurge, {
        toValue: 1.28 + bassEnergy * 0.22,
        duration: 85,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(waveSurge, {
        toValue: 1.0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Deep sub-bass undulation
    Animated.sequence([
      Animated.timing(subBassScale, {
        toValue: 1.18 + audioEnergy * 0.15,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(subBassScale, {
        toValue: 1.0,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatCount, isPlaying, bassEnergy, audioEnergy]);

  const translateY1 = waveFlow1.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 16],
  });

  const translateY2 = waveFlow2.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -18],
  });

  const translateY3 = waveFlow3.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 22],
  });

  // 14 floating rhythmic liquid droplets
  const droplets = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: (i * (width / 14) + 16) % width,
      y: ((i * 59) % (height * 0.55)) + height * 0.18,
      size: 4 + (i % 3) * 2,
      color: ['#06B6D4', '#8B5CF6', '#EC4899', '#10B981', '#38BDF8'][i % 5],
    }));
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dark Ambient Base Gradient (Only if no video) */}
      {!hasVideo && (
        <LinearGradient
          colors={['#060B18', '#0E0924', '#05060D']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* 1. Upper Treble / Shimmer Wave Ribbon */}
      <Animated.View
        style={[
          styles.waveRibbonContainer,
          {
            top: height * 0.12,
            transform: [
              { translateY: translateY1 },
              { scaleY: subBassScale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(16, 185, 129, 0.28)', 'rgba(6, 182, 212, 0.36)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.waveRibbon}
        />
      </Animated.View>

      {/* 2. Central Liquid Beat Harmonic Wave Ribbon */}
      <Animated.View
        style={[
          styles.waveRibbonContainer,
          {
            top: height * 0.36,
            height: 96,
            transform: [
              { translateY: translateY2 },
              { scaleY: waveSurge },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(6, 182, 212, 0.32)', 'rgba(139, 92, 246, 0.42)', 'rgba(236, 72, 153, 0.32)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.waveRibbon}
        />
      </Animated.View>

      {/* 3. Lower Sub-Bass Wave Ribbon */}
      <Animated.View
        style={[
          styles.waveRibbonContainer,
          {
            bottom: height * 0.15,
            height: 110,
            transform: [
              { translateY: translateY3 },
              { scaleY: Animated.multiply(waveSurge, subBassScale) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(236, 72, 153, 0.36)', 'rgba(139, 92, 246, 0.38)', 'rgba(59, 130, 246, 0.28)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.waveRibbon}
        />
      </Animated.View>

      {/* 4. Ambient Liquid Droplets */}
      {droplets.map((d) => (
        <Animated.View
          key={d.id}
          style={[
            styles.droplet,
            {
              left: d.x,
              top: d.y,
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              backgroundColor: d.color,
              shadowColor: d.color,
              opacity: isPlaying ? 0.75 + trebleEnergy * 0.25 : 0.2,
              transform: [{ scale: waveSurge }],
            },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  waveRibbonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 78,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveRibbon: {
    width: '100%',
    height: '100%',
  },
  droplet: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default LiquidBeatWaves;

