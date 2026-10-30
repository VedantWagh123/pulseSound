import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
  Switch,
  PanResponder,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  usePlayer,
  AUDIO_PRESETS,
  DEFAULT_AUDIO_EFFECTS,
  DEFAULT_EQ_BANDS,
  SPEED_8D_PERIODS,
} from '../context/PlayerContext';

// Horizontal Essential Slider with Butter-Smooth PanResponder Gestures & Instant Feedback
const EssentialSlider = React.memo(({
  title,
  subtitle,
  icon,
  color,
  gradient,
  value,
  min = -10,
  max = 10,
  step = 1,
  unit = 'dB',
  formatValue,
  enabled,
  onChange,
  onReset,
  onDragStart,
  onDragEnd,
}) => {
  const [trackW, setTrackW] = useState(240);
  const trackWRef = useRef(240);
  trackWRef.current = trackW;

  // Local live value for instant 60 FPS visual response while dragging
  const [liveValue, setLiveValue] = useState(value);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLiveValue(value);
    }
  }, [value]);

  const liveValueRef = useRef(liveValue);
  liveValueRef.current = liveValue;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;

  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const startValRef = useRef(value);
  const rafRef = useRef(null);

  const range = max - min;
  const currentVal = isDraggingRef.current ? liveValue : value;
  const percent = Math.max(0, Math.min(100, ((currentVal - min) / range) * 100));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          return enabled && Math.abs(gestureState.dx) > 3 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        },
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
          return enabled && Math.abs(gestureState.dx) > 3 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        },
        onPanResponderGrant: () => {
          isDraggingRef.current = true;
          if (onDragStartRef.current) onDragStartRef.current();
          startValRef.current = liveValueRef.current;
        },
        onPanResponderMove: (evt, gestureState) => {
          const w = trackWRef.current;
          if (w <= 0) return;
          const deltaPct = gestureState.dx / w;
          const deltaVal = deltaPct * (max - min);
          const raw = startValRef.current + deltaVal;
          const clamped = Math.max(min, Math.min(max, Math.round(raw / step) * step));

          if (clamped !== liveValueRef.current) {
            setLiveValue(clamped);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
              if (onChangeRef.current) {
                onChangeRef.current(clamped);
              }
            });
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (evt, gestureState) => {
          isDraggingRef.current = false;
          if (onDragEndRef.current) onDragEndRef.current();

          if (Math.abs(gestureState.dx) < 3 && Math.abs(gestureState.dy) < 3) {
            const locX = evt?.nativeEvent?.locationX;
            const w = trackWRef.current;
            if (typeof locX === 'number' && w > 0) {
              const tapPct = Math.max(0, Math.min(1, locX / w));
              const tapVal = Math.round((min + tapPct * (max - min)) / step) * step;
              setLiveValue(tapVal);
              if (onChangeRef.current) onChangeRef.current(tapVal);
            }
          }
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          if (onDragEndRef.current) onDragEndRef.current();
        },
      }),
    [enabled, min, max, step]
  );

  const displayVal = formatValue
    ? formatValue(currentVal)
    : currentVal > 0
    ? `+${currentVal} ${unit}`
    : `${currentVal} ${unit}`;

  return (
    <View style={[styles.controlCard, !enabled && styles.cardDisabled]}>
      {/* Header: Icon, Label, Readout Badge */}
      <View style={styles.controlHeader}>
        <View style={styles.controlHeaderLeft}>
          <LinearGradient colors={gradient} style={styles.controlIconCircle}>
            <Ionicons name={icon} size={15} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={styles.controlTitle}>{title}</Text>
            {subtitle ? <Text style={styles.controlSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        {/* Value Readout Badge (Tap to reset) */}
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!enabled}
          onPress={onReset}
          style={[styles.valueBadge, { borderColor: color }]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.valueText, { color }]}>{displayVal}</Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Slider Track with Step Buttons */}
      <View style={styles.sliderRow}>
        <TouchableOpacity
          disabled={!enabled || value <= min}
          onPress={() => onChange(Math.max(min, value - step))}
          style={[styles.stepBtn, (!enabled || value <= min) && styles.stepBtnDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove" size={16} color={enabled ? '#CBD5E1' : '#64748B'} />
        </TouchableOpacity>

        <View
          style={styles.trackTouchArea}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setTrackW(w);
          }}
          {...panResponder.panHandlers}
        >
          <View style={styles.horizontalTrack} pointerEvents="none">
            {min < 0 && max > 0 && <View style={styles.centerTick} />}

            <View
              style={[
                styles.horizontalFill,
                {
                  width: `${percent}%`,
                  backgroundColor: color,
                },
              ]}
            />

            <View
              style={[
                styles.horizontalThumb,
                {
                  left: `${percent}%`,
                  borderColor: color,
                  shadowColor: color,
                },
              ]}
            >
              <View style={[styles.thumbInnerGlow, { backgroundColor: '#FFFFFF' }]} />
            </View>
          </View>
        </View>

        <TouchableOpacity
          disabled={!enabled || value >= max}
          onPress={() => onChange(Math.min(max, value + step))}
          style={[styles.stepBtn, (!enabled || value >= max) && styles.stepBtnDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={16} color={enabled ? '#CBD5E1' : '#64748B'} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Advanced 9-Band Frequency Slider
const BandSlider = React.memo(({ band, index, onGainChange, onStep, enabled }) => {
  const gain = band.gain || 0;
  const percent = Math.max(0, Math.min(100, ((gain + 10) / 20) * 100));
  const bandColor = index < 3 ? '#EC4899' : index < 6 ? '#A855F7' : '#38BDF8';

  return (
    <View style={styles.bandCol}>
      <TouchableOpacity
        disabled={!enabled}
        onPress={() => onStep(index, 1)}
        style={styles.bandStepBtn}
      >
        <Ionicons name="chevron-up" size={14} color="#C084FC" />
      </TouchableOpacity>

      <Text style={[styles.bandGainText, { color: gain !== 0 ? bandColor : '#64748B' }]}>
        {gain > 0 ? `+${gain}` : `${gain}`}
      </Text>

      {/* Vertical Track */}
      <View style={styles.bandTrack}>
        <View style={styles.bandCenterTick} />
        <View
          style={[
            styles.bandFill,
            {
              height: `${percent}%`,
              backgroundColor: gain !== 0 ? bandColor : '#475569',
            },
          ]}
        />
        <View
          style={[
            styles.bandThumb,
            {
              bottom: `${percent}%`,
              borderColor: gain !== 0 ? bandColor : '#94A3B8',
            },
          ]}
        />
      </View>

      <TouchableOpacity
        disabled={!enabled}
        onPress={() => onStep(index, -1)}
        style={styles.bandStepBtn}
      >
        <Ionicons name="chevron-down" size={14} color="#38BDF8" />
      </TouchableOpacity>

      <Text style={styles.bandFreqText}>{band.freq.replace('Hz', '').replace('kHz', 'k')}</Text>
      <Text style={styles.bandLabelText}>{band.label}</Text>
    </View>
  );
});

export const EqualizerModal = () => {
  const { width, height } = useWindowDimensions();
  const {
    isEqualizerOpen,
    setIsEqualizerOpen,
    audioEffects,
    setAudioEffects,
    isAudioEffectsSaved,
    setIsAudioEffectsSaved,
    saveAudioEffects,
    resetAudioEffects,
    applyAudioEffects,
    updateAudioEffects,
    audioPresets,
    isPlaying,
  } = usePlayer();

  const presets = audioPresets || AUDIO_PRESETS;
  const currentConfig = audioEffects || DEFAULT_AUDIO_EFFECTS;

  // Working States
  const [enabled, setEnabled] = useState(currentConfig.enabled !== false);
  const [activePreset, setActivePreset] = useState(currentConfig.preset || 'Balanced');
  const [bass, setBass] = useState(currentConfig.bass || 0);
  const [vocals, setVocals] = useState(currentConfig.vocals || 0);
  const [treble, setTreble] = useState(currentConfig.treble || 0);
  const [balance, setBalance] = useState(currentConfig.balance || 0);
  const [intensity, setIntensity] = useState(currentConfig.intensity ?? 100);

  // Advanced & Immersion Features: Budget Headphone, 360 Spatial, 8D Binaural
  const [headphoneBoost, setHeadphoneBoost] = useState(Boolean(currentConfig.headphoneBoost));
  const [subBass, setSubBass] = useState(currentConfig.subBass || 0);
  const [spatial360, setSpatial360] = useState(Boolean(currentConfig.spatial360));
  const [spatialDepth, setSpatialDepth] = useState(currentConfig.spatialDepth ?? 75);
  const [audio8D, setAudio8D] = useState(Boolean(currentConfig.audio8D));
  const [speed8D, setSpeed8D] = useState(currentConfig.speed8D || 'Medium');

  const [bands, setBands] = useState(currentConfig.bands || DEFAULT_EQ_BANDS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaved, setIsSaved] = useState(isAudioEffectsSaved !== false);
  const [toastMsg, setToastMsg] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Lock out vertical scrolling while dragging any slider
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const handleDragStart = useCallback(() => setIsDraggingSlider(true), []);
  const handleDragEnd = useCallback(() => setIsDraggingSlider(false), []);

  // 8D Ear-to-Ear Visual Orbital Animation
  const orbAnim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    let animLoop = null;
    if (enabled && audio8D) {
      const speedMap = {
        Slow: 6000,
        Medium: 4000,
        Fast: 2500,
        Hyper: 1500,
      };
      const halfPeriod = speedMap[speed8D] || 4000;
      orbAnim.setValue(0);
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(orbAnim, {
            toValue: 1,
            duration: halfPeriod,
            useNativeDriver: false,
          }),
          Animated.timing(orbAnim, {
            toValue: 0,
            duration: halfPeriod,
            useNativeDriver: false,
          }),
        ])
      );
      animLoop.start();
    } else {
      orbAnim.setValue(0.5);
    }
    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [enabled, audio8D, speed8D]);

  // Sync state from context when modal opens
  useEffect(() => {
    if (isEqualizerOpen && audioEffects) {
      setEnabled(audioEffects.enabled !== false);
      setActivePreset(audioEffects.preset || 'Balanced');
      setBass(audioEffects.bass || 0);
      setVocals(audioEffects.vocals || 0);
      setTreble(audioEffects.treble || 0);
      setBalance(audioEffects.balance || 0);
      setIntensity(audioEffects.intensity ?? 100);
      setHeadphoneBoost(Boolean(audioEffects.headphoneBoost));
      setSubBass(audioEffects.subBass || 0);
      setSpatial360(Boolean(audioEffects.spatial360));
      setSpatialDepth(audioEffects.spatialDepth ?? 75);
      setAudio8D(Boolean(audioEffects.audio8D));
      setSpeed8D(audioEffects.speed8D || 'Medium');
      setBands(audioEffects.bands || DEFAULT_EQ_BANDS);
      setIsSaved(isAudioEffectsSaved !== false);
    }
  }, [isEqualizerOpen, audioEffects, isAudioEffectsSaved]);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  }, [toastAnim]);

  // Real-time Audio pipeline updater (Immediate state sync + audio engine)
  const triggerAudioUpdate = useCallback((newConfig) => {
    if (typeof updateAudioEffects === 'function') {
      updateAudioEffects(newConfig);
    } else if (typeof applyAudioEffects === 'function') {
      applyAudioEffects(newConfig);
    }
  }, [updateAudioEffects, applyAudioEffects]);

  // Master Switch Toggle (Immediate full bypass when OFF)
  const handleToggleEnabled = (val) => {
    setEnabled(val);
    setIsSaved(false);
    const updated = {
      enabled: val,
      preset: activePreset,
      bass,
      vocals,
      treble,
      balance,
      intensity,
      headphoneBoost,
      subBass,
      spatial360,
      spatialDepth,
      audio8D,
      speed8D,
      bands,
    };
    triggerAudioUpdate(updated);
    showToast(val ? 'Audio Processing ON ⚡' : 'Bypass (100% Flat Audio) ⚪');
  };

  // Select Preset
  const handleSelectPreset = (name) => {
    setActivePreset(name);
    const p = presets[name];
    if (!p) return;

    setBass(p.bass);
    setVocals(p.vocals);
    setTreble(p.treble);
    setBalance(p.balance);
    setIntensity(p.intensity);
    setHeadphoneBoost(Boolean(p.headphoneBoost));
    setSubBass(p.subBass || 0);
    setSpatial360(Boolean(p.spatial360));
    setSpatialDepth(p.spatialDepth ?? 75);
    setAudio8D(Boolean(p.audio8D));
    setSpeed8D(p.speed8D || 'Medium');

    const newBands = bands.map((b, i) => ({
      ...b,
      gain: p.bands[i] !== undefined ? p.bands[i] : 0,
    }));
    setBands(newBands);
    setIsSaved(false);

    const updated = {
      enabled,
      preset: name,
      bass: p.bass,
      vocals: p.vocals,
      treble: p.treble,
      balance: p.balance,
      intensity: p.intensity,
      headphoneBoost: Boolean(p.headphoneBoost),
      subBass: p.subBass || 0,
      spatial360: Boolean(p.spatial360),
      spatialDepth: p.spatialDepth ?? 75,
      audio8D: Boolean(p.audio8D),
      speed8D: p.speed8D || 'Medium',
      bands: newBands,
    };

    triggerAudioUpdate(updated);
    showToast(`Preset: ${name} applied 🎶`);
  };

  // Individual slider change
  const handleSliderChange = (key, val) => {
    setIsSaved(false);
    setActivePreset('Custom');

    let nextBass = bass;
    let nextVocals = vocals;
    let nextTreble = treble;
    let nextBalance = balance;
    let nextIntensity = intensity;
    let nextSubBass = subBass;
    let nextSpatialDepth = spatialDepth;

    if (key === 'bass') { setBass(val); nextBass = val; }
    else if (key === 'vocals') { setVocals(val); nextVocals = val; }
    else if (key === 'treble') { setTreble(val); nextTreble = val; }
    else if (key === 'balance') { setBalance(val); nextBalance = val; }
    else if (key === 'intensity') { setIntensity(val); nextIntensity = val; }
    else if (key === 'subBass') { setSubBass(val); nextSubBass = val; }
    else if (key === 'spatialDepth') { setSpatialDepth(val); nextSpatialDepth = val; }

    const updated = {
      enabled,
      preset: 'Custom',
      bass: nextBass,
      vocals: nextVocals,
      treble: nextTreble,
      balance: nextBalance,
      intensity: nextIntensity,
      headphoneBoost,
      subBass: nextSubBass,
      spatial360,
      spatialDepth: nextSpatialDepth,
      audio8D,
      speed8D,
      bands,
    };

    triggerAudioUpdate(updated);
  };

  // 8D Audio Switch Toggle
  const handleToggle8D = (val) => {
    setAudio8D(val);
    setIsSaved(false);
    setActivePreset('Custom');
    const updated = {
      enabled,
      preset: 'Custom',
      bass,
      vocals,
      treble,
      balance,
      intensity,
      headphoneBoost,
      subBass,
      spatial360,
      spatialDepth,
      audio8D: val,
      speed8D,
      bands,
    };
    triggerAudioUpdate(updated);
    showToast(val ? '8D Binaural Orbiting ON 🎧' : '8D Audio OFF');
  };

  // 8D Speed Change
  const handleSelect8DSpeed = (spd) => {
    setSpeed8D(spd);
    setIsSaved(false);
    setActivePreset('Custom');
    const updated = {
      enabled,
      preset: 'Custom',
      bass,
      vocals,
      treble,
      balance,
      intensity,
      headphoneBoost,
      subBass,
      spatial360,
      spatialDepth,
      audio8D,
      speed8D: spd,
      bands,
    };
    triggerAudioUpdate(updated);
    showToast(`8D Orbit Speed: ${spd} ⚡`);
  };

  // 360 Spatial Surround Switch Toggle
  const handleToggleSpatial = (val) => {
    setSpatial360(val);
    setIsSaved(false);
    setActivePreset('Custom');
    const updated = {
      enabled,
      preset: 'Custom',
      bass,
      vocals,
      treble,
      balance,
      intensity,
      headphoneBoost,
      subBass,
      spatial360: val,
      spatialDepth,
      audio8D,
      speed8D,
      bands,
    };
    triggerAudioUpdate(updated);
    showToast(val ? '360° Spatial Surround ON 🌐' : '360° Spatial OFF');
  };

  // Budget Headphone Optimizer Switch Toggle
  const handleToggleHeadphoneBoost = (val) => {
    setHeadphoneBoost(val);
    setIsSaved(false);
    setActivePreset('Custom');
    const updated = {
      enabled,
      preset: 'Custom',
      bass,
      vocals,
      treble,
      balance,
      intensity,
      headphoneBoost: val,
      subBass: val && subBass === 0 ? 5 : subBass,
      spatial360,
      spatialDepth,
      audio8D,
      speed8D,
      bands,
    };
    if (val && subBass === 0) setSubBass(5);
    triggerAudioUpdate(updated);
    showToast(val ? 'Headphone HD Optimizer ON 🎧' : 'Headphone Optimizer OFF');
  };

  // Step 9-band frequency
  const handleStepBand = (idx, delta) => {
    setIsSaved(false);
    setActivePreset('Custom');
    const updatedBands = [...bands];
    const nextGain = Math.max(-10, Math.min(10, (updatedBands[idx].gain || 0) + delta));
    updatedBands[idx] = { ...updatedBands[idx], gain: nextGain };
    setBands(updatedBands);

    const updated = {
      enabled,
      preset: 'Custom',
      bass,
      vocals,
      treble,
      balance,
      intensity,
      headphoneBoost,
      subBass,
      spatial360,
      spatialDepth,
      audio8D,
      speed8D,
      bands: updatedBands,
    };
    triggerAudioUpdate(updated);
  };

  // Save Settings to Storage & Auto-Dismiss Modal
  const handleSave = async () => {
    const payload = {
      enabled,
      preset: activePreset,
      bass,
      vocals,
      treble,
      balance,
      intensity,
      headphoneBoost,
      subBass,
      spatial360,
      spatialDepth,
      audio8D,
      speed8D,
      bands,
      savedAt: new Date().toISOString(),
    };

    if (typeof saveAudioEffects === 'function') {
      await saveAudioEffects(payload);
    }
    setIsSaved(true);
    showToast('Settings saved successfully! ✓');

    // Automatically close modal after user clicks save
    setTimeout(() => {
      setIsEqualizerOpen(false);
    }, 320);
  };

  // Reset to Defaults
  const handleReset = async () => {
    if (typeof resetAudioEffects === 'function') {
      await resetAudioEffects();
    }
    setEnabled(true);
    setActivePreset('Balanced');
    setBass(0);
    setVocals(0);
    setTreble(0);
    setBalance(0);
    setIntensity(100);
    setHeadphoneBoost(false);
    setSubBass(0);
    setSpatial360(false);
    setSpatialDepth(75);
    setAudio8D(false);
    setSpeed8D('Medium');
    setBands(DEFAULT_EQ_BANDS);
    setIsSaved(true);
    showToast('Reset to Balanced defaults ↺');
  };

  const presetList = [
    { key: 'Balanced', icon: 'disc-outline', label: 'Balanced', desc: 'Flat reference' },
    { key: 'Bass Boost', icon: 'flame', label: 'Bass Boost', desc: 'Deep sub-punch' },
    { key: 'Vocal Clarity', icon: 'mic', label: 'Vocal Clarity', desc: 'Crystal voices' },
    { key: '360 Immersion', icon: 'planet', label: '360 Surround', desc: 'Concert hall' },
    { key: '8D Headphone', icon: 'headset', label: '8D Orbit', desc: 'Ear-to-ear motion' },
    { key: 'Soft / Relax', icon: 'leaf', label: 'Soft / Relax', desc: 'Mellow warmth' },
    { key: 'Custom', icon: 'options', label: 'Custom', desc: 'User profile' },
  ];

  const speedOptions = [
    { key: 'Slow', label: 'Slow (12s)', desc: 'Hypnotic' },
    { key: 'Medium', label: 'Medium (8s)', desc: 'Standard 8D' },
    { key: 'Fast', label: 'Fast (5s)', desc: 'Dynamic' },
    { key: 'Hyper', label: 'Hyper (3s)', desc: 'High Energy' },
  ];

  const orbLeft = orbAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '90%'],
  });

  return (
    <Modal
      visible={isEqualizerOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsEqualizerOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.sheetContainer, { maxHeight: height * 0.90 }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                style={styles.headerIconCircle}
              >
                <Ionicons name="options" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={styles.titleText}>Audio Effects</Text>
                <Text style={styles.subText}>Real-time tuning, 360° & 8D audio</Text>
              </View>
            </View>

            {/* Master Switch & Prominent Close Button */}
            <View style={styles.headerRight}>
              <View style={styles.masterSwitchWrap}>
                <Text style={[styles.masterStatusText, { color: enabled ? '#10B981' : '#64748B' }]}>
                  {enabled ? 'ON' : 'OFF'}
                </Text>
                <Switch
                  value={enabled}
                  onValueChange={handleToggleEnabled}
                  trackColor={{ false: '#334155', true: '#7C3AED' }}
                  thumbColor={enabled ? '#FFFFFF' : '#94A3B8'}
                  style={{ transform: [{ scale: 0.85 }] }}
                />
              </View>

              {/* Prominent High-Contrast Cross Button */}
              <TouchableOpacity
                onPress={() => setIsEqualizerOpen(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
                accessibilityLabel="Close Audio Customizer"
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable Content with Scroll-Lock while dragging sliders */}
          <ScrollView
            scrollEnabled={!isDraggingSlider}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            bounces={true}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 1. Presets Horizontal Selector */}
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>SOUND PRESETS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsScroll}
              >
                {presetList.map((p) => {
                  const isSelected = activePreset === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      activeOpacity={0.75}
                      disabled={!enabled}
                      onPress={() => handleSelectPreset(p.key)}
                      style={[
                        styles.presetCard,
                        isSelected && styles.presetCardActive,
                        !enabled && { opacity: 0.45 },
                      ]}
                    >
                      <Ionicons
                        name={p.icon}
                        size={17}
                        color={isSelected ? '#C084FC' : '#94A3B8'}
                        style={{ marginBottom: 4 }}
                      />
                      <Text
                        style={[
                          styles.presetLabel,
                          isSelected && styles.presetLabelActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                      <Text style={styles.presetSub}>{p.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 2. 8D Binaural Rotating Audio Card */}
            <View style={[styles.featureCard, !enabled && styles.cardDisabled]}>
              <View style={styles.featureHeader}>
                <View style={styles.featureHeaderLeft}>
                  <LinearGradient colors={['#06B6D4', '#8B5CF6']} style={styles.featureIconCircle}>
                    <Ionicons name="headset" size={16} color="#FFFFFF" />
                  </LinearGradient>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.featureTitle}>8D Binaural Audio</Text>
                      {audio8D && enabled && (
                        <View style={styles.liveOrbitBadge}>
                          <Text style={styles.liveOrbitText}>⟲ LIVE ORBIT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.featureSubtitle}>
                      Hypnotic ear-to-ear rotating sound (Headphones only 🎧)
                    </Text>
                  </View>
                </View>

                <Switch
                  disabled={!enabled}
                  value={audio8D}
                  onValueChange={handleToggle8D}
                  trackColor={{ false: '#334155', true: '#06B6D4' }}
                  thumbColor={audio8D ? '#FFFFFF' : '#94A3B8'}
                  style={{ transform: [{ scale: 0.82 }] }}
                />
              </View>

              {audio8D && enabled && (
                <View style={styles.featureBody}>
                  {/* Visual Ear-to-Ear Orbit Rail */}
                  <View style={styles.orbitRailContainer}>
                    <View style={styles.earBadge}>
                      <Ionicons name="headset" size={13} color="#06B6D4" />
                      <Text style={styles.earText}>L</Text>
                    </View>

                    <View style={styles.orbitTrackWrap}>
                      <View style={styles.orbitTrackLine} />
                      <View style={styles.orbitCenterMarker} />
                      <Animated.View style={[styles.orbitingParticle, { left: orbLeft }]}>
                        <LinearGradient
                          colors={['#06B6D4', '#EC4899']}
                          style={styles.orbitingGradient}
                        />
                      </Animated.View>
                    </View>

                    <View style={styles.earBadge}>
                      <Text style={styles.earText}>R</Text>
                      <Ionicons name="headset" size={13} color="#EC4899" />
                    </View>
                  </View>

                  {/* 8D Rotation Speed Selector */}
                  <View style={styles.speedSection}>
                    <Text style={styles.speedLabel}>ORBIT ROTATION SPEED</Text>
                    <View style={styles.speedChipsRow}>
                      {speedOptions.map((opt) => {
                        const isSelected = speed8D === opt.key;
                        return (
                          <TouchableOpacity
                            key={opt.key}
                            activeOpacity={0.75}
                            onPress={() => handleSelect8DSpeed(opt.key)}
                            style={[
                              styles.speedChip,
                              isSelected && styles.speedChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.speedChipText,
                                isSelected && styles.speedChipTextActive,
                              ]}
                            >
                              {opt.label}
                            </Text>
                            <Text style={styles.speedChipDesc}>{opt.desc}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 3. 360° Spatial Surround Card */}
            <View style={[styles.featureCard, !enabled && styles.cardDisabled]}>
              <View style={styles.featureHeader}>
                <View style={styles.featureHeaderLeft}>
                  <LinearGradient colors={['#6366F1', '#A855F7']} style={styles.featureIconCircle}>
                    <Ionicons name="planet" size={16} color="#FFFFFF" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.featureTitle}>360° Spatial Surround</Text>
                    <Text style={styles.featureSubtitle}>
                      Concert hall acoustic space & virtual stage depth
                    </Text>
                  </View>
                </View>

                <Switch
                  disabled={!enabled}
                  value={spatial360}
                  onValueChange={handleToggleSpatial}
                  trackColor={{ false: '#334155', true: '#6366F1' }}
                  thumbColor={spatial360 ? '#FFFFFF' : '#94A3B8'}
                  style={{ transform: [{ scale: 0.82 }] }}
                />
              </View>

              {spatial360 && enabled && (
                <View style={{ marginTop: 8 }}>
                  <EssentialSlider
                    title="Spatial Depth"
                    subtitle="Virtual stage width & acoustic reflection"
                    icon="cube"
                    color="#818CF8"
                    gradient={['#6366F1', '#4338CA']}
                    value={spatialDepth}
                    min={20}
                    max={100}
                    step={5}
                    unit="%"
                    enabled={enabled && spatial360}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onChange={(val) => handleSliderChange('spatialDepth', val)}
                    onReset={() => handleSliderChange('spatialDepth', 75)}
                  />
                </View>
              )}
            </View>

            {/* 4. Budget Headphone HD Optimizer Card */}
            <View style={[styles.featureCard, !enabled && styles.cardDisabled]}>
              <View style={styles.featureHeader}>
                <View style={styles.featureHeaderLeft}>
                  <LinearGradient colors={['#F43F5E', '#FB923C']} style={styles.featureIconCircle}>
                    <Ionicons name="hardware-chip" size={16} color="#FFFFFF" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.featureTitle}>Budget Headphone Optimizer</Text>
                    <Text style={styles.featureSubtitle}>
                      HD clarity, anti-distortion & sub-bass exciter
                    </Text>
                  </View>
                </View>

                <Switch
                  disabled={!enabled}
                  value={headphoneBoost}
                  onValueChange={handleToggleHeadphoneBoost}
                  trackColor={{ false: '#334155', true: '#F43F5E' }}
                  thumbColor={headphoneBoost ? '#FFFFFF' : '#94A3B8'}
                  style={{ transform: [{ scale: 0.82 }] }}
                />
              </View>

              {headphoneBoost && enabled && (
                <View style={{ marginTop: 8 }}>
                  <EssentialSlider
                    title="Sub-Bass Exciter"
                    subtitle="Deep physical rumble without distortion"
                    icon="flame"
                    color="#F43F5E"
                    gradient={['#F43F5E', '#BE123C']}
                    value={subBass}
                    min={0}
                    max={10}
                    step={1}
                    unit="dB"
                    enabled={enabled && headphoneBoost}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onChange={(val) => handleSliderChange('subBass', val)}
                    onReset={() => handleSliderChange('subBass', 0)}
                  />
                </View>
              )}
            </View>

            {/* 5. Essential Controls */}
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>ESSENTIAL CONTROLS</Text>

              {/* Bass Control */}
              <EssentialSlider
                title="Bass"
                subtitle="Low-frequency sub rumble & kick weight"
                icon="flame"
                color="#EC4899"
                gradient={['#EC4899', '#BE185D']}
                value={bass}
                min={-10}
                max={10}
                step={1}
                unit="dB"
                enabled={enabled}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onChange={(val) => handleSliderChange('bass', val)}
                onReset={() => handleSliderChange('bass', 0)}
              />

              {/* Vocals / Midrange Control */}
              <EssentialSlider
                title="Vocals / Midrange"
                subtitle="Vocal clarity, presence & separation"
                icon="mic"
                color="#A855F7"
                gradient={['#A855F7', '#7C3AED']}
                value={vocals}
                min={-10}
                max={10}
                step={1}
                unit="dB"
                enabled={enabled}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onChange={(val) => handleSliderChange('vocals', val)}
                onReset={() => handleSliderChange('vocals', 0)}
              />

              {/* Treble Control */}
              <EssentialSlider
                title="Treble"
                subtitle="High-frequency crispness, shimmer & air"
                icon="sparkles"
                color="#38BDF8"
                gradient={['#38BDF8', '#0284C7']}
                value={treble}
                min={-10}
                max={10}
                step={1}
                unit="dB"
                enabled={enabled}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onChange={(val) => handleSliderChange('treble', val)}
                onReset={() => handleSliderChange('treble', 0)}
              />

              {/* Left / Right Balance Control */}
              <EssentialSlider
                title="Balance"
                subtitle="Left and right audio channel distribution"
                icon="git-commit"
                color="#10B981"
                gradient={['#10B981', '#047857']}
                value={balance}
                min={-100}
                max={100}
                step={5}
                formatValue={(v) => {
                  if (v === 0) return 'Center';
                  return v < 0 ? `L ${Math.abs(v)}%` : `R ${v}%`;
                }}
                enabled={enabled && !audio8D}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onChange={(val) => handleSliderChange('balance', val)}
                onReset={() => handleSliderChange('balance', 0)}
              />

              {/* Intensity Control */}
              <EssentialSlider
                title="Intensity"
                subtitle="Overall strength and depth of applied effects"
                icon="flash"
                color="#F59E0B"
                gradient={['#F59E0B', '#D97706']}
                value={intensity}
                min={0}
                max={100}
                step={5}
                unit="%"
                enabled={enabled}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onChange={(val) => handleSliderChange('intensity', val)}
                onReset={() => handleSliderChange('intensity', 100)}
              />
            </View>

            {/* 6. Optional Advanced 9-Band Equalizer (Accordion) */}
            <View style={styles.sectionWrap}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowAdvanced(!showAdvanced)}
                style={styles.advancedToggleBtn}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="options-outline" size={17} color="#A855F7" />
                  <Text style={styles.advancedToggleText}>Advanced 9-Band Equalizer</Text>
                </View>
                <Ionicons
                  name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>

              {showAdvanced && (
                <View style={styles.advancedBox}>
                  <Text style={styles.advancedDesc}>
                    Fine-tune specific frequency curves (32Hz to 16kHz)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.bandsRow}>
                      {bands.map((band, idx) => (
                        <BandSlider
                          key={band.freq}
                          band={band}
                          index={idx}
                          enabled={enabled}
                          onStep={handleStepBand}
                        />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Action Footer Bar (Reset & Save) */}
          <View style={styles.footerBar}>
            {/* Status indicator */}
            <View style={styles.footerStatus}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isSaved ? '#10B981' : '#F59E0B' },
                ]}
              />
              <Text style={styles.statusText}>
                {isSaved ? 'Settings saved' : 'Unsaved changes'}
              </Text>
            </View>

            <View style={styles.footerButtons}>
              {/* Reset button */}
              <TouchableOpacity
                onPress={handleReset}
                activeOpacity={0.7}
                style={styles.resetBtn}
              >
                <Ionicons name="refresh-outline" size={16} color="#CBD5E1" />
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>

              {/* Save button (Auto-dismisses on click) */}
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.85}
                style={styles.saveBtn}
              >
                <LinearGradient
                  colors={isSaved ? ['#10B981', '#059669'] : ['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveGradient}
                >
                  <Ionicons
                    name={isSaved ? 'checkmark-circle' : 'checkmark'}
                    size={17}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveText}>{isSaved ? 'Saved ✓' : 'Save Settings'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Toast Notification Banner */}
          {toastMsg && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.toastContainer,
                {
                  opacity: toastAnim,
                  transform: [
                    {
                      translateY: toastAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.toastText}>{toastMsg}</Text>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 15, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F1224',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#242A4A',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 24,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#1E2442',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  masterSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B36',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#28315E',
  },
  masterStatusText: {
    fontSize: 11,
    fontWeight: '800',
    marginRight: 4,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  presetsScroll: {
    gap: 10,
    paddingRight: 10,
  },
  presetCard: {
    width: 108,
    backgroundColor: '#151933',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#242C56',
  },
  presetCardActive: {
    borderColor: '#C084FC',
    backgroundColor: '#201A42',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  presetLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  presetLabelActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  presetSub: {
    color: '#64748B',
    fontSize: 9,
    textAlign: 'center',
  },

  // Feature Cards (8D, 360 Spatial, Headphone Boost)
  featureCard: {
    backgroundColor: '#141830',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#242A50',
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featureHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  featureIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  featureSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  featureBody: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#1E2548',
  },
  liveOrbitBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#06B6D4',
  },
  liveOrbitText: {
    color: '#22D3EE',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // 8D Orbital Rail
  orbitRailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0E1124',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1D234A',
    marginBottom: 10,
  },
  earBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#181E3D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  earText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
  },
  orbitTrackWrap: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  orbitTrackLine: {
    height: 4,
    backgroundColor: '#222C5A',
    borderRadius: 2,
  },
  orbitCenterMarker: {
    position: 'absolute',
    left: '50%',
    width: 2,
    height: 8,
    backgroundColor: '#475569',
    marginLeft: -1,
  },
  orbitingParticle: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  orbitingGradient: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // 8D Speed Selector
  speedSection: {
    marginTop: 4,
  },
  speedLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  speedChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  speedChip: {
    flex: 1,
    backgroundColor: '#0E1226',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242C56',
    alignItems: 'center',
  },
  speedChipActive: {
    borderColor: '#06B6D4',
    backgroundColor: '#122338',
  },
  speedChipText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  speedChipTextActive: {
    color: '#22D3EE',
    fontWeight: '900',
  },
  speedChipDesc: {
    color: '#64748B',
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
  },

  // Essential Controls Cards
  controlCard: {
    backgroundColor: '#141830',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#23294F',
  },
  cardDisabled: {
    opacity: 0.45,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  controlHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  controlIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  controlSubtitle: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  valueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#0E1122',
    borderWidth: 1,
  },
  valueText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1F264C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  trackTouchArea: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  horizontalTrack: {
    height: 6,
    backgroundColor: '#20274D',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  centerTick: {
    position: 'absolute',
    left: '50%',
    width: 2,
    height: 10,
    backgroundColor: '#475569',
    marginLeft: -1,
    borderRadius: 1,
  },
  horizontalFill: {
    height: '100%',
    borderRadius: 3,
  },
  horizontalThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F1224',
    borderWidth: 2.5,
    marginLeft: -9,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbInnerGlow: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Advanced Section
  advancedToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151933',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242C56',
  },
  advancedToggleText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  advancedBox: {
    backgroundColor: '#12152B',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#20264D',
  },
  advancedDesc: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 12,
  },
  bandsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  bandCol: {
    width: 44,
    alignItems: 'center',
  },
  bandStepBtn: {
    padding: 2,
  },
  bandGainText: {
    fontSize: 10,
    fontWeight: '800',
    marginVertical: 4,
  },
  bandTrack: {
    width: 4,
    height: 90,
    backgroundColor: '#20274D',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginVertical: 4,
  },
  bandCenterTick: {
    position: 'absolute',
    top: '50%',
    width: 8,
    height: 1.5,
    backgroundColor: '#64748B',
  },
  bandFill: {
    width: '100%',
    borderRadius: 2,
  },
  bandThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0F1224',
    borderWidth: 2,
    marginBottom: -7,
  },
  bandFreqText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  bandLabelText: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '600',
  },

  // Footer Actions
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#1E2442',
    backgroundColor: '#0B0D1A',
  },
  footerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E2342',
    borderWidth: 1,
    borderColor: '#2F3766',
  },
  resetText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    bottom: 74,
    alignSelf: 'center',
    backgroundColor: '#1E2445',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7C3AED',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
