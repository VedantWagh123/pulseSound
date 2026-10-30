import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// 16 Laser Equalizer Columns in circular matrix
const MATRIX_BARS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i * 360) / 16;
  const rad = (angle * Math.PI) / 180;
  const colors = ['#00F0FF', '#FF007F', '#7928CA', '#00FF66', '#FFB800', '#00F0FF'];
  return {
    id: `matrix-bar-${i}`,
    angle,
    rad,
    cos: Math.cos(rad),
    sin: Math.sin(rad),
    color: colors[i % colors.length],
  };
});

// 24 Cyber Embers
const CYBER_EMBERS = Array.from({ length: 24 }, (_, i) => ({
  id: `ember-${i}`,
  baseRadius: 60 + (i % 4) * 28,
  size: 3 + (i % 3) * 2,
  angle: (i * 360) / 24,
  color: i % 2 === 0 ? '#00F0FF' : '#FF007F',
}));

export const CyberNeonMatrix = React.memo(({
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
  const centerX = width / 2;
  const centerY = height * 0.42;

  const spinMatrix = useRef(new Animated.Value(0)).current;
  const pulseCore = useRef(new Animated.Value(1)).current;
  const hexBreath = useRef(new Animated.Value(1)).current;
  const barSurge = useRef(new Animated.Value(0)).current;
  const laserOpacity = useRef(new Animated.Value(0.4)).current;

  // Rotations & Pulse Loops
  useEffect(() => {
    if (!isPlaying) return;

    const animSpin = Animated.loop(
      Animated.timing(spinMatrix, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const animBreath = Animated.loop(
      Animated.sequence([
        Animated.timing(hexBreath, { toValue: 1.12, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(hexBreath, { toValue: 0.95, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    animSpin.start();
    animBreath.start();

    return () => {
      animSpin.stop();
      animBreath.stop();
    };
  }, [isPlaying]);

  // Transients & Sub-Bass Reactions
  useEffect(() => {
    if (!isPlaying || beatCount === 0) return;

    // Core Cyber Blast
    Animated.sequence([
      Animated.timing(pulseCore, {
        toValue: 1.45 + (bassEnergy || 0.2) * 0.35,
        duration: 60,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(pulseCore, {
        toValue: 1.0,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Laser Bar Surge
    Animated.sequence([
      Animated.timing(barSurge, {
        toValue: 24 + (audioEnergy || 0.2) * 28,
        duration: 70,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(barSurge, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Cyber flash
    laserOpacity.setValue(1.0);
    Animated.timing(laserOpacity, {
      toValue: 0.35,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [beatCount, isPlaying, bassEnergy, audioEnergy]);

  const spinAngle = spinMatrix.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinCounter = spinMatrix.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dark Ambient Base Gradient (Only when video is off) */}
      {!hasVideo && (
        <LinearGradient
          colors={['#04050D', '#0F091E', '#020308']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Cyber Ambient Aura */}
      <View
        style={[
          styles.cyberGlow,
          {
            left: centerX - 130,
            top: centerY - 130,
            backgroundColor: hasVideo ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 0, 127, 0.18)',
          },
        ]}
      />

      {/* Center Cyber Core Diamond */}
      <Animated.View
        style={[
          styles.coreDiamond,
          {
            left: centerX - 26,
            top: centerY - 26,
            transform: [
              { scale: pulseCore },
              { rotate: spinAngle },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#00F0FF', '#7928CA', '#FF007F']}
          style={styles.diamondGradient}
        />
      </Animated.View>

      {/* Outer Hexagon Ring */}
      <Animated.View
        style={[
          styles.hexRing,
          {
            left: centerX - 75,
            top: centerY - 75,
            transform: [
              { scale: hexBreath },
              { rotate: spinCounter },
            ],
          },
        ]}
      />

      {/* 16 Radial Laser Equalizer Bars */}
      <Animated.View
        style={[
          styles.matrixContainer,
          {
            left: centerX,
            top: centerY,
            transform: [{ rotate: spinAngle }],
          },
        ]}
      >
        {MATRIX_BARS.map((bar, i) => {
          const barBaseRadius = 55;
          return (
            <Animated.View
              key={bar.id}
              style={[
                styles.laserBar,
                {
                  backgroundColor: bar.color,
                  shadowColor: bar.color,
                  opacity: laserOpacity,
                  transform: [
                    { rotate: `${bar.angle}deg` },
                    {
                      translateY: barSurge.interpolate({
                        inputRange: [0, 50],
                        outputRange: [-barBaseRadius, -(barBaseRadius + 18 + (i % 3) * 6)],
                      }),
                    },
                    {
                      scaleY: barSurge.interpolate({
                        inputRange: [0, 50],
                        outputRange: [1, 2.2],
                      }),
                    },
                  ],
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Orbiting Cyber Embers */}
      <Animated.View
        style={[
          styles.matrixContainer,
          {
            left: centerX,
            top: centerY,
            transform: [{ rotate: spinCounter }],
          },
        ]}
      >
        {CYBER_EMBERS.map((ember) => {
          const rad = (ember.angle * Math.PI) / 180;
          const x = Math.cos(rad) * ember.baseRadius;
          const y = Math.sin(rad) * ember.baseRadius;
          return (
            <View
              key={ember.id}
              style={[
                styles.emberDot,
                {
                  width: ember.size,
                  height: ember.size,
                  borderRadius: ember.size / 2,
                  backgroundColor: ember.color,
                  shadowColor: ember.color,
                  left: x - ember.size / 2,
                  top: y - ember.size / 2,
                },
              ]}
            />
          );
        })}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  cyberGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.5,
  },
  coreDiamond: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 14,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 18,
    elevation: 12,
  },
  diamondGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  hexRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(255, 0, 127, 0.65)',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  matrixContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laserBar: {
    position: 'absolute',
    width: 3.5,
    height: 22,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 6,
  },
  emberDot: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default CyberNeonMatrix;

