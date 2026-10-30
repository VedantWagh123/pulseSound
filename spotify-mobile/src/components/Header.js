import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

export const Header = ({ onFilterChange }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [isLockedModalOpen, setIsLockedModalOpen] = useState(false);
  const {
    setIsProfileOpen,
    setIsNotificationModalOpen,
    unreadNotificationCount,
    showInAppToast,
  } = usePlayer();
  const { currentUser } = useAuth();
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 375;
  const filters = ['All', 'Trending', 'Electronic', 'Chill', 'Hip-Hop', 'Podcasts'];

  // Smooth attractive pulse and glow animation on the PULSE SOUND brand text
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.9)).current;

  // Ambient Sound Dot Background Animations behind PULSE SOUND
  const dotAnim1 = useRef(new Animated.Value(0.3)).current;
  const dotAnim2 = useRef(new Animated.Value(0.5)).current;
  const dotAnim3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const textLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.9,
            duration: 1600,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const makeDotLoop = (anim, min, max, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: max, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: min, duration, useNativeDriver: true }),
        ])
      );

    const l1 = makeDotLoop(dotAnim1, 0.25, 0.9, 1300);
    const l2 = makeDotLoop(dotAnim2, 0.35, 1.0, 1700);
    const l3 = makeDotLoop(dotAnim3, 0.2, 0.85, 1100);

    textLoop.start();
    l1.start();
    l2.start();
    l3.start();

    return () => {
      textLoop.stop();
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, []);

  const handleFilter = (filter) => {
    setActiveFilter(filter);
    if (onFilterChange) onFilterChange(filter);
  };

  return (
    <View style={[styles.container, isSmallScreen && styles.containerSmall]}>
      <View style={styles.topRow}>
        {/* Animated Brand Title PULSE SOUND with background dynamic sound dot field */}
        <View style={styles.brandContainer}>
          {/* Ambient Acoustic Dot Grid / Particles in Background */}
          <View style={styles.ambientDotsContainer} pointerEvents="none">
            <Animated.View style={[styles.bgDot, styles.dot1, { opacity: dotAnim1, transform: [{ scale: dotAnim1 }] }]} />
            <Animated.View style={[styles.bgDot, styles.dot2, { opacity: dotAnim2, transform: [{ scale: dotAnim2 }] }]} />
            <Animated.View style={[styles.bgDot, styles.dot3, { opacity: dotAnim3, transform: [{ scale: dotAnim3 }] }]} />
            <Animated.View style={[styles.bgDot, styles.dot4, { opacity: dotAnim2, transform: [{ scale: dotAnim2 }] }]} />
            <Animated.View style={[styles.bgDot, styles.dot5, { opacity: dotAnim1, transform: [{ scale: dotAnim1 }] }]} />
            <Animated.View style={[styles.bgDot, styles.dot6, { opacity: dotAnim3, transform: [{ scale: dotAnim3 }] }]} />
            <Animated.View style={[styles.bgDot, styles.dot7, { opacity: dotAnim2, transform: [{ scale: dotAnim2 }] }]} />
            <Animated.View style={[styles.bgDot, styles.dot8, { opacity: dotAnim1, transform: [{ scale: dotAnim1 }] }]} />
          </View>

          <Animated.View
            style={[
              styles.animatedTextWrapper,
              {
                transform: [{ scale: pulseAnim }],
                opacity: glowAnim,
              },
            ]}
          >
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={[styles.brandName, isSmallScreen && styles.brandNameSmall]}>
                PULSE SOUND
              </Text>
            </View>

            <Text numberOfLines={1} style={styles.brandSubtitle}>
              Sound Experience • Discover
            </Text>
          </Animated.View>
        </View>

        {/* Right Actions: Pulse Find, Notifications & Profile Avatar */}
        <View style={styles.actionsContainer}>
          {/* PULSE FIND Locked Feature Button */}
          <TouchableOpacity
            style={styles.pulseFindHeaderBtn}
            activeOpacity={0.75}
            onPress={() => setIsLockedModalOpen(true)}
            accessibilityLabel="PULSE FIND (Under Development)"
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pulseFindHeaderGradient}
            >
              <Ionicons name="mic" size={15} color="#FFFFFF" />
            </LinearGradient>
            {/* Padlock Badge */}
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={9} color="#070810" />
            </View>
          </TouchableOpacity>

          {/* Functional Bell Notifications Button with Unread Badge */}
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.75}
            onPress={() => setIsNotificationModalOpen(true)}
            accessibilityLabel="Notifications"
          >
            <Ionicons
              name={unreadNotificationCount > 0 ? 'notifications' : 'notifications-outline'}
              size={19}
              color={unreadNotificationCount > 0 ? '#FBBF24' : '#E2E8F0'}
            />
            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Profile Avatar with Smooth Touch */}
          <TouchableOpacity
            style={styles.avatarButton}
            activeOpacity={0.75}
            onPress={() => setIsProfileOpen(true)}
            accessibilityLabel="Open Profile & Settings"
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(currentUser?.name || 'P')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.onlineStatusDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Responsive Horizontal Scroll for Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => handleFilter(filter)}
              style={[styles.pill, isActive && styles.pillActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* PULSE FIND Under Development Preview Modal */}
      <Modal
        visible={isLockedModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLockedModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Ambient Background Gradient */}
            <LinearGradient
              colors={['#17122B', '#0D0E1A', '#06070E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Top Close Button */}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              activeOpacity={0.7}
              onPress={() => setIsLockedModalOpen(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              bounces={false}
            >
              {/* 1. Status Pill Badge */}
              <View style={styles.devBadgePill}>
                <Ionicons name="lock-closed" size={11} color="#F59E0B" />
                <Text style={styles.devBadgeText}>UNDER ACTIVE DEVELOPMENT</Text>
              </View>

              {/* 2. Glowing Hero Icon with Lock */}
              <View style={styles.heroOrbContainer}>
                <LinearGradient
                  colors={['#C084FC', '#EC4899', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroOrb}
                >
                  <View style={styles.heroOrbInner}>
                    <Ionicons name="mic" size={32} color="#FFFFFF" />
                  </View>
                </LinearGradient>
                <View style={styles.heroLockBadge}>
                  <Ionicons name="lock-closed" size={12} color="#070810" />
                </View>
              </View>

              {/* 3. Title & Tagline */}
              <Text style={styles.modalTitle}>PULSE FIND</Text>
              <Text style={styles.modalSubtitle}>AI Acoustic Music Recognition</Text>

              {/* 4. Description ("is feature ke baremai") */}
              <Text style={styles.modalDescription}>
                PULSE FIND is our upcoming Shazam-powered audio recognition engine. It identifies any song playing around you in cafés, radio, or inside Instagram Reels in just 5 seconds.
              </Text>

              {/* 5. Key Feature Highlights */}
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(192, 132, 252, 0.15)' }]}>
                    <Ionicons name="musical-notes" size={16} color="#C084FC" />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>Instant Audio Fingerprinting</Text>
                    <Text style={styles.featureDesc}>
                      Matches acoustic waveforms with millions of songs in seconds.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                    <Ionicons name="layers-outline" size={16} color="#EC4899" />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>Floating Overlay on Other Apps</Text>
                    <Text style={styles.featureDesc}>
                      Identify unknown songs while scrolling Instagram Reels or YouTube.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                    <Ionicons name="play-circle-outline" size={16} color="#38BDF8" />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>1-Tap Direct Playback</Text>
                    <Text style={styles.featureDesc}>
                      Instantly stream or save detected songs to your PULSE SOUND playlists.
                    </Text>
                  </View>
                </View>
              </View>

              {/* 6. Engineering Status Box ("bol under development hai") */}
              <View style={styles.statusBox}>
                <View style={styles.statusHeaderRow}>
                  <View style={styles.statusTitleRow}>
                    <Ionicons name="construct" size={13} color="#F59E0B" />
                    <Text style={styles.statusBoxTitle}>Development Status</Text>
                  </View>
                  <Text style={styles.statusPercent}>85% Built</Text>
                </View>

                {/* Progress bar */}
                <View style={styles.statusBarBg}>
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.statusBarFill}
                  />
                </View>

                <Text style={styles.statusNote}>
                  Acoustic calibration & background Android overlay integration are currently in private testing.
                </Text>
              </View>

              {/* 7. Action Button */}
              <TouchableOpacity
                style={styles.notifyBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setIsLockedModalOpen(false);
                  showInAppToast?.("🔔 You're on the VIP early access list for PULSE FIND!");
                }}
              >
                <LinearGradient
                  colors={['#C084FC', '#A855F7', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.notifyBtnGradient}
                >
                  <Ionicons name="notifications" size={16} color="#FFFFFF" />
                  <Text style={styles.notifyBtnText}>Notify Me When Ready</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Dismiss text */}
              <TouchableOpacity
                onPress={() => setIsLockedModalOpen(false)}
                style={styles.dismissLink}
              >
                <Text style={styles.dismissLinkText}>Got It, Thanks!</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  containerSmall: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  animatedTextWrapper: {
    alignSelf: 'flex-start',
    zIndex: 2,
  },
  ambientDotsContainer: {
    position: 'absolute',
    top: -4,
    left: 0,
    width: 175,
    height: 48,
    zIndex: 1,
  },
  bgDot: {
    position: 'absolute',
    borderRadius: 99,
  },
  dot1: {
    top: 3,
    left: 10,
    width: 6,
    height: 6,
    backgroundColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  dot2: {
    top: 14,
    left: 48,
    width: 4.5,
    height: 4.5,
    backgroundColor: '#A855F7',
    shadowColor: '#A855F7',
    shadowOpacity: 0.85,
    shadowRadius: 5,
  },
  dot3: {
    top: 2,
    left: 88,
    width: 5,
    height: 5,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.85,
    shadowRadius: 6,
  },
  dot4: {
    top: 24,
    left: 124,
    width: 4,
    height: 4,
    backgroundColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOpacity: 0.75,
    shadowRadius: 4,
  },
  dot5: {
    top: 30,
    left: 26,
    width: 5,
    height: 5,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  dot6: {
    top: 28,
    left: 74,
    width: 3.5,
    height: 3.5,
    backgroundColor: '#FDE047',
    shadowColor: '#FDE047',
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  dot7: {
    top: 4,
    left: 148,
    width: 5,
    height: 5,
    backgroundColor: '#C084FC',
    shadowColor: '#C084FC',
    shadowOpacity: 0.75,
    shadowRadius: 5,
  },
  dot8: {
    top: 30,
    left: 160,
    width: 4,
    height: 4,
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  goldenAccentDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 6,
    elevation: 4,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  brandNameSmall: {
    fontSize: 18,
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulseFindHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  pulseFindHeaderGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#070810',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.6,
        shadowRadius: 2,
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 4, 8, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#C084FC',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 24,
    alignItems: 'center',
  },
  devBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    marginBottom: 18,
  },
  devBadgeText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroOrbContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  heroOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOrbInner: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: '#090A14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#090A14',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalSubtitle: {
    color: '#C084FC',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  modalDescription: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresList: {
    width: '100%',
    gap: 10,
    marginBottom: 18,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
  },
  statusBox: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 20,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBoxTitle: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
  },
  statusPercent: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
  },
  statusBarBg: {
    width: '100%',
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  statusBarFill: {
    width: '85%',
    height: '100%',
    borderRadius: 2.5,
  },
  statusNote: {
    color: '#94A3B8',
    fontSize: 10.5,
    lineHeight: 14,
  },
  notifyBtn: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  notifyBtnGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  notifyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dismissLink: {
    paddingVertical: 6,
  },
  dismissLinkText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0E1328',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#090A0F',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarButton: {
    position: 'relative',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#090A0F',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#0E1328',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#C084FC',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
