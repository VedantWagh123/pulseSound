import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoSplashScreen from 'expo-splash-screen';

export const SplashScreen = ({ onFinish }) => {
  const { width } = useWindowDimensions();

  // Master fade & scale for cinematic reveal - visible immediately on frame 1
  const masterFade = useRef(new Animated.Value(1)).current;
  const masterScale = useRef(new Animated.Value(1)).current;

  // Pulse & glow animations on the PULSE SOUND text
  const textScale = useRef(new Animated.Value(1)).current;
  const textGlow = useRef(new Animated.Value(0.75)).current;

  // Concentric dual acoustic rings
  const ring1Scale = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity = useRef(new Animated.Value(0.8)).current;
  const ring2Scale = useRef(new Animated.Value(0.8)).current;
  const ring2Opacity = useRef(new Animated.Value(0.5)).current;

  // 9-Bar Dynamic Audio Reactive Spectrum
  const bar1 = useRef(new Animated.Value(8)).current;
  const bar2 = useRef(new Animated.Value(14)).current;
  const bar3 = useRef(new Animated.Value(22)).current;
  const bar4 = useRef(new Animated.Value(32)).current;
  const bar5 = useRef(new Animated.Value(44)).current;
  const bar6 = useRef(new Animated.Value(32)).current;
  const bar7 = useRef(new Animated.Value(22)).current;
  const bar8 = useRef(new Animated.Value(14)).current;
  const bar9 = useRef(new Animated.Value(8)).current;

  // Horizontal sound pulse beam expand
  const lineScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Safely dismiss native splash once React component mounts
    try {
      if (ExpoSplashScreen && typeof ExpoSplashScreen.hideAsync === 'function') {
        ExpoSplashScreen.hideAsync().catch(() => {});
      }
    } catch (e) {}

    // 1. Entrance: Smooth fade-in and spring scale up
    Animated.parallel([
      Animated.timing(masterFade, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(masterScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(lineScale, {
        toValue: 1,
        duration: 750,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Dual Concentric Acoustic Pulse Rings
    const ring1Loop = Animated.loop(
      Animated.parallel([
        Animated.timing(ring1Scale, {
          toValue: 1.6,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(ring1Opacity, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );

    const ring2Loop = Animated.loop(
      Animated.sequence([
        Animated.delay(450),
        Animated.parallel([
          Animated.timing(ring2Scale, {
            toValue: 1.9,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(ring2Opacity, {
            toValue: 0,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    ring1Loop.start();
    ring2Loop.start();

    // 3. Continuous breathing pulse & glow on PULSE SOUND text
    const textLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(textScale, {
            toValue: 1.05,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(textGlow, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(textScale, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(textGlow, {
            toValue: 0.75,
            duration: 650,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    textLoop.start();

    // 4. Dynamic audio wave bounce for 9 frequency bars
    const bounce = (anim, min, max, dur) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: max,
            duration: dur,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: min,
            duration: dur,
            useNativeDriver: false,
          }),
        ])
      );

    const b1 = bounce(bar1, 6, 20, 230);
    const b2 = bounce(bar2, 10, 30, 200);
    const b3 = bounce(bar3, 14, 40, 270);
    const b4 = bounce(bar4, 20, 52, 190);
    const b5 = bounce(bar5, 26, 62, 240);
    const b6 = bounce(bar6, 20, 52, 190);
    const b7 = bounce(bar7, 14, 40, 270);
    const b8 = bounce(bar8, 10, 30, 200);
    const b9 = bounce(bar9, 6, 20, 230);

    b1.start();
    b2.start();
    b3.start();
    b4.start();
    b5.start();
    b6.start();
    b7.start();
    b8.start();
    b9.start();

    // 5. Fast splash duration in development so reloads are snappy
    const splashWait = typeof __DEV__ !== 'undefined' && __DEV__ ? 450 : 1100;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(masterFade, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(masterScale, {
          toValue: 1.05,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        ring1Loop.stop();
        ring2Loop.stop();
        textLoop.stop();
        b1.stop();
        b2.stop();
        b3.stop();
        b4.stop();
        b5.stop();
        b6.stop();
        b7.stop();
        b8.stop();
        b9.stop();
        if (onFinish) onFinish();
      });
    }, splashWait);

    return () => {
      clearTimeout(timer);
      ring1Loop.stop();
      ring2Loop.stop();
      textLoop.stop();
    };
  }, []);

  return (
    <View style={styles.root}>
      {/* Soft warm yellow glow centered around the lower middle sweet spot */}
      <LinearGradient
        colors={[
          'rgba(250, 204, 21, 0.12)', // Light radiant yellow aura
          'rgba(253, 224, 71, 0.05)', // Faint soft yellow
          'transparent',
        ]}
        start={{ x: 0.5, y: 0.4 }}
        end={{ x: 0.5, y: 0.85 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Main Center Stage - Positioned comfortably lower so it is NOT too high up */}
      <Animated.View
        style={[
          styles.centerStage,
          {
            opacity: masterFade,
            transform: [{ scale: masterScale }],
          },
        ]}
      >
        {/* Concentric Acoustic Rings Container */}
        <View style={styles.ringWrapper}>
          <Animated.View
            style={[
              styles.acousticRing,
              {
                transform: [{ scale: ring2Scale }],
                opacity: ring2Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.acousticRing,
              {
                transform: [{ scale: ring1Scale }],
                opacity: ring1Opacity,
              },
            ]}
          />

          {/* 9-Bar Advanced Audio Spectrum Wave */}
          <View style={styles.soundWaveRow}>
            <Animated.View style={[styles.waveBar, { height: bar1 }]} />
            <Animated.View style={[styles.waveBar, { height: bar2 }]} />
            <Animated.View style={[styles.waveBar, { height: bar3 }]} />
            <Animated.View style={[styles.waveBarMid, { height: bar4 }]} />
            <Animated.View style={[styles.waveBarCenter, { height: bar5 }]} />
            <Animated.View style={[styles.waveBarMid, { height: bar6 }]} />
            <Animated.View style={[styles.waveBar, { height: bar7 }]} />
            <Animated.View style={[styles.waveBar, { height: bar8 }]} />
            <Animated.View style={[styles.waveBar, { height: bar9 }]} />
          </View>
        </View>

        {/* The PULSE SOUND Brand Name with Live Animated Yellow Shimmer & Pulse */}
        <Animated.View
          style={[
            styles.textWrap,
            {
              transform: [{ scale: textScale }],
              opacity: textGlow,
            },
          ]}
        >
          <Text style={styles.pulseText}>PULSE SOUND</Text>
        </Animated.View>

        {/* Sleek Golden-Yellow Frequency Accent Line */}
        <Animated.View
          style={[
            styles.pulseLineWrap,
            {
              transform: [{ scaleX: lineScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', '#FDE047', '#FACC15', '#FDE047', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pulseLineGradient}
          />
        </Animated.View>

        {/* Minimal Subtitle in Audio-Engine Tracking Typography */}
        <View style={styles.subRow}>
          <View style={styles.yellowSparkDot} />
          <Text style={styles.subText}>HIGH FIDELITY • AUDIO ENGINE</Text>
          <View style={styles.yellowSparkDot} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#070810',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrapper: {
    width: 140,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  acousticRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    borderColor: '#FACC15',
    backgroundColor: 'rgba(250, 204, 21, 0.08)',
  },
  soundWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4.5,
    height: 64,
  },
  waveBar: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: '#FDE047',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  waveBarMid: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 5,
  },
  waveBarCenter: {
    width: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  textWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseText: {
    color: '#FFFFFF',
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: 4.5,
    textAlign: 'center',
    textShadowColor: 'rgba(250, 204, 21, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  pulseLineWrap: {
    width: 160,
    height: 2,
    marginTop: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  pulseLineGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 1,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yellowSparkDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  subText: {
    color: '#FDE047',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
