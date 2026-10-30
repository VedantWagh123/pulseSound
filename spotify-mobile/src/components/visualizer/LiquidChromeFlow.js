import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const LiquidChromeFlow = React.memo(({
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
  // Continuous Flow Loops
  const flow1 = useRef(new Animated.Value(0)).current;
  const flow2 = useRef(new Animated.Value(0)).current;
  const flow3 = useRef(new Animated.Value(0)).current;

  // Real-time Beat Deformation
  const chromeSurge = useRef(new Animated.Value(1)).current;
  const specularFlash = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!isPlaying) return;

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(flow1, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flow1, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(flow2, { toValue: 1, duration: 5400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flow2, { toValue: 0, duration: 5400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loop3 = Animated.loop(
      Animated.sequence([
        Animated.timing(flow3, { toValue: 1, duration: 6800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flow3, { toValue: 0, duration: 6800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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

    Animated.sequence([
      Animated.timing(chromeSurge, {
        toValue: 1.25 + (bassEnergy || 0.2) * 0.20,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(chromeSurge, {
        toValue: 1.0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(specularFlash, {
        toValue: 0.95,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(specularFlash, {
        toValue: 0.40,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatCount, isPlaying, bassEnergy]);

  const transY1 = flow1.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 16],
  });

  const transY2 = flow2.interpolate({
    inputRange: [0, 1],
    outputRange: [22, -18],
  });

  const transY3 = flow3.interpolate({
    inputRange: [0, 1],
    outputRange: [-15, 20],
  });

  // 12 Chrome specular glint beads
  const glints = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: (i * (width / 12) + 20) % width,
      y: ((i * 61) % (height * 0.52)) + height * 0.22,
      size: 5 + (i % 3) * 2.5,
      color: ['#E2E8F0', '#38BDF8', '#C084FC', '#F472B6'][i % 4],
    }));
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Background (Only when no video) */}
      {!hasVideo && (
        <LinearGradient
          colors={['#060814', '#110D26', '#040710']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* 1. Upper Iridescent Chrome Shimmer Ribbon */}
      <Animated.View
        style={[
          styles.chromeRibbonContainer,
          {
            top: height * 0.14,
            height: 84,
            transform: [
              { translateY: transY1 },
              { scaleY: chromeSurge },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(226, 232, 240, 0.28)', 'rgba(56, 189, 248, 0.42)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.chromeRibbon}
        />
      </Animated.View>

      {/* 2. Central Molten Chrome Fluid Wave Ribbon */}
      <Animated.View
        style={[
          styles.chromeRibbonContainer,
          {
            top: height * 0.35,
            height: 105,
            transform: [
              { translateY: transY2 },
              { scaleY: chromeSurge },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(192, 132, 252, 0.38)', 'rgba(244, 114, 182, 0.45)', 'rgba(6, 182, 212, 0.38)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.chromeRibbon}
        />
      </Animated.View>

      {/* 3. Lower Deep Metallic Chrome Ribbon */}
      <Animated.View
        style={[
          styles.chromeRibbonContainer,
          {
            bottom: height * 0.16,
            height: 110,
            transform: [
              { translateY: transY3 },
              { scaleY: chromeSurge },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(56, 189, 248, 0.35)', 'rgba(139, 92, 246, 0.40)', 'rgba(226, 232, 240, 0.25)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.chromeRibbon}
        />
      </Animated.View>

      {/* 4. Specular Chrome Glint Beads */}
      {glints.map((g) => (
        <Animated.View
          key={g.id}
          style={[
            styles.specularGlint,
            {
              left: g.x,
              top: g.y,
              width: g.size,
              height: g.size,
              borderRadius: g.size / 2,
              backgroundColor: g.color,
              shadowColor: g.color,
              opacity: isPlaying ? specularFlash : 0.25,
              transform: [{ scale: chromeSurge }],
            },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  chromeRibbonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chromeRibbon: {
    width: '100%',
    height: '100%',
  },
  specularGlint: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default LiquidChromeFlow;

