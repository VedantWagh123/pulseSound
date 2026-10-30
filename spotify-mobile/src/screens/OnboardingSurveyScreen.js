import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Bouncy Animated Green Tick Component
const SmoothGreenCheck = ({ size = 20, color = '#10B981', style }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
      <Ionicons name="checkmark-circle" size={size} color={color} />
    </Animated.View>
  );
};

// Smooth Radio Check with Spring Pop
const SmoothRadioCheck = ({ isSelected }) => {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    if (isSelected) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 70,
        useNativeDriver: true,
      }).start();
    }
  }, [isSelected]);

  return (
    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
      {isSelected && (
        <Animated.View style={[styles.radioInner, { transform: [{ scale: scaleAnim }] }]} />
      )}
    </View>
  );
};

// Question 1: Genres
const GENRES_LIST = [
  { id: 'edm', name: 'EDM & Electronic', icon: 'flash-outline', gradient: ['#7C3AED', '#4F46E5'] },
  { id: 'lofi', name: 'Lo-Fi & Chill', icon: 'headset-outline', gradient: ['#2563EB', '#1D4ED8'] },
  { id: 'pop', name: 'Pop Hits', icon: 'sparkles-outline', gradient: ['#DB2777', '#BE185D'] },
  { id: 'hiphop', name: 'Hip-Hop & Trap', icon: 'radio-outline', gradient: ['#D97706', '#B45309'] },
  { id: 'rock', name: 'Rock & Metal', icon: 'musical-notes-outline', gradient: ['#DC2626', '#B91C1C'] },
  { id: 'classical', name: 'Classical & Acoustic', icon: 'color-palette-outline', gradient: ['#059669', '#047857'] },
  { id: 'ambient', name: 'Ambient & Space', icon: 'planet-outline', gradient: ['#4F46E5', '#4338CA'] },
  { id: 'rnb', name: 'R&B & Soul', icon: 'heart-outline', gradient: ['#9333EA', '#7E22CE'] },
  { id: 'indie', name: 'Indie & Alternative', icon: 'leaf-outline', gradient: ['#0D9488', '#0F766E'] },
];

// Question 2: Artists (Expanded Star Lineup)
const ARTISTS_LIST = [
  { id: 'arijit', name: 'Arijit Singh', genre: 'Bollywood • Soul', initials: 'AS', color: '#EC4899' },
  { id: 'weeknd', name: 'The Weeknd', genre: 'Synthpop • R&B', initials: 'TW', color: '#8B5CF6' },
  { id: 'taylor', name: 'Taylor Swift', genre: 'Pop • Acoustic', initials: 'TS', color: '#F59E0B' },
  { id: 'apdhillon', name: 'AP Dhillon', genre: 'Punjabi • Trap', initials: 'AP', color: '#06B6D4' },
  { id: 'billie', name: 'Billie Eilish', genre: 'Alt-Pop • Electro', initials: 'BE', color: '#10B981' },
  { id: 'alan', name: 'Alan Walker', genre: 'EDM • Dance', initials: 'AW', color: '#3B82F6' },
  { id: 'diljit', name: 'Diljit Dosanjh', genre: 'Punjabi • Folk Pop', initials: 'DD', color: '#F97316' },
  { id: 'shreya', name: 'Shreya Ghoshal', genre: 'Bollywood • Melody', initials: 'SG', color: '#D946EF' },
  { id: 'drake', name: 'Drake', genre: 'Hip-Hop • Trap', initials: 'DR', color: '#6366F1' },
  { id: 'badshah', name: 'Badshah', genre: 'Desi Hip-Hop • Party', initials: 'BD', color: '#EF4444' },
  { id: 'dualipa', name: 'Dua Lipa', genre: 'Dance-Pop • Club', initials: 'DL', color: '#A855F7' },
  { id: 'post', name: 'Post Malone', genre: 'Melodic Rap • Rock', initials: 'PM', color: '#E11D48' },
];

// Question 3: Listening Time
const LISTENING_TIMES = [
  { id: 'gym', label: 'Workout & Fitness', desc: 'High BPM pump-up tracks', icon: 'flash' },
  { id: 'night', label: 'Late Night Chill', desc: 'Mellow lo-fi & calming soundscapes', icon: 'moon' },
  { id: 'focus', label: 'Deep Work & Study', desc: 'No-distraction flow state rhythms', icon: 'laptop' },
  { id: 'commute', label: 'Travel & Commute', desc: 'Uplifting melodies for the road', icon: 'car' },
  { id: 'party', label: 'Weekend & Party Vibes', desc: 'Bass-heavy club drops & anthems', icon: 'flame' },
];

// Question 4: Audio Quality
const AUDIO_QUALITIES = [
  { id: 'hifi', label: 'Studio Master 320kbps', desc: 'Uncompressed high-definition audio', icon: 'disc' },
  { id: 'bass', label: 'Club Bass Boost', desc: 'Deep sub-bass punch & club low-end', icon: 'hardware-chip' },
  { id: 'spatial', label: '3D Spatial Surround', desc: 'Immersive concert hall depth', icon: 'globe' },
  { id: 'saver', label: 'Data Saver', desc: 'Optimized for slow network connectivity', icon: 'cellular' },
];

// Question 5: Daily Goal
const LISTENING_GOALS = [
  { id: 'light', label: '15 - 30 Minutes', desc: 'Quick commute & daily breaks' },
  { id: 'medium', label: '1 - 2 Hours', desc: 'Daily music & work sessions' },
  { id: 'heavy', label: '3+ Hours / All Day', desc: 'Passionate audiophile listener' },
];

export const OnboardingSurveyScreen = () => {
  const { saveSurvey, currentUser } = useAuth();
  const { width } = useWindowDimensions();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Selected Answers State
  const [selectedGenres, setSelectedGenres] = useState(['EDM & Electronic', 'Lo-Fi & Chill', 'Pop Hits']);
  const [selectedArtists, setSelectedArtists] = useState(['Arijit Singh', 'The Weeknd']);
  const [selectedTime, setSelectedTime] = useState('Late Night Chill');
  const [selectedQuality, setSelectedQuality] = useState('Studio Master 320kbps');
  const [selectedGoal, setSelectedGoal] = useState('1 - 2 Hours');

  const [saving, setSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Smooth Fade-in & Fade-out Step Animation Refs
  const stepFadeAnim = useRef(new Animated.Value(1)).current;
  const stepSlideAnim = useRef(new Animated.Value(0)).current;

  // Stamp celebration animation refs
  const stampScale = useRef(new Animated.Value(0.2)).current;
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const stampRotate = useRef(new Animated.Value(0)).current;

  // Toggle Genre
  const toggleGenre = (name) => {
    setSelectedGenres((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  // Toggle Artist
  const toggleArtist = (name) => {
    setSelectedArtists((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  // Transition Step with Fade-in and Fade-out Animation
  const transitionToStep = (newStep, direction = 'next') => {
    Animated.parallel([
      Animated.timing(stepFadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(stepSlideAnim, {
        toValue: direction === 'next' ? -20 : 20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(newStep);
      stepSlideAnim.setValue(direction === 'next' ? 24 : -24);
      Animated.parallel([
        Animated.timing(stepFadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(stepSlideAnim, {
          toValue: 0,
          friction: 7,
          tension: 45,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      transitionToStep(currentStep + 1, 'next');
    } else {
      handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      transitionToStep(currentStep - 1, 'prev');
    }
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    setShowCelebration(true);

    // Trigger celebratory stamp animation
    Animated.parallel([
      Animated.spring(stampScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(stampOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(stampRotate, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const surveyPayload = {
      favoriteGenres: selectedGenres,
      favoriteArtists: selectedArtists,
      listeningTime: selectedTime,
      audioQuality: selectedQuality,
      listeningGoal: selectedGoal,
    };

    // Allow user to see celebratory stamp bounce and seal for 2.2s, then commit to DB and transition to app
    setTimeout(async () => {
      try {
        await saveSurvey(surveyPayload);
      } catch (e) {
        console.log('Error saving survey:', e);
      } finally {
        setSaving(false);
      }
    }, 2200);
  };

  const stampRotationDeg = stampRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-18deg', '-4deg'],
  });

  return (
    <View style={styles.container}>
      {/* Ambient Neon Atmosphere */}
      <LinearGradient
        colors={['rgba(124, 58, 237, 0.22)', 'rgba(16, 185, 129, 0.08)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={styles.ambientGlow}
        pointerEvents="none"
      />

      {/* Top Navigation & Step Indicator */}
      <View style={styles.topBar}>
        {currentStep > 1 ? (
          <TouchableOpacity onPress={handleBack} style={styles.navBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.navBtnPlaceholder} />
        )}

        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            return (
              <View
                key={stepNum}
                style={[
                  styles.progressDot,
                  isCurrent && styles.progressDotCurrent,
                  isCompleted && styles.progressDotCompleted,
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity onPress={handleNext} style={styles.skipBtn}>
          <Text style={styles.skipText}>{currentStep === totalSteps ? 'Finish' : 'Skip'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Question Body Container (Fade In & Slide Transition) */}
        <Animated.View
          style={{
            opacity: stepFadeAnim,
            transform: [{ translateY: stepSlideAnim }],
          }}
        >
          {/* Step 1: Genres */}
          {currentStep === 1 && (
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepBadge}>STEP 1 OF 5 • MUSIC TASTE</Text>
                <Text style={styles.stepTitle}>What genres do you vibe with?</Text>
                <Text style={styles.stepSubtitle}>
                  Select the sounds that define your energy. We will curate your home mixes.
                </Text>
              </View>

              <View style={styles.genreGrid}>
                {GENRES_LIST.map((g) => {
                  const isSelected = selectedGenres.includes(g.name);
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => toggleGenre(g.name)}
                      activeOpacity={0.78}
                      style={[styles.genreCard, isSelected && styles.genreCardSelected]}
                    >
                      <View style={styles.genreIconWrap}>
                        <Ionicons
                          name={g.icon}
                          size={20}
                          color={isSelected ? '#34D399' : '#C084FC'}
                        />
                      </View>
                      <Text style={[styles.genreName, isSelected && styles.genreNameSelected]}>
                        {g.name}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <SmoothGreenCheck size={18} color="#10B981" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 2: Artists */}
          {currentStep === 2 && (
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepBadge}>STEP 2 OF 5 • TOP ARTISTS</Text>
                <Text style={styles.stepTitle}>Pick your favorite artists</Text>
                <Text style={styles.stepSubtitle}>
                  Tap to select who you want to hear most. Selected artists get a verified green checkmark!
                </Text>
              </View>

              <View style={styles.artistGrid}>
                {ARTISTS_LIST.map((a) => {
                  const isSelected = selectedArtists.includes(a.name);
                  return (
                    <TouchableOpacity
                      key={a.id}
                      onPress={() => toggleArtist(a.name)}
                      activeOpacity={0.78}
                      style={[styles.artistCard, isSelected && styles.artistCardSelected]}
                    >
                      <View
                        style={[
                          styles.artistAvatar,
                          { backgroundColor: a.color },
                          isSelected && styles.artistAvatarSelected,
                        ]}
                      >
                        <Text style={styles.artistInitials}>{a.initials}</Text>
                        {isSelected && (
                          <View style={styles.artistCheckBadge}>
                            <SmoothGreenCheck size={26} color="#10B981" />
                          </View>
                        )}
                      </View>
                      <Text numberOfLines={1} style={[styles.artistName, isSelected && styles.artistNameSelected]}>
                        {a.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.artistGenre}>
                        {a.genre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 3: Listening Time */}
          {currentStep === 3 && (
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepBadge}>STEP 3 OF 5 • LISTENING HABITS</Text>
                <Text style={styles.stepTitle}>When do you listen most?</Text>
                <Text style={styles.stepSubtitle}>
                  We will schedule fresh personalized recommendations when you need them.
                </Text>
              </View>

              <View style={styles.optionList}>
                {LISTENING_TIMES.map((item) => {
                  const isSelected = selectedTime === item.label;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSelectedTime(item.label)}
                      activeOpacity={0.8}
                      style={[styles.listCard, isSelected && styles.listCardSelected]}
                    >
                      <View style={[styles.listIconWrap, isSelected && styles.listIconWrapSelected]}>
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={isSelected ? '#34D399' : '#C084FC'}
                        />
                      </View>
                      <View style={styles.listTextWrap}>
                        <Text style={[styles.listTitle, isSelected && styles.listTitleSelected]}>
                          {item.label}
                        </Text>
                        <Text style={styles.listDesc}>{item.desc}</Text>
                      </View>
                      <SmoothRadioCheck isSelected={isSelected} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 4: Audio Experience */}
          {currentStep === 4 && (
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepBadge}>STEP 4 OF 5 • AUDIO QUALITY</Text>
                <Text style={styles.stepTitle}>Choose your sound signature</Text>
                <Text style={styles.stepSubtitle}>
                  Tailored for Pulse Sound 9-Band DSP Equalizer and crossfade engine.
                </Text>
              </View>

              <View style={styles.optionList}>
                {AUDIO_QUALITIES.map((item) => {
                  const isSelected = selectedQuality === item.label;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSelectedQuality(item.label)}
                      activeOpacity={0.8}
                      style={[styles.listCard, isSelected && styles.listCardSelected]}
                    >
                      <View style={[styles.listIconWrap, isSelected && styles.listIconWrapSelected]}>
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={isSelected ? '#34D399' : '#C084FC'}
                        />
                      </View>
                      <View style={styles.listTextWrap}>
                        <Text style={[styles.listTitle, isSelected && styles.listTitleSelected]}>
                          {item.label}
                        </Text>
                        <Text style={styles.listDesc}>{item.desc}</Text>
                      </View>
                      <SmoothRadioCheck isSelected={isSelected} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 5: Daily Goal */}
          {currentStep === 5 && (
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepBadge}>STEP 5 OF 5 • LISTENING GOAL</Text>
                <Text style={styles.stepTitle}>Your daily music goal?</Text>
                <Text style={styles.stepSubtitle}>
                  Set your personal daily consumption target for your listening profile.
                </Text>
              </View>

              <View style={styles.optionList}>
                {LISTENING_GOALS.map((item) => {
                  const isSelected = selectedGoal === item.label;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSelectedGoal(item.label)}
                      activeOpacity={0.8}
                      style={[styles.listCard, isSelected && styles.listCardSelected]}
                    >
                      <View style={[styles.listIconWrap, isSelected && styles.listIconWrapSelected]}>
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color={isSelected ? '#34D399' : '#C084FC'}
                        />
                      </View>
                      <View style={styles.listTextWrap}>
                        <Text style={[styles.listTitle, isSelected && styles.listTitleSelected]}>
                          {item.label}
                        </Text>
                        <Text style={styles.listDesc}>{item.desc}</Text>
                      </View>
                      <SmoothRadioCheck isSelected={isSelected} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={styles.continueBtn}
        >
          <LinearGradient
            colors={currentStep === totalSteps ? ['#059669', '#10B981'] : ['#7C3AED', '#9333EA']}
            style={styles.continueGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.continueBtnText}>
              {currentStep === totalSteps ? 'Finalize & Launch Studio' : 'Continue'}
            </Text>
            <Ionicons
              name={currentStep === totalSteps ? 'checkmark-circle' : 'arrow-forward'}
              size={18}
              color="#FFFFFF"
            />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Celebration Stamp Modal */}
      {showCelebration && (
        <View style={styles.celebrationOverlay}>
          <Animated.View
            style={[
              styles.stampCard,
              {
                opacity: stampOpacity,
                transform: [{ scale: stampScale }, { rotate: stampRotationDeg }],
              },
            ]}
          >
            <LinearGradient
              colors={['#1E1B4B', '#0F1222']}
              style={styles.stampInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.stampIconWrap}>
                <Ionicons name="sparkles" size={36} color="#34D399" />
              </View>

              <Text style={styles.stampBadge}>VERIFIED AUDIOPHILE</Text>
              <Text style={styles.stampTitle}>SOUND PROFILE READY!</Text>
              <Text style={styles.stampSubtitle}>
                Algorithm customized for {currentUser?.name || 'you'}. Launching your Hi-Fi Pulse Studio...
              </Text>

              <View style={styles.stampSeal}>
                <Ionicons name="checkmark-done-circle" size={28} color="#10B981" />
                <Text style={styles.stampSealText}>PULSE SOUND • CERTIFIED</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070810',
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161B2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnPlaceholder: {
    width: 36,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E2338',
  },
  progressDotCurrent: {
    width: 32,
    backgroundColor: '#C084FC',
  },
  progressDotCompleted: {
    backgroundColor: '#10B981',
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skipText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepBox: {
    marginBottom: 24,
  },
  stepHeader: {
    marginBottom: 20,
  },
  stepBadge: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  stepSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121524',
    borderWidth: 1.5,
    borderColor: '#1E2338',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  genreCardSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  genreIconWrap: {
    marginRight: 2,
  },
  genreName: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  genreNameSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  artistCard: {
    width: '48%',
    backgroundColor: '#121524',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#1E2338',
    alignItems: 'center',
  },
  artistCardSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  artistAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  artistAvatarSelected: {
    borderWidth: 2.5,
    borderColor: '#10B981',
  },
  artistInitials: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  artistCheckBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#070810',
    borderRadius: 12,
  },
  artistName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  artistNameSelected: {
    color: '#34D399',
  },
  artistGenre: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  optionList: {
    gap: 10,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121524',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#1E2338',
    gap: 14,
  },
  listCardSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  listIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listIconWrapSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  listTitleSelected: {
    color: '#34D399',
  },
  listDesc: {
    color: '#94A3B8',
    fontSize: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#10B981',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  continueBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  continueGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 8, 16, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  stampCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  stampInner: {
    padding: 28,
    alignItems: 'center',
  },
  stampIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  stampBadge: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  stampTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  stampSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  stampSeal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  stampSealText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
