import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// 32 Multi-layered 3D space particles
const PARTICLES_3D = Array.from({ length: 32 }, (_, i) => {
  const angle = (i * 360) / 32;
  const distRatio = 0.52 + (i % 4) * 0.16;
  const size = 4 + (i % 3) * 2.5;
  const colors = ['#EC4899', '#8B5CF6', '#38BDF8', '#10B981', '#F59E0B', '#A855F7'];
  return {
    id: i,
    angle,
    distRatio,
    size,
    color: colors[i % colors.length],
  };
});

export const ParticleExplosion3D = React.memo(({
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
  // Continuous 3D Orbital Rotations
  const rotate3D = useRef(new Animated.Value(0)).current;
  const floatWave = useRef(new Animated.Value(0)).current;

  // Real-time Beat Explosion
  const burstScale = useRef(new Animated.Value(1)).current;
  const shockwavePulse = useRef(new Animated.Value(1)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlaying) return;

    const loopRotate = Animated.loop(
      Animated.timing(rotate3D, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true })
    );
    const loopFloat = Animated.loop(
      Animated.sequence([
        Animated.timing(floatWave, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatWave, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    loopRotate.start();
    loopFloat.start();

    return () => {
      loopRotate.stop();
      loopFloat.stop();
    };
  }, [isPlaying]);

  // React to Sub-Bass Beats
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    Animated.sequence([
      Animated.timing(burstScale, {
        toValue: 1.35 + (bassEnergy || 0.2) * 0.25,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(burstScale, {
        toValue: 1.0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    shockwavePulse.setValue(1.0);
    shockwaveOpacity.setValue(0.75 + (bassEnergy || 0.2) * 0.25);
    Animated.parallel([
      Animated.timing(shockwavePulse, {
        toValue: 1.85,
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

  const spinOrbit = rotate3D.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const baseRadius = artworkSize * 0.82;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Background (Only when no video) */}
      {!hasVideo && (
        <LinearGradient
          colors={['#070814', '#180B28', '#05060D']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Center 3D Stage */}
      <View style={styles.centerStage}>
        {/* Glowing Sub-Bass Nebula Aura */}
        <Animated.View
          style={[
            styles.nebulaAura,
            {
              width: artworkSize * 1.35,
              height: artworkSize * 1.35,
              borderRadius: (artworkSize * 1.35) / 2,
              transform: [{ scale: burstScale }],
            },
          ]}
        />

        {/* Dynamic 3D Orbital Plane 1 (Tilted 3D Ellipse) */}
        <Animated.View
          style={[
            styles.orbitalPlane,
            {
              width: baseRadius * 2,
              height: baseRadius * 2,
              transform: [
                { rotate: spinOrbit },
                { scaleY: 0.65 }, // 3D Perspective foreshortening
                { scale: burstScale },
              ],
            },
          ]}
        >
          {PARTICLES_3D.slice(0, 16).map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const dist = baseRadius * p.distRatio;
            const posX = Math.cos(rad) * dist;
            const posY = Math.sin(rad) * dist;

            return (
              <Animated.View
                key={p.id}
                style={[
                  styles.particle3D,
                  {
                    width: p.size,
                    height: p.size,
                    borderRadius: p.size / 2,
                    backgroundColor: p.color,
                    shadowColor: p.color,
                    transform: [
                      { translateX: posX },
                      { translateY: posY },
                    ],
                    opacity: 0.75 + (trebleEnergy || 0.2) * 0.25,
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Dynamic 3D Orbital Plane 2 (Counter-Tilted 3D Ellipse) */}
        <Animated.View
          style={[
            styles.orbitalPlane,
            {
              width: baseRadius * 2.2,
              height: baseRadius * 2.2,
              transform: [
                { rotate: '-35deg' },
                { rotate: spinOrbit },
                { scaleX: 0.70 },
                { scale: burstScale },
              ],
            },
          ]}
        >
          {PARTICLES_3D.slice(16, 32).map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const dist = baseRadius * 1.1 * p.distRatio;
            const posX = Math.cos(rad) * dist;
            const posY = Math.sin(rad) * dist;

            return (
              <Animated.View
                key={p.id}
                style={[
                  styles.particle3D,
                  {
                    width: p.size,
                    height: p.size,
                    borderRadius: p.size / 2,
                    backgroundColor: p.color,
                    shadowColor: p.color,
                    transform: [
                      { translateX: posX },
                      { translateY: posY },
                    ],
                    opacity: 0.85,
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Explosive Beat Shockwave Ring */}
        <Animated.View
          style={[
            styles.explosionRing,
            {
              width: artworkSize * 1.4,
              height: artworkSize * 1.4,
              borderRadius: (artworkSize * 1.4) / 2,
              borderColor: '#EC4899',
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
  nebulaAura: {
    position: 'absolute',
    backgroundColor: 'rgba(236, 72, 153, 0.20)',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 32,
  },
  orbitalPlane: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle3D: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  explosionRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
  },
});

export default ParticleExplosion3D;

