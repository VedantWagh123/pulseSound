import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// 8 Holographic frequency markers
const HOLO_MARKERS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  angle: (i * 360) / 8,
  color: i % 2 === 0 ? '#06B6D4' : '#8B5CF6',
}));

export const HolographicUniverse = React.memo(({
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
  // Continuous Holographic Rotations & Parallax Float
  const rotateHolo = useRef(new Animated.Value(0)).current;
  const parallaxFloat = useRef(new Animated.Value(0)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;

  // Real-time Beat Pulses
  const holoPulse = useRef(new Animated.Value(1)).current;
  const shockwavePulse = useRef(new Animated.Value(1)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlaying) return;

    const loopRotate = Animated.loop(
      Animated.timing(rotateHolo, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true })
    );
    const loopFloat = Animated.loop(
      Animated.sequence([
        Animated.timing(parallaxFloat, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(parallaxFloat, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loopScan = Animated.loop(
      Animated.sequence([
        Animated.timing(scanlineAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanlineAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );

    loopRotate.start();
    loopFloat.start();
    loopScan.start();

    return () => {
      loopRotate.stop();
      loopFloat.stop();
      loopScan.stop();
    };
  }, [isPlaying]);

  // React to Bass & Transients
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    Animated.sequence([
      Animated.timing(holoPulse, {
        toValue: 1.18 + (bassEnergy || 0.2) * 0.16,
        duration: 75,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(holoPulse, {
        toValue: 1.0,
        friction: 5,
        tension: 42,
        useNativeDriver: true,
      }),
    ]).start();

    shockwavePulse.setValue(1.0);
    shockwaveOpacity.setValue(0.70 + (bassEnergy || 0.2) * 0.25);
    Animated.parallel([
      Animated.timing(shockwavePulse, {
        toValue: 1.68,
        duration: 680,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(shockwaveOpacity, {
        toValue: 0,
        duration: 680,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatCount, isPlaying, bassEnergy]);

  const spinHolo = rotateHolo.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const floatY = parallaxFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  const scanY = scanlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-artworkSize * 0.45, artworkSize * 0.45],
  });

  const ringSize = artworkSize * 1.38;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Background (Only when no video) */}
      {!hasVideo && (
        <LinearGradient
          colors={['#050A18', '#0E0B24', '#03050C']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Center Holographic Stage */}
      <View style={styles.centerStage}>
        {/* Vertical Holographic Projection Light Beams */}
        <Animated.View
          style={[
            styles.verticalLaserBeam,
            {
              width: artworkSize * 0.9,
              height: height * 0.65,
              transform: [{ translateY: floatY }],
              opacity: 0.35 + (midEnergy || 0.2) * 0.35,
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(6, 182, 212, 0.22)', 'rgba(139, 92, 246, 0.28)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Horizontal 3D Projected Hologram Gyroscope Disk */}
        <Animated.View
          style={[
            styles.holoDiskContainer,
            {
              width: ringSize,
              height: ringSize,
              transform: [
                { translateY: floatY },
                { rotateX: '68deg' }, // 3D Perspective flatten
                { rotate: spinHolo },
                { scale: holoPulse },
              ],
            },
          ]}
        >
          {/* Outer Cyan Ring */}
          <View
            style={[
              styles.holoDiskRing,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderColor: '#06B6D4',
                borderWidth: 2,
                shadowColor: '#06B6D4',
                shadowOpacity: 0.9,
                shadowRadius: 16,
              },
            ]}
          />

          {/* Inner Dashed Ring */}
          <View
            style={[
              styles.holoDiskRing,
              {
                width: ringSize * 0.82,
                height: ringSize * 0.82,
                borderRadius: (ringSize * 0.82) / 2,
                borderColor: 'rgba(139, 92, 246, 0.55)',
                borderWidth: 1.5,
                borderStyle: 'dashed',
              },
            ]}
          />

          {/* 8 Holographic Frequency Markers */}
          {HOLO_MARKERS.map((m) => {
            const rad = (m.angle * Math.PI) / 180;
            const dist = ringSize * 0.48;
            const posX = Math.cos(rad) * dist;
            const posY = Math.sin(rad) * dist;

            return (
              <View
                key={m.id}
                style={[
                  styles.markerNode,
                  {
                    backgroundColor: m.color,
                    shadowColor: m.color,
                    transform: [
                      { translateX: posX },
                      { translateY: posY },
                    ],
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Vertical Tilted Outer Gimbal Ring */}
        <Animated.View
          style={[
            styles.gimbalRing,
            {
              width: ringSize * 1.15,
              height: ringSize * 1.15,
              borderRadius: (ringSize * 1.15) / 2,
              borderColor: 'rgba(236, 72, 153, 0.45)',
              transform: [
                { translateY: floatY },
                { rotateY: '60deg' },
                { rotate: spinHolo },
                { scale: holoPulse },
              ],
            },
          ]}
        />

        {/* Holographic Scanline Ribbon */}
        <Animated.View
          style={[
            styles.scanlineBar,
            {
              width: artworkSize * 1.15,
              transform: [{ translateY: scanY }],
              opacity: 0.55 + (trebleEnergy || 0.2) * 0.35,
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', '#38BDF8', '#8B5CF6', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Beat Shockwave Ring */}
        <Animated.View
          style={[
            styles.shockwaveRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: '#06B6D4',
              borderWidth: 2,
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
  verticalLaserBeam: {
    position: 'absolute',
    alignSelf: 'center',
  },
  holoDiskContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holoDiskRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
  },
  markerNode: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  gimbalRing: {
    position: 'absolute',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  scanlineBar: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  shockwaveRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
  },
});

export default HolographicUniverse;

