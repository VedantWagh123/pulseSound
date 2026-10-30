import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { AlbumCard } from '../components/AlbumCard';
import { SongCard } from '../components/SongCard';
import { usePlayer } from '../context/PlayerContext';
import { isMockOrLegacySong } from '../config/api';

// =========================================================================
// Smooth Right-to-Left Marquee Playlist Title Component
// Seamless linear horizontal right-to-left scrolling for long playlist titles.
// Automatic intrinsic measurement. Short titles stay clean & centered.
// =========================================================================
const PlaylistTitleMarquee = React.memo(({ text, style, containerWidth = 114 }) => {
  const [textWidth, setTextWidth] = useState(0);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const animLoopRef = useRef(null);

  useEffect(() => {
    setTextWidth(0);
    scrollAnim.setValue(0);
  }, [text, scrollAnim]);

  const safeText = text || 'Playlist';
  const isOverflowing = textWidth > containerWidth - 4;
  const gap = 28;
  const scrollDistance = textWidth + gap;
  // Comfortable reading speed: ~26px/second
  const duration = Math.max(3000, (scrollDistance / 26) * 1000);

  useEffect(() => {
    if (animLoopRef.current) {
      animLoopRef.current.stop();
      animLoopRef.current = null;
    }
    scrollAnim.setValue(0);

    if (!isOverflowing || textWidth === 0) return;

    // Smooth sequence: Initial pause (1.2s) -> scroll right-to-left (-scrollDistance) -> reset -> repeat
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(scrollAnim, {
          toValue: -scrollDistance,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scrollAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    animLoopRef.current = animation;
    animation.start();

    return () => {
      if (animLoopRef.current) {
        animLoopRef.current.stop();
        animLoopRef.current = null;
      }
    };
  }, [safeText, isOverflowing, scrollDistance, duration, scrollAnim, textWidth]);

  return (
    <View style={[styles.titleMarqueeContainer, { width: containerWidth }]}>
      {/* Invisible horizontal canvas to measure TRUE unconstrained pixel width without clipping */}
      <View pointerEvents="none" style={styles.hiddenTitleMeasurer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false}>
          <Text
            style={[style, { flexShrink: 0 }]}
            onLayout={(e) => {
              const measured = Math.ceil(e.nativeEvent.layout.width);
              if (measured > 0 && measured !== textWidth) {
                setTextWidth(measured);
              }
            }}
          >
            {safeText}
          </Text>
        </ScrollView>
      </View>

      {/* Render seamless infinite right-to-left marquee when overflowing, or clean centered static text when fitting */}
      {isOverflowing ? (
        <Animated.View
          style={[
            styles.titleMarqueeRow,
            {
              width: (textWidth + gap) * 2,
              transform: [{ translateX: scrollAnim }],
            },
          ]}
        >
          <View style={{ width: textWidth }}>
            <Text numberOfLines={1} style={[style, { flexShrink: 0, textAlign: 'left' }]}>
              {safeText}
            </Text>
          </View>
          <View style={{ width: gap }} />
          <View style={{ width: textWidth }}>
            <Text numberOfLines={1} style={[style, { flexShrink: 0, textAlign: 'left' }]}>
              {safeText}
            </Text>
          </View>
        </Animated.View>
      ) : (
        <Text numberOfLines={1} style={style}>
          {safeText}
        </Text>
      )}
    </View>
  );
});

export const HomeView = () => {
  const {
    albums,
    songs,
    publicPlaylists,
    setSelectedPlaylist,
    setSelectedAlbum,
    playTrack,
    refreshBackendData,
    isSyncingBackend,
    offlineMode,
    setOfflineMode,
    offlineSongs,
  } = usePlayer();
  const [filter, setFilter] = useState('All');

  // Source list of songs: Strictly suggest ONLY offline songs when Offline Mode is ON, filtering any legacy mock tracks
  const activeSongsSource = (offlineMode ? (offlineSongs || []) : (songs || [])).filter(
    (s) => s && !isMockOrLegacySong(s)
  );

  // Filter songs based on pill
  const filteredSongs = filter === 'Music'
    ? activeSongsSource.slice(0, 5)
    : filter === 'Podcasts'
    ? activeSongsSource.slice(5)
    : activeSongsSource;

  // Reorder Featured Charts: prioritize newly uploaded backend albums at the front
  // When Offline Mode is active, only show charts/albums that have offline songs available
  const featuredCharts = useMemo(() => {
    if (!albums || albums.length === 0) return [];

    let availableAlbums = albums;
    if (offlineMode) {
      const offlineSongAlbumNames = new Set((offlineSongs || []).map((s) => s.album));
      availableAlbums = albums.filter((a) => offlineSongAlbumNames.has(a.name));
    }

    const backendAlbums = availableAlbums.filter((a) => a.isBackend);
    const localAlbums = availableAlbums.filter((a) => !a.isBackend);

    let reorderedLocal = localAlbums;
    if (localAlbums.length >= 4) {
      const frontTwo = localAlbums.slice(0, 2);
      const middle = localAlbums.slice(2, localAlbums.length - 2);
      const backTwo = localAlbums.slice(localAlbums.length - 2);
      reorderedLocal = [...backTwo, ...middle, ...frontTwo];
    }

    return [...backendAlbums, ...reorderedLocal];
  }, [albums, offlineMode, offlineSongs]);

  return (
    <View style={styles.container}>
      {/* Atmospheric Midnight Cyber-Nebula Ambient Lighting */}
      <LinearGradient
        colors={[
          'rgba(139, 92, 246, 0.22)', // Electric Ultraviolet aura
          'rgba(236, 72, 153, 0.12)', // Neon Rose blush
          'rgba(6, 182, 212, 0.04)',  // Gentle Cyan mist
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.7 }}
        style={styles.ambientNebulaGlow}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          !offlineMode ? (
            <RefreshControl
              refreshing={Boolean(isSyncingBackend)}
              onRefresh={refreshBackendData}
              tintColor="#C084FC"
              colors={['#7C3AED', '#C084FC']}
            />
          ) : undefined
        }
      >
        <Header onFilterChange={setFilter} />

        {/* Offline Mode Active Quick Status Banner */}
        {offlineMode && (
          <View style={styles.offlineBanner}>
            <View style={styles.offlineBannerLeft}>
              <View style={styles.offlineIconWrap}>
                <Ionicons name="cloud-offline" size={17} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.offlineBannerTitle}>Offline Mode Active</Text>
                <Text style={styles.offlineBannerSub}>
                  {activeSongsSource.length > 0
                    ? `Showing ${activeSongsSource.length} offline songs • No internet used`
                    : 'No songs available offline yet'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.offlineToggleBtn}
              onPress={() => setOfflineMode(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.offlineToggleBtnText}>Go Online</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Curated Public Playlists Section - Permanently Fixed on Home Screen */}
        <View style={[styles.sectionHeader, { marginTop: 14 }]}>
          <Text style={styles.sectionTitle}>
            {offlineMode ? 'Offline Playlists' : 'Curated Playlists'}
          </Text>
          <Text style={styles.sectionBadge}>Playlists</Text>
        </View>

        {(!publicPlaylists || publicPlaylists.length === 0) ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {[1, 2, 3].map((placeholderKey) => (
              <View key={`pl-shimmer-${placeholderKey}`} style={[styles.playlistCard, { opacity: 0.55 }]}>
                <View style={[styles.playlistCoverContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="musical-notes-outline" size={28} color="#A855F7" />
                </View>
                <View style={{ width: 80, height: 10, backgroundColor: '#1E2342', borderRadius: 5, marginTop: 4 }} />
                <View style={{ width: 48, height: 8, backgroundColor: '#1E2342', borderRadius: 4, marginTop: 4 }} />
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {publicPlaylists.map((pl) => {
              const sCount = Array.isArray(pl.songs) ? pl.songs.filter(Boolean).length : 0;
              return (
                <TouchableOpacity
                  key={pl._id || pl.id}
                  style={styles.playlistCard}
                  activeOpacity={0.82}
                  onPress={() => setSelectedPlaylist(pl)}
                >
                  <View style={styles.playlistCoverContainer}>
                    {pl.image ? (
                      <Image
                        source={
                          typeof pl.image === 'string'
                            ? { uri: pl.image }
                            : (pl.image?.uri ? { uri: pl.image.uri } : pl.image)
                        }
                        style={styles.playlistCover}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={[pl.bgColour || pl.bgColor || '#7C3AED', '#0E111E']}
                        style={[styles.playlistCover, { justifyContent: 'center', alignItems: 'center' }]}
                      >
                        <Ionicons name="musical-notes" size={30} color="#FFFFFF" />
                      </LinearGradient>
                    )}
                  </View>
                  <PlaylistTitleMarquee
                    text={pl.name}
                    style={styles.playlistName}
                    containerWidth={114}
                  />
                  <Text style={styles.playlistTracks}>
                    {sCount} {sCount === 1 ? 'track' : 'tracks'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Featured Albums Section */}
        {featuredCharts.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: publicPlaylists && publicPlaylists.length > 0 ? 18 : 8 }]}>
              <Text style={styles.sectionTitle}>
                {offlineMode ? 'Offline Charts & Mixes' : 'Featured Charts'}
              </Text>
              <Text style={styles.sectionBadge}>Popular</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {featuredCharts.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onPress={(item) => setSelectedAlbum(item)}
                  onPlayPress={(item) => {
                    const albumSongs = activeSongsSource.filter((s) => s.album === item.name);
                    const albumSong = albumSongs[0] || activeSongsSource[0];
                    if (albumSong) {
                      playTrack(albumSong, {
                        queue: albumSongs.length > 0 ? albumSongs : activeSongsSource,
                        queueSource: `album:${item.name}`,
                      });
                    }
                  }}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Today's Biggest Hits or Offline Suggested Songs */}
        <View style={[styles.sectionHeader, { marginTop: featuredCharts.length > 0 || (publicPlaylists && publicPlaylists.length > 0) ? 20 : 8 }]}>
          <Text style={styles.sectionTitle}>
            {offlineMode ? 'Offline Songs' : "Today's Biggest Hits"}
          </Text>
          <Text style={styles.sectionSub}>
            {offlineMode ? `${filteredSongs.length} available` : 'Single Tracks'}
          </Text>
        </View>

        {filteredSongs.length === 0 ? (
          <View style={styles.emptyOfflineWrap}>
            <View style={[styles.emptyIconCircle, { borderColor: offlineMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(168, 85, 247, 0.3)', backgroundColor: offlineMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(168, 85, 247, 0.12)' }]}>
              <Ionicons name={offlineMode ? "cloud-offline-outline" : "musical-notes-outline"} size={32} color={offlineMode ? "#F59E0B" : "#C084FC"} />
            </View>
            <Text style={styles.emptyTitle}>
              {offlineMode ? "No Offline Songs Found" : "No Single Tracks Yet"}
            </Text>
            <Text style={styles.emptyDesc}>
              {offlineMode
                ? "Download songs while online or like tracks to automatically save them for offline listening."
                : "Browse curated public playlists above, or upload new single tracks from the Admin dashboard."}
            </Text>
            {offlineMode && (
              <TouchableOpacity
                style={styles.emptyGoOnlineBtn}
                activeOpacity={0.8}
                onPress={() => setOfflineMode(false)}
              >
                <Ionicons name="globe-outline" size={16} color="#090A0F" style={{ marginRight: 6 }} />
                <Text style={styles.emptyGoOnlineText}>Turn Off Offline Mode</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.songsList}>
            {filteredSongs.map((song, index) => (
              <SongCard
                key={song._id || song.id}
                song={song}
                index={index}
                queue={filteredSongs}
                queueSource="home_hits"
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#060712',
  },
  ambientNebulaGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 480,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
    borderRadius: 14,
    marginHorizontal: 18,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  offlineBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  offlineIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBannerTitle: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  offlineBannerSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  offlineToggleBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  offlineToggleBtnText: {
    color: '#090A0F',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionBadge: {
    color: '#C084FC',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionSub: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  horizontalScroll: {
    paddingLeft: 18,
    paddingRight: 6,
    paddingBottom: 6,
  },
  songsList: {
    paddingHorizontal: 18,
  },
  emptyOfflineWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 36,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyGoOnlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  emptyGoOnlineText: {
    color: '#090A0F',
    fontSize: 13,
    fontWeight: '700',
  },
  playlistCard: {
    width: 114,
    marginRight: 16,
    alignItems: 'center',
  },
  playlistCoverContainer: {
    width: 114,
    height: 114,
    borderRadius: 57,
    overflow: 'hidden',
    backgroundColor: '#121626',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  playlistCover: {
    width: '100%',
    height: '100%',
    borderRadius: 57,
  },
  playlistName: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  titleMarqueeContainer: {
    overflow: 'hidden',
    width: 114,
    justifyContent: 'center',
    alignItems: 'center',
    height: 18,
    marginBottom: 2,
  },
  hiddenTitleMeasurer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  titleMarqueeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistTracks: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
