import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Image,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/SongCard';

export const SearchView = () => {
  const {
    songs,
    albums,
    setSelectedAlbum,
    refreshBackendData,
    isSyncingBackend,
    setIsPulseFindOpen,
    isPulseFindLocked,
    showInAppToast,
    openYouTubeImporter,
  } = usePlayer();
  const { width } = useWindowDimensions();

  const numColumns = width > 520 ? 3 : 2;
  const genreCardWidth = (width - 36 - (numColumns - 1) * 12) / numColumns;

  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([
    'Cyber Pulse',
    'Midnight Vibes',
    'Sunset Dream',
    'Pop Hits',
  ]);
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);
  const [activeCategoryPill, setActiveCategoryPill] = useState('All');

  // Pulsating animation for audio/mic listening modal
  const waveScale1 = useRef(new Animated.Value(1)).current;
  const waveScale2 = useRef(new Animated.Value(1)).current;
  const waveOpacity1 = useRef(new Animated.Value(0.7)).current;
  const waveOpacity2 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isVoiceSearchOpen) {
      waveScale1.setValue(1);
      waveOpacity1.setValue(0.7);
      waveScale2.setValue(1);
      waveOpacity2.setValue(0.5);

      const anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(waveScale1, {
              toValue: 1.45,
              duration: 1100,
              useNativeDriver: true,
            }),
            Animated.timing(waveOpacity1, {
              toValue: 0.25,
              duration: 1100,
              useNativeDriver: true,
            }),
            Animated.timing(waveScale2, {
              toValue: 1.85,
              duration: 1100,
              useNativeDriver: true,
            }),
            Animated.timing(waveOpacity2, {
              toValue: 0.15,
              duration: 1100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(waveScale1, {
              toValue: 1,
              duration: 1100,
              useNativeDriver: true,
            }),
            Animated.timing(waveOpacity1, {
              toValue: 0.7,
              duration: 1100,
              useNativeDriver: true,
            }),
            Animated.timing(waveScale2, {
              toValue: 1,
              duration: 1100,
              useNativeDriver: true,
            }),
            Animated.timing(waveOpacity2, {
              toValue: 0.5,
              duration: 1100,
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      anim.start();

      return () => {
        anim.stop();
      };
    }
  }, [isVoiceSearchOpen]);

  const genres = [
    { title: 'Pop', colors: ['#EC4899', '#BE185D'] },
    { title: 'Chill & Lofi', colors: ['#8B5CF6', '#6D28D9'] },
    { title: 'Hip-Hop', colors: ['#F59E0B', '#B45309'] },
    { title: 'Dance / EDM', colors: ['#06B6D4', '#0E7490'] },
    { title: 'Indie Wave', colors: ['#3B82F6', '#1D4ED8'] },
    { title: 'Rock Anthems', colors: ['#EF4444', '#B91C1C'] },
  ];

  const quickPills = ['All', 'Pop', 'Chill', 'Electronic', 'Hip-Hop', 'Lo-Fi'];

  // Add term to search history
  const addToHistory = (term) => {
    if (!term || !term.trim()) return;
    const cleanTerm = term.trim();
    setSearchHistory((prev) => [cleanTerm, ...prev.filter((t) => t.toLowerCase() !== cleanTerm.toLowerCase())].slice(0, 8));
  };

  // Remove single item from history
  const removeFromHistory = (itemToRemove) => {
    setSearchHistory((prev) => prev.filter((item) => item !== itemToRemove));
  };

  // Clear all history
  const clearAllHistory = () => {
    setSearchHistory([]);
  };

  const handleSearchSubmit = () => {
    if (query.trim()) {
      addToHistory(query.trim());
    }
  };

  const handleSelectHistoryItem = (term) => {
    setQuery(term);
    addToHistory(term);
  };

  // Filter songs
  const searchResults =
    query.trim() === ''
      ? []
      : songs.filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            (s.album && s.album.toLowerCase().includes(query.toLowerCase())) ||
            (s.desc && s.desc.toLowerCase().includes(query.toLowerCase()))
        );

  // Matching albums
  const matchingAlbums =
    query.trim() === ''
      ? []
      : albums.filter(
          (a) =>
            a.name.toLowerCase().includes(query.toLowerCase()) ||
            a.desc.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={Boolean(isSyncingBackend)}
            onRefresh={() => refreshBackendData(false)}
            tintColor="#10B981"
            colors={['#10B981', '#7C3AED']}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search</Text>

          {/* Search Bar with Live Input & Unique Audio/Mic Icon */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              placeholder="What do you want to listen to?"
              placeholderTextColor="#64748B"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              style={styles.input}
            />

            {/* Clear Button */}
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={19} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {/* Unique Search By Audio / Pulse Find Mic Icon */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => isPulseFindLocked ? showInAppToast?.('🔒 Audio recognition is currently under development.') : setIsPulseFindOpen(true)}
              style={styles.micBtn}
              accessibilityLabel="Identify Music with PULSE FIND"
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                style={styles.micGradient}
              >
                <Ionicons name="mic" size={17} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Smart YouTube Link Detector or Quick Action Banner */}
        {query && (query.includes('youtube.com') || query.includes('youtu.be')) ? (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => openYouTubeImporter(query.trim())}
            style={styles.detectedYouTubeCard}
          >
            <LinearGradient
              colors={['#DC2626', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.detectedYouTubeGradient}
            >
              <View style={styles.detectedIconCircle}>
                <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detectedTitle}>YouTube Link Detected!</Text>
                <Text style={styles.detectedSub} numberOfLines={1}>
                  Tap to stream audio, save to playlist or download
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => openYouTubeImporter()}
            style={styles.ytBannerBtn}
          >
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.12)', 'rgba(139, 92, 246, 0.12)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ytBannerGradient}
            >
              <View style={styles.ytBannerLeft}>
                <View style={styles.ytBannerIconWrap}>
                  <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ytBannerTitle}>Stream from YouTube</Text>
                  <Text style={styles.ytBannerSub}>
                    Paste any YouTube link to stream, save or download offline
                  </Text>
                </View>
              </View>
              <View style={styles.ytBannerBadge}>
                <Text style={styles.ytBannerBadgeText}>FREE</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick Filter Categories under Search Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPillsRow}
        >
          {quickPills.map((pill) => {
            const isActive = activeCategoryPill === pill;
            return (
              <TouchableOpacity
                key={pill}
                onPress={() => {
                  setActiveCategoryPill(pill);
                  if (pill !== 'All') {
                    setQuery(pill);
                    addToHistory(pill);
                  } else {
                    setQuery('');
                  }
                }}
                style={[styles.quickPill, isActive && styles.quickPillActive]}
              >
                <Text style={[styles.quickPillText, isActive && styles.quickPillTextActive]}>
                  {pill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search Results Mode */}
        {query.trim().length > 0 ? (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeaderRow}>
              <Text style={styles.sectionTitle}>
                Songs ({searchResults.length})
              </Text>
              <TouchableOpacity onPress={() => setQuery('')}>
                <Text style={styles.clearResultsText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {searchResults.length > 0 ? (
              searchResults.map((song, index) => (
                <SongCard
                  key={`${song._id || song.id || 'search'}-${index}`}
                  song={song}
                  index={index}
                  queue={searchResults}
                  queueSource="search_results"
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>No songs found for "{query}"</Text>
                <Text style={styles.emptyDesc}>Try searching for another artist, track or genre</Text>
              </View>
            )}

            {/* Matching Albums */}
            {matchingAlbums.length > 0 && (
              <View style={{ marginTop: 18 }}>
                <Text style={styles.sectionTitle}>Matching Albums ({matchingAlbums.length})</Text>
                {matchingAlbums.map((album) => (
                  <TouchableOpacity
                    key={album.id}
                    activeOpacity={0.75}
                    onPress={() => setSelectedAlbum(album)}
                    style={styles.albumRow}
                  >
                    <Image source={album.image} style={styles.albumThumb} resizeMode="cover" />
                    <View style={styles.albumMeta}>
                      <Text style={styles.albumTitle}>{album.name}</Text>
                      <Text numberOfLines={1} style={styles.albumDesc}>
                        Album • {album.desc}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#64748B" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* Default Browse & Search History Mode */
          <View>
            {/* PULSE FIND Music Recognition Banner Card */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => isPulseFindLocked ? showInAppToast?.('🔒 PULSE FIND is currently under active development. Coming soon!') : setIsPulseFindOpen(true)}
              style={styles.pulseFindBanner}
            >
              <LinearGradient
                colors={['#241542', '#3B1D6B', '#1A1230']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pulseFindGradient}
              >
                <View style={styles.pulseFindLeft}>
                  <LinearGradient
                    colors={['#C084FC', '#EC4899', '#3B82F6']}
                    style={styles.pulseFindIconCircle}
                  >
                    <Ionicons name="mic" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={styles.pulseFindTitle}>PULSE FIND</Text>
                      <View style={[styles.pulseFindBadge, isPulseFindLocked && { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                        <Text style={[styles.pulseFindBadgeText, isPulseFindLocked && { color: '#FBBF24' }]}>
                          {isPulseFindLocked ? 'COMING SOON' : 'SHAZAM'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.pulseFindSubtitle}>
                      Identify any song playing on Instagram Reels or around you
                    </Text>
                  </View>
                </View>
                <View style={styles.pulseFindArrow}>
                  <Ionicons name="chevron-forward" size={18} color="#C084FC" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Recent Search History Section */}
            {searchHistory.length > 0 && (
              <View style={styles.historySection}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyTitleRow}>
                    <Ionicons name="time-outline" size={18} color="#A855F7" />
                    <Text style={styles.historyHeading}>Recent Searches</Text>
                  </View>
                  <TouchableOpacity onPress={clearAllHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.clearHistoryText}>Clear All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.historyChipsWrap}>
                  {searchHistory.map((item) => (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.75}
                      onPress={() => handleSelectHistoryItem(item)}
                      style={styles.historyChip}
                    >
                      <Ionicons name="search-outline" size={14} color="#818CF8" />
                      <Text style={styles.historyChipText}>{item}</Text>
                      <TouchableOpacity
                        onPress={() => removeFromHistory(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.chipCloseBtn}
                      >
                        <Ionicons name="close" size={14} color="#64748B" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Browse All Categories Grid */}
            <View style={styles.genreSection}>
              <Text style={styles.sectionTitle}>Browse All Categories</Text>
              <View style={styles.genreGrid}>
                {genres.map((g, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (albums[idx % albums.length]) {
                        setSelectedAlbum(albums[idx % albums.length]);
                      }
                    }}
                    style={[styles.genreCard, { width: genreCardWidth }]}
                  >
                    <LinearGradient
                      colors={g.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.genreGradient}
                    >
                      <Text style={styles.genreTitle}>{g.title}</Text>
                      <Ionicons
                        name="musical-notes"
                        size={28}
                        color="rgba(255,255,255,0.3)"
                        style={styles.genreIcon}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Seamless Floating Audio / Mic Modal (No Box, Background Visible, Tap Anywhere to Dismiss) */}
      <Modal
        visible={isVoiceSearchOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsVoiceSearchOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsVoiceSearchOpen(false)}
          style={styles.floatingVoiceBackdrop}
        >
          {/* Floating Central Glowing Mic & Pulsating Rings (NO box container) */}
          <View style={styles.floatingVoiceArea}>
            <Animated.View
              style={[
                styles.floatingPulseRing,
                {
                  transform: [{ scale: waveScale2 }],
                  opacity: waveOpacity2,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.floatingPulseRing,
                {
                  transform: [{ scale: waveScale1 }],
                  opacity: waveOpacity1,
                },
              ]}
            />
            <LinearGradient
              colors={['#8B5CF6', '#EC4899', '#FB923C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.floatingMicCenter}
            >
              <Ionicons name="mic" size={42} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.floatingVoiceTitle}>Listening...</Text>
          <Text style={styles.floatingVoiceSub}>Speak a song, artist, or album</Text>

          <Text style={styles.floatingTapToDismiss}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#060712',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    marginBottom: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1124',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 2,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  micGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseFindBanner: {
    marginHorizontal: 18,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
  },
  pulseFindGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  pulseFindLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pulseFindIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  pulseFindTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pulseFindBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EC4899',
  },
  pulseFindBadgeText: {
    color: '#EC4899',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pulseFindSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  pulseFindArrow: {
    paddingLeft: 8,
  },
  quickPillsRow: {
    paddingHorizontal: 18,
    gap: 8,
    paddingBottom: 14,
  },
  quickPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#121626',
    borderWidth: 1,
    borderColor: '#21273F',
  },
  quickPillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
  },
  quickPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  quickPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  resultsContainer: {
    paddingHorizontal: 18,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  clearResultsText: {
    color: '#A855F7',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyDesc: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#111425',
    borderWidth: 1,
    borderColor: '#1F253F',
    marginTop: 8,
  },
  albumThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
  },
  albumMeta: {
    flex: 1,
  },
  albumTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  albumDesc: {
    color: '#94A3B8',
    fontSize: 11,
  },
  historySection: {
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyHeading: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  clearHistoryText: {
    color: '#F43F5E',
    fontSize: 12,
    fontWeight: '700',
  },
  historyChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#14182B',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#242C48',
  },
  historyChipText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  chipCloseBtn: {
    paddingLeft: 4,
  },
  genreSection: {
    paddingHorizontal: 18,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  genreCard: {
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
  },
  genreGradient: {
    width: '100%',
    height: '100%',
    padding: 12,
    justifyContent: 'space-between',
    position: 'relative',
  },
  genreTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  genreIcon: {
    position: 'absolute',
    right: 10,
    bottom: 8,
  },
  floatingVoiceBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 12, 0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  floatingVoiceArea: {
    width: 170,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  floatingPulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.28)',
    borderWidth: 1.5,
    borderColor: '#C084FC',
  },
  floatingMicCenter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
  },
  floatingVoiceTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  floatingVoiceSub: {
    color: '#CBD5E1',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
  },
  floatingTapToDismiss: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(25, 30, 50, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  detectedYouTubeCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  detectedYouTubeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  detectedIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectedTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  detectedSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 1,
  },
  ytBannerBtn: {
    marginHorizontal: 18,
    marginBottom: 14,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ytBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  ytBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ytBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 0, 0, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ytBannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  ytBannerSub: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  ytBannerBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  ytBannerBadgeText: {
    color: '#090A0F',
    fontSize: 10,
    fontWeight: '900',
  },
});
