import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  ScrollView,
  Share,
  Platform,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import { usePlayer } from '../context/PlayerContext';
import {
  requestMicrophonePermission,
  checkMicrophonePermission,
  prepareAudioSessionForRecording,
  identifyAudioSample,
  getLocalHistory,
  deleteLocalHistoryItem,
  clearAllRecognitionHistory,
} from '../services/RecognitionService';
import {
  canDrawOverlays,
  requestOverlayPermission,
  startSystemOverlay,
  stopSystemOverlay,
  isSystemOverlayRunning,
  isRunningInExpoGo,
} from '../services/OverlayManager';

export const PulseFindModal = () => {
  const { width } = useWindowDimensions();
  const {
    isPulseFindOpen,
    setIsPulseFindOpen,
    playTrack,
    setAddToPlaylistSong,
    toggleLikeSong,
    likedSongs = [],
    isPulseBubbleVisible,
    setIsPulseBubbleVisible,
  } = usePlayer();

  // Mode: 'RECOGNIZE' | 'HISTORY' | 'SETTINGS'
  const [activeTab, setActiveTab] = useState('RECOGNIZE');

  // Recognition States: 'READY' | 'LISTENING' | 'SEARCHING' | 'FOUND' | 'ERROR'
  const [recognitionState, setRecognitionState] = useState('READY');
  const [listeningCountdown, setListeningCountdown] = useState(5);
  const [recognizedSong, setRecognizedSong] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // System Overlay state
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const [overlayStatusNotice, setOverlayStatusNotice] = useState('');

  // Expo-Audio Recorder Hook
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const countdownTimerRef = useRef(null);

  // Animations
  const micScaleAnim = useRef(new Animated.Value(1)).current;
  const searchRotateAnim = useRef(new Animated.Value(0)).current;

  // Equalizer spectrum bars (7 animated frequency bars)
  const eqBar1 = useRef(new Animated.Value(0.2)).current;
  const eqBar2 = useRef(new Animated.Value(0.35)).current;
  const eqBar3 = useRef(new Animated.Value(0.5)).current;
  const eqBar4 = useRef(new Animated.Value(0.65)).current;
  const eqBar5 = useRef(new Animated.Value(0.5)).current;
  const eqBar6 = useRef(new Animated.Value(0.35)).current;
  const eqBar7 = useRef(new Animated.Value(0.2)).current;

  // Ambient breathing aura & live blink
  const auraAnim = useRef(new Animated.Value(0)).current;
  const liveBlinkAnim = useRef(new Animated.Value(1)).current;

  // Acoustic visualizer loops
  useEffect(() => {
    let animLoop = null;
    let eqLoops = [];
    let auraLoop = null;
    let blinkLoop = null;

    if (recognitionState === 'LISTENING') {
      const makeEq = (anim, minScale, maxScale, duration) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: maxScale,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: minScale,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
      };

      eqLoops = [
        makeEq(eqBar1, 0.15, 0.55, 330),
        makeEq(eqBar2, 0.22, 0.78, 410),
        makeEq(eqBar3, 0.28, 0.92, 280),
        makeEq(eqBar4, 0.35, 1.0, 490),
        makeEq(eqBar5, 0.28, 0.88, 360),
        makeEq(eqBar6, 0.22, 0.72, 300),
        makeEq(eqBar7, 0.15, 0.52, 440),
      ];
      eqLoops.forEach((l) => l.start());

      auraLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(auraAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(auraAnim, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      auraLoop.start();

      blinkLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(liveBlinkAnim, {
            toValue: 0.25,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(liveBlinkAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      blinkLoop.start();

      const micPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(micScaleAnim, {
            toValue: 1.07,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(micScaleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      micPulse.start();
      animLoop = micPulse;
    } else if (recognitionState === 'SEARCHING') {
      animLoop = Animated.loop(
        Animated.timing(searchRotateAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animLoop.start();
    } else {
      micScaleAnim.setValue(1);
      searchRotateAnim.setValue(0);
      auraAnim.setValue(0);
      liveBlinkAnim.setValue(1);
      eqBar1.setValue(0.2);
      eqBar2.setValue(0.35);
      eqBar3.setValue(0.5);
      eqBar4.setValue(0.65);
      eqBar5.setValue(0.5);
      eqBar6.setValue(0.35);
      eqBar7.setValue(0.2);
    }

    return () => {
      animLoop?.stop?.();
      eqLoops.forEach((l) => l.stop());
      auraLoop?.stop?.();
      blinkLoop?.stop?.();
    };
  }, [recognitionState]);

  // Load history & permissions on open
  useEffect(() => {
    if (isPulseFindOpen) {
      loadHistory();
      checkPermissionsStatus();
    }
  }, [isPulseFindOpen]);

  const checkPermissionsStatus = async () => {
    if (Platform.OS === 'android') {
      const overlayGranted = await canDrawOverlays();
      setHasOverlayPermission(overlayGranted);
      const running = await isSystemOverlayRunning();
      setIsOverlayActive(running);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const list = await getLocalHistory();
      setHistoryList(list);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Start Recognition Flow
  const startListening = async () => {
    try {
      setErrorMessage('');
      setRecognizedSong(null);

      // Check / request mic permission
      const hasMic = await requestMicrophonePermission();
      if (!hasMic) {
        setErrorMessage('Microphone access denied. Please grant microphone permission to identify songs.');
        setRecognitionState('ERROR');
        return;
      }

      await prepareAudioSessionForRecording();

      // Start recording
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecognitionState('LISTENING');
      setListeningCountdown(5);

      let timeLeft = 5;
      countdownTimerRef.current = setInterval(() => {
        timeLeft -= 1;
        setListeningCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          finishRecordingAndSearch();
        }
      }, 1000);
    } catch (err) {
      console.error('[PulseFind] Error starting recording:', err);
      setErrorMessage(err.message || 'Could not start microphone recording.');
      setRecognitionState('ERROR');
    }
  };

  // Stop recording & query backend
  const finishRecordingAndSearch = async () => {
    setRecognitionState('SEARCHING');
    try {
      await recorder.stop();
      const sampleUri = recorder.uri;

      if (!sampleUri) {
        throw new Error('No audio data captured by microphone.');
      }

      const result = await identifyAudioSample(sampleUri);

      if (result.match && result.data) {
        setRecognizedSong(result.data);
        setRecognitionState('FOUND');
        loadHistory(); // refresh history list
      } else {
        setErrorMessage(result.message || 'No matching song found in music database.');
        setRecognitionState('ERROR');
      }
    } catch (err) {
      console.error('[PulseFind] Error searching audio:', err);
      setErrorMessage(err.message || 'Failed to analyze acoustic fingerprint.');
      setRecognitionState('ERROR');
    }
  };

  // Cancel listening
  const cancelListening = async () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    try {
      await recorder.stop();
    } catch (_) {}
    setRecognitionState('READY');
  };

  // Play recognized track
  const handlePlayRecognized = (trackItem) => {
    const songToPlay = trackItem.pulseTrack || trackItem;
    if (trackItem.inPulseSound && songToPlay) {
      playTrack(songToPlay);
      setIsPulseFindOpen(false);
    } else if (trackItem.externalLinks?.spotify) {
      Linking.openURL(trackItem.externalLinks.spotify).catch(() => {});
    } else if (trackItem.externalLinks?.songLink) {
      Linking.openURL(trackItem.externalLinks.songLink).catch(() => {});
    }
  };

  // Share song
  const handleShareSong = async (song) => {
    try {
      const shareUrl = song.externalLinks?.spotify || song.externalLinks?.songLink || '';
      await Share.share({
        message: `I discovered "${song.songTitle}" by ${song.artist} using PULSE FIND on PULSE SOUND! 🎶 ${shareUrl}`,
        title: `${song.songTitle} - ${song.artist}`,
      });
    } catch (_) {}
  };

  // Toggle Overlay Setting
  const handleToggleSystemOverlay = async () => {
    if (Platform.OS !== 'android') return;

    if (!isOverlayActive) {
      const hasPerm = await canDrawOverlays();
      if (!hasPerm) {
        setOverlayStatusNotice('Tap below to grant "Display over other apps" permission in Android settings.');
        await requestOverlayPermission();
        return;
      }
      const res = await startSystemOverlay();
      if (res.success) {
        setIsOverlayActive(true);
        setOverlayStatusNotice('Floating microphone is active! You can now browse Instagram, Reels, or TikTok.');
      } else {
        setOverlayStatusNotice(res.message || 'Could not start overlay service.');
      }
    } else {
      await stopSystemOverlay();
      setIsOverlayActive(false);
      setOverlayStatusNotice('Floating microphone overlay disabled.');
    }
  };

  const handleClose = () => {
    if (recognitionState === 'LISTENING') {
      cancelListening();
    }
    setIsPulseFindOpen(false);
  };

  // Interpolated acoustic aura transforms
  const auraScale = auraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.34],
  });
  const auraOpacity = auraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.72],
  });

  return (
    <Modal
      visible={isPulseFindOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Background Atmosphere */}
        <LinearGradient
          colors={['#0F0C20', '#070810', '#040508']}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient Top Glow Orbs */}
        <View style={styles.glowOrbTop} />

        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <View style={styles.badgeRow}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>SHAZAM-POWERED</Text>
            </View>
            <Text style={styles.title}>PULSE FIND</Text>
          </View>

          {/* Tab Selector Buttons */}
          <View style={styles.tabIconGroup}>
            <TouchableOpacity
              onPress={() => setActiveTab('RECOGNIZE')}
              style={[styles.tabIconBtn, activeTab === 'RECOGNIZE' && styles.tabIconBtnActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="mic"
                size={20}
                color={activeTab === 'RECOGNIZE' ? '#C084FC' : '#64748B'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveTab('HISTORY');
                loadHistory();
              }}
              style={[styles.tabIconBtn, activeTab === 'HISTORY' && styles.tabIconBtnActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={activeTab === 'HISTORY' ? '#C084FC' : '#64748B'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('SETTINGS')}
              style={[styles.tabIconBtn, activeTab === 'SETTINGS' && styles.tabIconBtnActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={activeTab === 'SETTINGS' ? '#C084FC' : '#64748B'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* MAIN BODY AREA */}
        {activeTab === 'RECOGNIZE' && (
          <View style={styles.recognizeBody}>
            {/* STATE A: READY (Tap to Identify) */}
            {recognitionState === 'READY' && (
              <View style={styles.centerStage}>
                {/* Ambient Soft Aura behind primary button */}
                <View style={styles.readyAura} />

                {/* Primary Shazam Circular Mic Button */}
                <Animated.View style={{ transform: [{ scale: micScaleAnim }] }}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={startListening}
                    style={styles.shazamButton}
                  >
                    <LinearGradient
                      colors={['#C084FC', '#A855F7', '#EC4899', '#3B82F6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.shazamGradient}
                    >
                      <LinearGradient
                        colors={['rgba(255,255,255,0.3)', 'transparent', 'rgba(0,0,0,0.4)']}
                        style={StyleSheet.absoluteFill}
                      />
                      <Ionicons name="mic" size={62} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Subtext and Quick hints */}
                <View style={styles.statusWrap}>
                  <Text style={styles.statusHeading}>Tap to Identify Music</Text>
                  <Text style={styles.statusSub}>
                    Listens to songs playing around you, in movies, or on Instagram Reels
                  </Text>

                  {/* Clean Quick Source Tags */}
                  <View style={styles.quickSourceRow}>
                    <View style={styles.quickSourceTag}>
                      <Ionicons name="logo-instagram" size={13} color="#E1306C" />
                      <Text style={styles.quickSourceText}>Reels & TikTok</Text>
                    </View>
                    <View style={styles.quickSourceTag}>
                      <Ionicons name="radio-outline" size={13} color="#38BDF8" />
                      <Text style={styles.quickSourceText}>Radio & TV</Text>
                    </View>
                    <View style={styles.quickSourceTag}>
                      <Ionicons name="musical-notes-outline" size={13} color="#A855F7" />
                      <Text style={styles.quickSourceText}>Clubs & Cafes</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* STATE B: LISTENING (Unique, Clean & Neat Acoustic Visualizer) */}
            {recognitionState === 'LISTENING' && (
              <View style={styles.listeningStage}>
                {/* 1. Live Acoustic Pill Badge */}
                <View style={styles.liveListeningBadge}>
                  <Animated.View style={[styles.liveListeningDot, { opacity: liveBlinkAnim }]} />
                  <Text style={styles.liveListeningText}>LISTENING TO AUDIO</Text>
                </View>

                {/* 2. Central Acoustic Orb & Atmospheric Breathing Aura */}
                <View style={styles.acousticSphereContainer}>
                  {/* Atmospheric Radial Aura */}
                  <Animated.View
                    style={[
                      styles.listeningAura,
                      {
                        transform: [{ scale: auraScale }],
                        opacity: auraOpacity,
                      },
                    ]}
                  />

                  {/* Delicate Secondary Ripple */}
                  <Animated.View
                    style={[
                      styles.listeningAuraOuter,
                      {
                        transform: [{ scale: auraScale }],
                        opacity: auraAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.15, 0.45, 0],
                        }),
                      },
                    ]}
                  />

                  {/* Central Acoustic Orb */}
                  <Animated.View style={{ transform: [{ scale: micScaleAnim }] }}>
                    <View style={styles.listeningOrb}>
                      <LinearGradient
                        colors={['#C084FC', '#A855F7', '#EC4899', '#38BDF8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.listeningOrbBorder}
                      >
                        <View style={styles.listeningOrbInner}>
                          <LinearGradient
                            colors={['rgba(168, 85, 247, 0.28)', 'rgba(7, 8, 16, 0.95)', '#040508']}
                            style={StyleSheet.absoluteFill}
                          />
                          <Ionicons name="mic" size={48} color="#FFFFFF" />
                        </View>
                      </LinearGradient>
                    </View>
                  </Animated.View>
                </View>

                {/* 3. Dynamic Acoustic Frequency Spectrum Equalizer */}
                <View style={styles.spectrumContainer}>
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqBar1 }] }]} />
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqBar2 }] }]} />
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqBar3 }] }]} />
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqBar4 }], backgroundColor: '#EC4899' }]} />
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqBar5 }] }]} />
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqBar6 }] }]} />
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqBar7 }] }]} />
                </View>

                {/* 4. Minimalist Status & 5-Second Buffer Progress Track */}
                <View style={styles.listeningStatusWrap}>
                  <Text style={styles.listeningHeading}>Listening for Music...</Text>

                  {/* Segmented 5-Second Buffer Progress Track */}
                  <View style={styles.bufferTrack}>
                    {[1, 2, 3, 4, 5].map((step) => {
                      const isElapsed = (5 - listeningCountdown) >= step;
                      return (
                        <View
                          key={step}
                          style={[
                            styles.bufferSegment,
                            isElapsed && styles.bufferSegmentActive,
                          ]}
                        />
                      );
                    })}
                  </View>

                  <Text style={styles.listeningSub}>
                    Capturing acoustic fingerprint •{' '}
                    <Text style={styles.listeningCountdownNumber}>0:0{listeningCountdown}</Text>
                  </Text>

                  <Text style={styles.listeningHint}>
                    Keep your phone close to the music source
                  </Text>

                  {/* 5. Minimalist Frosted Glass Cancel Button */}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={cancelListening}
                    style={styles.neatCancelBtn}
                  >
                    <Ionicons name="close-circle-outline" size={17} color="#94A3B8" />
                    <Text style={styles.neatCancelText}>Stop Listening</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STATE C: SEARCHING */}
            {recognitionState === 'SEARCHING' && (
              <View style={styles.centerStage}>
                <Animated.View
                  style={[
                    styles.searchingSpinner,
                    {
                      transform: [
                        {
                          rotate: searchRotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#A855F7', 'transparent', '#EC4899']}
                    style={styles.searchingGradient}
                  />
                </Animated.View>

                <View style={styles.searchingInnerCircle}>
                  <Ionicons name="sparkles" size={42} color="#C084FC" />
                </View>

                <View style={styles.statusWrap}>
                  <Text style={styles.statusHeading}>Identifying Your Track...</Text>
                  <Text style={styles.statusSub}>
                    Matching acoustic waveform with millions of global songs
                  </Text>
                  <ActivityIndicator size="small" color="#A855F7" style={{ marginTop: 12 }} />
                </View>
              </View>
            )}

            {/* STATE D: SONG FOUND */}
            {recognitionState === 'FOUND' && recognizedSong && (
              <ScrollView
                style={styles.resultScroll}
                contentContainerStyle={styles.resultScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Match Banner Tag */}
                <View style={styles.matchBadgeRow}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.matchBadge}
                  >
                    <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                    <Text style={styles.matchBadgeText}>
                      MATCH FOUND • {recognizedSong.confidence || 95}% CONFIDENCE
                    </Text>
                  </LinearGradient>

                  {recognizedSong.inPulseSound && (
                    <View style={styles.inLibraryBadge}>
                      <Ionicons name="play" size={12} color="#C084FC" />
                      <Text style={styles.inLibraryBadgeText}>IN PULSE SOUND CATALOG</Text>
                    </View>
                  )}
                </View>

                {/* Album Artwork Card */}
                <View style={styles.artworkContainer}>
                  {recognizedSong.artworkUrl ? (
                    <Image
                      source={{ uri: recognizedSong.artworkUrl }}
                      style={styles.resultArtwork}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={['#2E1065', '#3B0764']}
                      style={styles.resultArtworkFallback}
                    >
                      <Ionicons name="musical-notes" size={64} color="#C084FC" />
                    </LinearGradient>
                  )}
                </View>

                {/* Track Title & Artist Info */}
                <View style={styles.trackDetailsWrap}>
                  <Text style={styles.resultTitle} numberOfLines={2}>
                    {recognizedSong.songTitle}
                  </Text>
                  <Text style={styles.resultArtist} numberOfLines={1}>
                    {recognizedSong.artist}
                  </Text>
                  <Text style={styles.resultAlbum} numberOfLines={1}>
                    {recognizedSong.album} {recognizedSong.releaseDate ? `• ${recognizedSong.releaseDate.split('-')[0]}` : ''}
                  </Text>
                </View>

                {/* ACTION BUTTONS */}
                <View style={styles.actionsContainer}>
                  {/* Play in Pulse Sound (Primary if in catalog) */}
                  {recognizedSong.inPulseSound ? (
                    <TouchableOpacity
                      onPress={() => handlePlayRecognized(recognizedSong)}
                      style={styles.primaryPlayBtn}
                    >
                      <LinearGradient
                        colors={['#A855F7', '#7C3AED']}
                        style={styles.primaryPlayGradient}
                      >
                        <Ionicons name="play" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryPlayText}>Play in PULSE SOUND</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    /* Track outside catalog -> Show external streaming & Notice */
                    <View style={styles.outsideCatalogNotice}>
                      <Text style={styles.outsideCatalogNoticeText}>
                        Track identified! This song is not in the PULSE SOUND library yet.
                      </Text>
                      {recognizedSong.externalLinks?.spotify ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(recognizedSong.externalLinks.spotify)}
                          style={styles.spotifyExternalBtn}
                        >
                          <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.spotifyExternalBtnText}>Open in Spotify / External</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}

                  {/* Secondary Actions Row */}
                  <View style={styles.secondaryRow}>
                    <TouchableOpacity
                      onPress={() => {
                        const trackObj = recognizedSong.pulseTrack || {
                          id: recognizedSong.historyId,
                          name: recognizedSong.songTitle,
                          desc: recognizedSong.artist,
                          image: recognizedSong.artworkUrl,
                        };
                        setAddToPlaylistSong(trackObj);
                      }}
                      style={styles.secondaryBtn}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#C084FC" />
                      <Text style={styles.secondaryBtnText}>Add to Playlist</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleShareSong(recognizedSong)}
                      style={styles.secondaryBtn}
                    >
                      <Ionicons name="share-social-outline" size={20} color="#C084FC" />
                      <Text style={styles.secondaryBtnText}>Share Song</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Identify Another Button */}
                  <TouchableOpacity
                    onPress={() => {
                      setRecognizedSong(null);
                      setRecognitionState('READY');
                    }}
                    style={styles.identifyAnotherBtn}
                  >
                    <Ionicons name="refresh" size={18} color="#94A3B8" />
                    <Text style={styles.identifyAnotherText}>Identify Another Song</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {/* STATE E: ERROR / NO MATCH */}
            {recognitionState === 'ERROR' && (
              <View style={styles.centerStage}>
                <View style={styles.errorIconWrap}>
                  <Ionicons name="alert-circle-outline" size={56} color="#F43F5E" />
                </View>

                <View style={styles.statusWrap}>
                  <Text style={styles.statusHeading}>Couldn't Identify Track</Text>
                  <Text style={styles.statusSub}>
                    {errorMessage || 'Make sure the song is playing clearly and there is minimal background chatter.'}
                  </Text>

                  <TouchableOpacity
                    onPress={startListening}
                    style={styles.tryAgainBtn}
                  >
                    <LinearGradient
                      colors={['#A855F7', '#EC4899']}
                      style={styles.tryAgainGradient}
                    >
                      <Ionicons name="refresh" size={18} color="#FFFFFF" />
                      <Text style={styles.tryAgainBtnText}>Try Again</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setRecognitionState('READY')}
                    style={{ marginTop: 16 }}
                  >
                    <Text style={{ color: '#94A3B8', fontSize: 13 }}>Back to Start</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === 'HISTORY' && (
          <View style={styles.tabContentWrap}>
            <View style={styles.tabSectionHeader}>
              <Text style={styles.tabSectionTitle}>Recognition History ({historyList.length})</Text>
              {historyList.length > 0 && (
                <TouchableOpacity
                  onPress={async () => {
                    await clearAllRecognitionHistory();
                    setHistoryList([]);
                  }}
                  style={styles.clearHistoryBtn}
                >
                  <Text style={styles.clearHistoryText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingHistory ? (
              <ActivityIndicator size="large" color="#A855F7" style={{ marginTop: 40 }} />
            ) : historyList.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="musical-notes-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>No History Yet</Text>
                <Text style={styles.emptySub}>
                  Songs you identify will appear here so you can re-listen or add them to playlists anytime.
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('RECOGNIZE')}
                  style={styles.emptyActionBtn}
                >
                  <Text style={styles.emptyActionText}>Identify a Song Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {historyList.map((item) => (
                  <View key={item.id} style={styles.historyRow}>
                    {item.artworkUrl ? (
                      <Image source={{ uri: item.artworkUrl }} style={styles.historyThumb} />
                    ) : (
                      <View style={styles.historyThumbFallback}>
                        <Ionicons name="disc" size={20} color="#C084FC" />
                      </View>
                    )}

                    <View style={styles.historyInfo}>
                      <Text style={styles.historySongTitle} numberOfLines={1}>
                        {item.songTitle}
                      </Text>
                      <Text style={styles.historySongArtist} numberOfLines={1}>
                        {item.artist}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.recognizedAt).toLocaleDateString()} • {new Date(item.recognizedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    <View style={styles.historyActions}>
                      <TouchableOpacity
                        onPress={() => handlePlayRecognized(item)}
                        style={styles.historyPlayBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="play-circle" size={32} color="#C084FC" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={async () => {
                          const updated = await deleteLocalHistoryItem(item.id);
                          setHistoryList(updated);
                        }}
                        style={styles.historyDeleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* TAB 3: SETTINGS & FLOATING OVERLAY */}
        {activeTab === 'SETTINGS' && (
          <ScrollView style={styles.tabContentWrap} showsVerticalScrollIndicator={false}>
            <Text style={styles.tabSectionTitle}>PULSE FIND Configuration</Text>

            {/* In-App Floating Bubble Toggle */}
            <View style={styles.settingCard}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.settingTitle}>In-App Floating Bubble</Text>
                <Text style={styles.settingDesc}>
                  Shows the draggable glowing microphone bubble inside PULSE SOUND for instant song identification.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPulseBubbleVisible(!isPulseBubbleVisible)}
                style={[styles.toggleBtn, isPulseBubbleVisible && styles.toggleBtnActive]}
              >
                <View style={[styles.toggleKnob, isPulseBubbleVisible && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>

            {/* Android System Overlay Over Other Apps (Instagram, Reels, TikTok) */}
            <View style={styles.settingCard}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.settingTitle}>Floating Bubble Over Other Apps</Text>
                  <View style={styles.androidBadge}>
                    <Text style={styles.androidBadgeText}>ANDROID</Text>
                  </View>
                </View>
                <Text style={styles.settingDesc}>
                  Keep a small draggable PULSE FIND bubble visible above Instagram Reels, TikTok, and YouTube so you can identify music instantly while scrolling.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleToggleSystemOverlay}
                style={[styles.toggleBtn, isOverlayActive && styles.toggleBtnActive]}
              >
                <View style={[styles.toggleKnob, isOverlayActive && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>

            {/* Notice / Permission Banner */}
            {overlayStatusNotice ? (
              <View style={styles.noticeCard}>
                <Ionicons name="information-circle-outline" size={20} color="#38BDF8" />
                <Text style={styles.noticeText}>{overlayStatusNotice}</Text>
              </View>
            ) : null}

            {/* Grant Permission Button */}
            {Platform.OS === 'android' && !hasOverlayPermission && (
              <TouchableOpacity
                onPress={requestOverlayPermission}
                style={styles.grantPermBtn}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                <Text style={styles.grantPermText}>Grant "Display Over Other Apps" Permission</Text>
              </TouchableOpacity>
            )}

            {/* Architecture & Build Documentation */}
            <View style={styles.docCard}>
              <Text style={styles.docTitle}>💡 Testing Overlay with Instagram</Text>
              <Text style={styles.docBody}>
                1. <Text style={{ fontWeight: 'bold' }}>In-App Mode (Expo Go)</Text>: The in-app draggable microphone bubble is fully functional inside PULSE SOUND.{'\n\n'}
                2. <Text style={{ fontWeight: 'bold' }}>System-Wide Mode (Over Instagram)</Text>: Android requires the native foreground overlay service and <Text style={{ color: '#C084FC' }}>SYSTEM_ALERT_WINDOW</Text>. To test floating above Instagram Reels, compile the prebuild development build using:{'\n'}
                <Text style={styles.codeSnippet}>npx expo run:android</Text>
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070810',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  badgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  tabIconGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  tabIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconBtnActive: {
    backgroundColor: 'rgba(192, 132, 252, 0.22)',
    borderWidth: 1,
    borderColor: '#C084FC',
  },
  recognizeBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  readyAura: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  shazamButton: {
    width: 164,
    height: 164,
    borderRadius: 82,
    ...Platform.select({
      ios: {
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.65,
        shadowRadius: 24,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  shazamGradient: {
    width: 164,
    height: 164,
    borderRadius: 82,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.88)',
    overflow: 'hidden',
  },
  statusWrap: {
    marginTop: 36,
    alignItems: 'center',
  },
  statusHeading: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusSub: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  quickSourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
  },
  quickSourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickSourceText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },

  /* Enhanced Acoustic Listening UI */
  listeningStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  liveListeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.35)',
    marginBottom: 24,
  },
  liveListeningDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EC4899',
  },
  liveListeningText: {
    color: '#F472B6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  acousticSphereContainer: {
    width: 210,
    height: 210,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeningAura: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
  },
  listeningAuraOuter: {
    position: 'absolute',
    width: 205,
    height: 205,
    borderRadius: 102.5,
    borderWidth: 1.5,
    borderColor: 'rgba(236, 72, 153, 0.38)',
  },
  listeningOrb: {
    width: 136,
    height: 136,
    borderRadius: 68,
    ...Platform.select({
      ios: {
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  listeningOrbBorder: {
    width: 136,
    height: 136,
    borderRadius: 68,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeningOrbInner: {
    width: '100%',
    height: '100%',
    borderRadius: 66,
    backgroundColor: '#070810',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  spectrumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 64,
    marginTop: 18,
    marginBottom: 10,
  },
  eqBar: {
    width: 5,
    height: 48,
    borderRadius: 3,
    backgroundColor: '#C084FC',
  },
  listeningStatusWrap: {
    alignItems: 'center',
    marginTop: 10,
  },
  listeningHeading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  bufferTrack: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  bufferSegment: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  bufferSegmentActive: {
    backgroundColor: '#C084FC',
  },
  listeningSub: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  listeningCountdownNumber: {
    color: '#C084FC',
    fontWeight: '800',
  },
  listeningHint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
  },
  neatCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  neatCancelText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  countdownText: {
    color: '#CBD5E1',
    fontSize: 14,
    marginTop: 6,
  },
  cancelBtn: {
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  searchingSpinner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    position: 'absolute',
  },
  searchingGradient: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  searchingInnerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#070810',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  resultScroll: {
    flex: 1,
    width: '100%',
  },
  resultScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  matchBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  matchBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inLibraryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(192, 132, 252, 0.18)',
    borderWidth: 1,
    borderColor: '#C084FC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  inLibraryBadgeText: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  artworkContainer: {
    width: 220,
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 22,
  },
  resultArtwork: {
    width: '100%',
    height: '100%',
  },
  resultArtworkFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackDetailsWrap: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  resultArtist: {
    color: '#C084FC',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  resultAlbum: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryPlayBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryPlayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
  },
  primaryPlayText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  outsideCatalogNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  outsideCatalogNoticeText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  spotifyExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
  },
  spotifyExternalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 13,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  identifyAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  identifyAnotherText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  errorIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  tryAgainBtn: {
    marginTop: 22,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tryAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 26,
    paddingVertical: 13,
  },
  tryAgainBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tabContentWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  clearHistoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  clearHistoryText: {
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  historyThumbFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
    marginRight: 10,
  },
  historySongTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  historySongArtist: {
    color: '#C084FC',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 3,
  },
  historyDate: {
    color: '#64748B',
    fontSize: 10,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyPlayBtn: {
    padding: 2,
  },
  historyDeleteBtn: {
    padding: 6,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 22,
    backgroundColor: '#9333EA',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 20,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
  },
  androidBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  androidBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  toggleBtn: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#334155',
    padding: 2,
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#9333EA',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  noticeCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  noticeText: {
    flex: 1,
    color: '#38BDF8',
    fontSize: 12,
    lineHeight: 17,
  },
  grantPermBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 16,
  },
  grantPermText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  docCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 30,
  },
  docTitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  docBody: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  codeSnippet: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#C084FC',
    fontWeight: '700',
  },
});

export default PulseFindModal;

