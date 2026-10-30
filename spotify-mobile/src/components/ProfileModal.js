import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

export const ProfileModal = () => {
  const { currentUser, logout } = useAuth();
  const {
    isProfileOpen,
    setIsProfileOpen,
    setIsEqualizerOpen,
    playlists = [],
    likedSongIds = [],
    followingCount = 0,
    audioQuality = 'Hi-Fi (320k)',
    setAudioQuality = () => {},
    normalizeVolume = true,
    setNormalizeVolume = () => {},
    crossfadeEnabled = true,
    setCrossfadeEnabled = () => {},
    crossfadeDuration = 3,
    setCrossfadeDuration = () => {},
    offlineMode = false,
    setOfflineMode = () => {},
    storageStats = { count: 0, usedMB: '0.0' },
    cacheStats = { count: 0, usedMB: '0.0' },
    clearStreamingCacheOnly = async () => {},
    setActiveTab = () => {},
  } = usePlayer() || {};
  const { width } = useWindowDimensions();

  // Interactive toast feedback
  const [toastMessage, setToastMessage] = useState(null);
  const [toastAnim] = useState(new Animated.Value(0));

  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  const handleAudioQualityChange = (quality) => {
    setAudioQuality(quality);
    showToast(`Audio streaming quality set to ${quality} 🎧`);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Storage Cache',
      'This will clear temporary audio buffers and CDN cache without deleting your permanent offline downloads. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            await clearStreamingCacheOnly();
            showToast('Temporary cache successfully cleared! 🧹');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out of Pulse Sound',
      'Aap logout ho jayenge. Better experience aur music access ke liye login karna zaroori hoga.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setIsProfileOpen(false);
            await logout();
          },
        },
      ]
    );
  };

  if (!isProfileOpen) return null;

  return (
    <Modal
      visible={isProfileOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsProfileOpen(false)}
    >
      <View style={styles.overlay}>
        {/* Backdrop dismissal */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setIsProfileOpen(false)}
        />

        {/* Modal Container */}
        <View style={styles.sheetContainer}>
          {/* Drag Pill Handle */}
          <View style={styles.handleBar} />

          {/* Top Bar with Title and Close Button */}
          <View style={styles.topBar}>
            <Text style={styles.sheetTitle}>Account & Settings</Text>
            <TouchableOpacity
              onPress={() => setIsProfileOpen(false)}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* User Profile Card with Real Auth Data */}
            <View style={styles.profileCard}>
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9', '#4C1D95']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarLarge}
              >
                <Text style={styles.avatarTextLarge}>
                  {(currentUser?.name || 'P')[0].toUpperCase()}
                </Text>
              </LinearGradient>

              <View style={styles.profileDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {currentUser?.name || 'Pulse Listener'}
                  </Text>
                  <View style={styles.guestBadge}>
                    <Text style={styles.guestBadgeText}>STUDIO</Text>
                  </View>
                </View>
                <Text style={styles.profileHandle} numberOfLines={1}>
                  {currentUser?.email || 'studio@pulsemusic.io'}
                </Text>
                {/* 100% Real-time Statistics from PlayerContext */}
                <Text style={styles.profileStats}>
                  {(playlists || []).length} {(playlists || []).length === 1 ? 'Playlist' : 'Playlists'} • {(likedSongIds || []).length} Liked • {followingCount || 0} Following
                </Text>
              </View>
            </View>

            {/* Favorite Music Taste Chips from Onboarding Survey */}
            {currentUser?.preferences?.favoriteArtists?.length > 0 && (
              <View style={[styles.section, { paddingVertical: 14 }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="sparkles" size={17} color="#34D399" />
                  <Text style={styles.sectionTitle}>Your Curated Artists</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {currentUser.preferences.favoriteArtists.map((artist, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderWidth: 1,
                        borderColor: '#10B981',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 14,
                        gap: 4,
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                        {artist}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Section 1: Streaming & Audio Quality (Fully Functional) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="headset-outline" size={18} color="#A855F7" />
                <Text style={styles.sectionTitle}>Audio Quality</Text>
              </View>

              <Text style={styles.qualitySub}>Select streaming playback bitrate:</Text>
              <View style={styles.qualityRow}>
                {['Standard (128k)', 'High (256k)', 'Hi-Fi (320k)', 'Master (FLAC)'].map((quality) => {
                  const isSelected = audioQuality === quality;
                  return (
                    <TouchableOpacity
                      key={quality}
                      activeOpacity={0.8}
                      onPress={() => handleAudioQualityChange(quality)}
                      style={[styles.qualityPill, isSelected && styles.qualityPillActive]}
                    >
                      <Text
                        style={[
                          styles.qualityText,
                          isSelected && styles.qualityTextActive,
                        ]}
                      >
                        {quality}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 2: Playback Preferences (Fully Functional) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="options-outline" size={18} color="#A855F7" />
                <Text style={styles.sectionTitle}>Playback Preferences</Text>
              </View>

              {/* Volume Normalization */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>Normalize Volume</Text>
                  <Text style={styles.settingSub}>Equalize loud and quiet tracks</Text>
                </View>
                <Switch
                  value={normalizeVolume}
                  onValueChange={(val) => {
                    setNormalizeVolume(val);
                    showToast(val ? 'Volume normalization enabled 🔊' : 'Volume normalization disabled');
                  }}
                  trackColor={{ false: '#1E2338', true: '#7C3AED' }}
                  thumbColor={normalizeVolume ? '#FFFFFF' : '#94A3B8'}
                />
              </View>

              {/* Advanced Crossfade Transitions */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>Crossfade Transitions</Text>
                  <Text style={styles.settingSub}>
                    {crossfadeEnabled ? `${crossfadeDuration}s seamless blend between songs` : 'Disabled'}
                  </Text>
                </View>
                <Switch
                  value={crossfadeEnabled}
                  onValueChange={(val) => {
                    setCrossfadeEnabled(val);
                    showToast(val ? `Crossfade (${crossfadeDuration}s) enabled 🎚️` : 'Crossfade disabled');
                  }}
                  trackColor={{ false: '#1E2338', true: '#7C3AED' }}
                  thumbColor={crossfadeEnabled ? '#FFFFFF' : '#94A3B8'}
                />
              </View>

              {/* Advanced Crossfade Duration Selector (When Enabled) */}
              {crossfadeEnabled && (
                <View style={styles.crossfadeDurationRow}>
                  <Text style={styles.crossfadeDurationLabel}>Blend Duration:</Text>
                  <View style={styles.crossfadePillsWrap}>
                    {[2, 3, 5, 8].map((sec) => {
                      const isCur = crossfadeDuration === sec;
                      return (
                        <TouchableOpacity
                          key={sec}
                          activeOpacity={0.8}
                          onPress={() => {
                            setCrossfadeDuration(sec);
                            showToast(`Crossfade set to ${sec} seconds ⏱️`);
                          }}
                          style={[styles.crossfadePill, isCur && styles.crossfadePillActive]}
                        >
                          <Text style={[styles.crossfadePillText, isCur && styles.crossfadePillTextActive]}>
                            {sec}s
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}


              {/* Offline Mode */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>Offline Mode</Text>
                  <Text style={styles.settingSub}>Only play downloaded library content</Text>
                </View>
                <Switch
                  value={offlineMode}
                  onValueChange={(val) => {
                    setOfflineMode(val);
                    showToast(val ? 'Offline mode turned ON 📴' : 'Online mode restored 🌐');
                  }}
                  trackColor={{ false: '#1E2338', true: '#7C3AED' }}
                  thumbColor={offlineMode ? '#FFFFFF' : '#94A3B8'}
                />
              </View>
            </View>

            {/* Section 3: Storage & Cache */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="folder-outline" size={18} color="#A855F7" />
                <Text style={styles.sectionTitle}>Storage & Offline Data</Text>
              </View>

              {/* Offline Downloads Card */}
              <View style={[styles.storageCard, { marginBottom: 10 }]}>
                <View style={styles.storageInfo}>
                  <Text style={styles.storageLabel}>Offline Downloads</Text>
                  <Text style={styles.storageSize}>
                    {storageStats.count} {storageStats.count === 1 ? 'track' : 'tracks'} ({storageStats.usedMB} MB)
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsProfileOpen(false);
                    if (setActiveTab) setActiveTab('downloads');
                  }}
                  style={[styles.clearBtn, { borderColor: '#10B98150' }]}
                >
                  <Ionicons name="arrow-forward" size={16} color="#10B981" />
                  <Text style={[styles.clearBtnText, { color: '#10B981' }]}>Manage</Text>
                </TouchableOpacity>
              </View>

              {/* Streaming Cache Card */}
              <View style={styles.storageCard}>
                <View style={styles.storageInfo}>
                  <Text style={styles.storageLabel}>Streaming Cache</Text>
                  <Text style={styles.storageSize}>{cacheStats.usedMB} MB</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleClearCache}
                  style={styles.clearBtn}
                >
                  <Ionicons name="trash-outline" size={16} color="#F43F5E" />
                  <Text style={styles.clearBtnText}>Clear Cache</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 4: Quick Action Links */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="settings-outline" size={18} color="#A855F7" />
                <Text style={styles.sectionTitle}>Account & Support</Text>
              </View>

              <TouchableOpacity
                style={styles.linkRow}
                activeOpacity={0.7}
                onPress={() => {
                  setIsProfileOpen(false);
                  if (setIsEqualizerOpen) setIsEqualizerOpen(true);
                }}
              >
                <View style={styles.linkLeft}>
                  <Ionicons name="pulse" size={20} color="#94A3B8" />
                  <Text style={styles.linkLabel}>Audio Customizer & Equalizer</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkRow}
                activeOpacity={0.7}
                onPress={() => showToast('Pulse Music v2.4.0 (Latest Release)')}
              >
                <View style={styles.linkLeft}>
                  <Ionicons name="information-circle-outline" size={20} color="#94A3B8" />
                  <Text style={styles.linkLabel}>About Pulse Music</Text>
                </View>
                <Text style={styles.versionTag}>v2.4.0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkRow}
                activeOpacity={0.7}
                onPress={() => showToast('Opening Help & FAQ center...')}
              >
                <View style={styles.linkLeft}>
                  <Ionicons name="help-circle-outline" size={20} color="#94A3B8" />
                  <Text style={styles.linkLabel}>Help & Feedback</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Log Out Action */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogout}
              style={styles.logoutBtn}
            >
              <Ionicons name="log-out-outline" size={20} color="#F43F5E" />
              <Text style={styles.logoutText}>Log Out of Pulse</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Floating Animated Feedback Toast */}
          {toastMessage && (
            <Animated.View
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
              <Text style={styles.toastText}>{toastMessage}</Text>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#0E111E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1F243B',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333D5B',
    alignSelf: 'center',
    marginBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2035',
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1C2238',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#14182B',
    borderWidth: 1,
    borderColor: '#242C48',
    marginBottom: 14,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarTextLarge: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  guestBadgeText: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  profileHandle: {
    color: '#C084FC',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileStats: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  crossfadeDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2038',
  },
  crossfadeDurationLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  crossfadePillsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  crossfadePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#191F38',
    borderWidth: 1,
    borderColor: '#283152',
  },
  crossfadePillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
  },
  crossfadePillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  crossfadePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  section: {
    backgroundColor: '#12162A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E2540',
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  qualitySub: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 10,
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#191F38',
    borderWidth: 1,
    borderColor: '#283152',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityPillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  qualityText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  qualityTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2038',
  },
  settingTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingSub: {
    color: '#64748B',
    fontSize: 11,
  },
  storageCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  storageInfo: {
    flex: 1,
  },
  storageLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  storageSize: {
    color: '#A855F7',
    fontSize: 15,
    fontWeight: '800',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  clearBtnText: {
    color: '#F43F5E',
    fontSize: 12,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2038',
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkLabel: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
  },
  versionTag: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    marginTop: 6,
  },
  logoutText: {
    color: '#F43F5E',
    fontSize: 14,
    fontWeight: '800',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#1E243D',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
