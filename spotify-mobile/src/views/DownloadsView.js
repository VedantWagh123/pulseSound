import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { saveDownloadSettings } from '../services/DownloadManager';
import { isMockOrLegacySong } from '../config/api';

export const DownloadsView = () => {
  const {
    songs,
    cachedSongIds,
    downloadSong,
    downloadedSongs,
    downloadProgressMap,
    activeDownloadCount,
    storageStats,
    cacheStats,
    downloadQuality,
    setDownloadQuality,
    offlineMode,
    setOfflineMode,
    playTrack,
    currentTrack,
    isPlaying,
    removeDownload,
    clearStreamingCacheOnly,
    clearAllOfflineTracks,
    refreshStorageInfo,
    setActiveTab,
  } = usePlayer();

  const [searchQuery, setSearchQuery] = useState('');
  const [offlineFilter, setOfflineFilter] = useState('downloaded'); // 'downloaded' | 'all'
  const [toastMsg, setToastMsg] = useState(null);
  const toastAnim = React.useRef(new Animated.Value(0)).current;

  // Poll and query live physical device disk space on screen mount
  useEffect(() => {
    if (typeof refreshStorageInfo === 'function') {
      refreshStorageInfo();
    }
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  };

  const offlineList = Object.values(downloadedSongs || {})
    .filter((item) => item && !isMockOrLegacySong(item))
    .map((item) => ({
      ...item,
      isPermanent: true,
    }));

  // Auto-cached tracks from streaming cache
  const cachedOnlyList = (songs || [])
    .filter((s) => {
      const id = String(s._id || s.id);
      return (cachedSongIds || []).includes(id) && !(downloadedSongs || {})[id] && !isMockOrLegacySong(s);
    })
    .map((s) => ({
      ...s,
      isAutoCached: true,
      fileSizeMB: s.fileSizeMB || '1.9',
      quality: s.quality || '96k',
    }));

  const allOfflineTracks = [...offlineList, ...cachedOnlyList];

  // Strictly display only Downloaded or All based on the two allowed options
  const currentDisplayList =
    offlineFilter === 'downloaded'
      ? offlineList
      : allOfflineTracks;

  const filteredList = currentDisplayList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.artist?.toLowerCase().includes(q) ||
      item.album?.toLowerCase().includes(q)
    );
  });

  const handlePinTrack = async (song) => {
    showToast(`Saving "${song.name}" permanently... 📥`);
    const res = await downloadSong(song);
    if (res?.success) {
      showToast(`Pinned "${song.name}" permanently! 🎧`);
    }
  };

  const handleQualitySelect = async (quality) => {
    setDownloadQuality(quality);
    await saveDownloadSettings({ quality });
    showToast(`Download bitrate set to ${quality === '128k' ? '128 kbps (HD)' : '96 kbps (Fast)'} 🎧`);
  };


  const handleClearCache = () => {
    Alert.alert(
      'Clear Streaming Cache',
      'This will delete temporary streaming buffers without removing your permanent offline downloads. Free up cache space?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            await clearStreamingCacheOnly();
            showToast('Temporary cache cleared successfully! 🧹');
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    if (offlineList.length === 0) return;
    Alert.alert(
      'Delete All Offline Songs',
      `Are you sure you want to delete all ${offlineList.length} downloaded tracks (${storageStats.usedMB} MB)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearAllOfflineTracks();
            showToast('All downloaded tracks removed 🗑️');
          },
        },
      ]
    );
  };

  const handleRemoveTrack = (song) => {
    Alert.alert(
      'Remove Download',
      `Remove "${song.name}" (${song.fileSizeMB || '2.0'} MB) from device storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeDownload(song._id || song.id);
            showToast(`Removed "${song.name}"`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>OFFLINE STUDIO</Text>
            <Text style={styles.headerTitle}>Downloads</Text>
          </View>

          <View style={styles.offlineToggleWrap}>
            <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
              <Text style={styles.offlineToggleLabel}>Offline Mode</Text>
              <Text style={styles.offlineToggleSub}>
                {offlineMode ? 'Active (No Data)' : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={offlineMode}
              onValueChange={(val) => {
                setOfflineMode(val);
                showToast(val ? 'Offline Mode ON: Only downloaded songs will play 📴' : 'Online streaming restored 🌐');
              }}
              trackColor={{ false: '#1E2338', true: '#10B981' }}
              thumbColor={offlineMode ? '#FFFFFF' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Low Storage Warning Banner */}
        {storageStats.isLowStorage && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.warningTitle}>Low Device Storage Warning</Text>
              <Text style={styles.warningDesc}>
                Device storage is critically low ({storageStats.freeMB} MB free). Delete downloads or clear cache to ensure smooth playback.
              </Text>
            </View>
          </View>
        )}

        {/* Storage Analytics Card */}
        <LinearGradient
          colors={['#171B33', '#101326']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.storageCard}
        >
          <View style={styles.storageHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.storageIconWrap}>
                <Ionicons name="hardware-chip-outline" size={18} color="#C084FC" />
              </View>
              <Text style={styles.storageTitle}>Device & Pulse Storage</Text>
            </View>
            <TouchableOpacity onPress={refreshStorageInfo} style={styles.refreshBtn}>
              <Ionicons name="refresh-outline" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Storage Bar Indicator */}
          <View style={styles.storageBarTrack}>
            <View
              style={[
                styles.storageBarFillDownloads,
                {
                  width: `${Math.max(
                    4,
                    Math.min(
                      96,
                      ((parseFloat(storageStats.usedMB || '0') + parseFloat(cacheStats.usedMB || '0')) / 150) * 100
                    )
                  )}%`,
                },
              ]}
            />
          </View>

          {/* Storage Statistics Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Pulse Downloads</Text>
              <Text style={styles.statValue}>{storageStats.usedMB || '0.0'} MB</Text>
              <Text style={styles.statSub}>{storageStats.count || 0} {storageStats.count === 1 ? 'track' : 'tracks'}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Device Free Space</Text>
              <Text style={styles.statValue}>
                {storageStats.freeGB && parseFloat(storageStats.freeGB) >= 1
                  ? `${storageStats.freeGB} GB`
                  : storageStats.freeMB && parseFloat(storageStats.freeMB) > 0
                  ? `${storageStats.freeMB} MB`
                  : '32.0 GB'}
              </Text>
              <Text style={styles.statSub}>Available</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Streaming Cache</Text>
              <Text style={styles.statValue}>{cacheStats.usedMB || '0.0'} MB</Text>
              <Text style={styles.statSub}>{cacheStats.count || 0} cached</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Settings & Quality Management Bar */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionHeading}>DOWNLOAD SETTINGS</Text>

          {/* Audio Quality Rendition Selector */}
          <View style={styles.qualityContainer}>
            <View style={styles.qualityInfo}>
              <Ionicons name="musical-notes-outline" size={20} color="#A855F7" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.settingTitle}>Audio Download Quality</Text>
                <Text style={styles.settingDesc}>Cloudinary CDN optimized MP3 bitrate</Text>
              </View>
            </View>

            <View style={styles.qualityPillsWrap}>
              <TouchableOpacity
                onPress={() => handleQualitySelect('96k')}
                style={[styles.qualityPill, downloadQuality === '96k' && styles.qualityPillActive]}
              >
                <Text style={[styles.qualityPillText, downloadQuality === '96k' && styles.qualityPillTextActive]}>
                  96 kbps (Fast • ~2MB)
                </Text>
                {downloadQuality === '96k' && (
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleQualitySelect('128k')}
                style={[styles.qualityPill, downloadQuality === '128k' && styles.qualityPillActive]}
              >
                <Text style={[styles.qualityPillText, downloadQuality === '128k' && styles.qualityPillTextActive]}>
                  128 kbps (HD • ~3.2MB)
                </Text>
                {downloadQuality === '128k' && (
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Action Buttons: Clear Cache & Delete All */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              onPress={handleClearCache}
              style={styles.actionBtnSecondary}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-bin-outline" size={16} color="#C084FC" />
              <Text style={styles.actionBtnSecondaryText}>Clear Cache ({cacheStats.usedMB} MB)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteAll}
              style={[styles.actionBtnSecondary, { borderColor: '#F43F5E40' }]}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#F43F5E" />
              <Text style={[styles.actionBtnSecondaryText, { color: '#F43F5E' }]}>Delete All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Downloaded & Smart-Cached Offline Songs Section */}
        <View style={styles.songsSection}>
          <View style={styles.songsSectionHeader}>
            <Text style={styles.sectionHeading}>
              OFFLINE SONGS ({filteredList.length})
            </Text>
            <View style={styles.offlineStatusBadge}>
              <Ionicons name="cloud-offline" size={14} color="#10B981" />
              <Text style={styles.offlineStatusText}>Ready Offline</Text>
            </View>
          </View>

          {/* Exactly two offline options: Downloaded & All Offline */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={() => setOfflineFilter('downloaded')}
              style={[styles.filterPill, offlineFilter === 'downloaded' && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, offlineFilter === 'downloaded' && styles.filterPillTextActive]}>
                Downloaded ({offlineList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setOfflineFilter('all')}
              style={[styles.filterPill, offlineFilter === 'all' && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, offlineFilter === 'all' && styles.filterPillTextActive]}>
                All Offline ({allOfflineTracks.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search within downloaded tracks */}
          {allOfflineTracks.length > 2 && (
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#64748B" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search offline songs..."
                placeholderTextColor="#64748B"
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Active Downloading indicator */}
          {activeDownloadCount > 0 && (
            <View style={styles.activeDownloadingCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.activeDownloadingText}>
                  Downloading {activeDownloadCount} {activeDownloadCount === 1 ? 'song' : 'songs'} in background...
                </Text>
              </View>
            </View>
          )}

          {/* Empty State */}
          {allOfflineTracks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#1E1638', '#0F1024']}
                style={styles.emptyIconCircle}
              >
                <Ionicons name="arrow-down-circle-outline" size={48} color="#C084FC" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Offline Songs Yet</Text>
              <Text style={styles.emptySubtitle}>
                Stream any song or tap Download to listen anytime, anywhere—even in Airplane Mode without internet!
              </Text>
              <TouchableOpacity
                onPress={() => setActiveTab('home')}
                style={styles.exploreBtn}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.exploreBtnGradient}
                >
                  <Ionicons name="flame" size={18} color="#FFFFFF" />
                  <Text style={styles.exploreBtnText}>Browse Catalogue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptySubtitle}>No offline songs match "{searchQuery}"</Text>
            </View>
          ) : (
            filteredList.map((song, index) => {
              const songId = song._id || song.id;
              const isCurrent = currentTrack && (currentTrack._id || currentTrack.id) === songId;
              const imageSource = typeof song.image === 'string'
                ? { uri: song.image }
                : song.image?.uri
                ? { uri: song.image.uri }
                : song.image;
              const isAutoCached = Boolean(song.isAutoCached);

              return (
                <TouchableOpacity
                  key={songId || index}
                  activeOpacity={0.75}
                  onPress={() => playTrack(song, { queue: filteredList, queueSource: 'downloads' })}
                  style={[styles.songItem, isCurrent && styles.songItemActive]}
                >
                  <View style={styles.songLeft}>
                    <View style={styles.imageWrap}>
                      <Image source={imageSource} style={styles.songImage} resizeMode="cover" />
                      {isCurrent && (
                        <View style={styles.playingOverlay}>
                          <Ionicons
                            name={isPlaying ? 'volume-high' : 'pause'}
                            size={16}
                            color="#C084FC"
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.songInfo}>
                      <Text numberOfLines={1} style={[styles.songTitle, isCurrent && styles.songTitleActive]}>
                        {song.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.songArtist}>
                        {song.desc || song.artist || 'Pulse Artist'}
                      </Text>
                      <View style={styles.badgeRow}>
                        {isAutoCached ? (
                          <View style={[styles.fileSizeBadge, { backgroundColor: '#3B0764' }]}>
                            <Text style={[styles.fileSizeText, { color: '#E9D5FF' }]}>
                              ⚡ Auto-Cached
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.fileSizeBadge}>
                            <Text style={styles.fileSizeText}>
                              {song.fileSizeMB ? `${song.fileSizeMB} MB` : '2.1 MB'}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.fileSizeBadge, { backgroundColor: '#1E1B4B' }]}>
                          <Text style={[styles.fileSizeText, { color: '#A855F7' }]}>
                            {song.quality || '96k'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.songRight}>
                    <Text style={styles.songDuration}>{song.duration || '3:00'}</Text>
                    {isAutoCached ? (
                      <TouchableOpacity
                        onPress={() => handlePinTrack(song)}
                        style={styles.pinBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel="Pin permanently to downloads"
                      >
                        <Ionicons name="arrow-down-circle" size={20} color="#A855F7" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleRemoveTrack(song)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel="Remove download"
                      >
                        <Ionicons name="trash-outline" size={18} color="#F43F5E" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <Animated.View style={[styles.toastContainer, { opacity: toastAnim }]}>
          <LinearGradient
            colors={['#1F163D', '#0F1222']}
            style={styles.toastGradient}
          >
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.toastText}>{toastMsg}</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060712',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerSubtitle: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  offlineToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121528',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F2544',
  },
  offlineToggleLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  offlineToggleSub: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  warningTitle: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '700',
  },
  warningDesc: {
    color: '#E2E8F0',
    fontSize: 11,
    marginTop: 2,
  },
  storageCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262D50',
    marginBottom: 20,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  storageIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storageTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  refreshBtn: {
    padding: 6,
  },
  storageBarTrack: {
    height: 7,
    backgroundColor: '#1C2138',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  storageBarFillDownloads: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#262D50',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
  },
  statSub: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  settingsSection: {
    backgroundColor: '#0F1222',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1D233D',
    marginBottom: 22,
  },
  sectionHeading: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2035',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  qualityContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2035',
  },
  qualityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  qualityPillsWrap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  qualityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#161A2E',
    borderWidth: 1,
    borderColor: '#262D4A',
  },
  qualityPillActive: {
    backgroundColor: '#261F4D',
    borderColor: '#8B5CF6',
  },
  qualityPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  qualityPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#161A2E',
    borderWidth: 1,
    borderColor: '#2D3558',
  },
  actionBtnSecondaryText: {
    color: '#C084FC',
    fontSize: 12,
    fontWeight: '700',
  },
  songsSection: {
    marginTop: 4,
  },
  songsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  offlineStatusText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1222',
    borderWidth: 1,
    borderColor: '#1D233D',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 8,
  },
  activeDownloadingCard: {
    backgroundColor: '#121F29',
    borderWidth: 1,
    borderColor: '#10B98140',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  activeDownloadingText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8B5CF640',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  exploreBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  exploreBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1222',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1D233D',
    padding: 10,
    marginBottom: 8,
  },
  songItemActive: {
    backgroundColor: '#191C36',
    borderColor: '#8B5CF6',
  },
  songLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  imageWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#262D4A',
  },
  songImage: {
    width: '100%',
    height: '100%',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 18, 34, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  songTitleActive: {
    color: '#C084FC',
    fontWeight: '800',
  },
  songArtist: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  fileSizeBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fileSizeText: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '700',
  },
  songRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  songDuration: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#12162A',
    borderWidth: 1,
    borderColor: '#1E2338',
  },
  filterPillActive: {
    backgroundColor: '#2A174D',
    borderColor: '#8B5CF6',
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#E9D5FF',
    fontWeight: '700',
  },
  cacheBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    gap: 10,
  },
  cacheBannerText: {
    color: '#D8B4FE',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  pinBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 6,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 85,
    alignSelf: 'center',
    zIndex: 9999,
  },
  toastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B98150',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
