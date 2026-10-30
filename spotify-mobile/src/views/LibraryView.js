import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  Animated,
  useWindowDimensions,
  Easing,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

export const LibraryView = () => {
  const {
    albums,
    setSelectedAlbum,
    songs,
    playTrack,
    setIsProfileOpen,
    playlists,
    createPlaylist,
    deletePlaylist,
    likedSongIds,
    setSelectedPlaylist,
    publicPlaylists,
    refreshBackendData,
    isSyncingBackend,
    setActiveTab,
    storageStats,
    downloadedSongs,
    openYouTubeImporter,
  } = usePlayer();

  const { width, height } = useWindowDimensions();

  const [activeFilter, setActiveFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [searchLibraryQuery, setSearchLibraryQuery] = useState('');

  // Long-press Drag to Dustbin State
  const [draggingPlaylist, setDraggingPlaylist] = useState(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const isOverTrashRef = useRef(false);
  const isDragActiveRef = useRef(false);
  const dragTimerRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Animated values for moving and sucking the card into the dustbin
  const dragPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragOpacity = useRef(new Animated.Value(1)).current;
  const dragRotate = useRef(new Animated.Value(0)).current;

  // Dustbin animations
  const trashFadeAnim = useRef(new Animated.Value(0)).current;
  const dustbinScale = useRef(new Animated.Value(1)).current;

  // Floating Toast Notification
  const [toastMessage, setToastMessage] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  const filterTabs = ['All', 'Playlists', 'Public Playlists', 'Liked', 'Albums', 'Downloads'];

  const handleCreateConfirm = () => {
    if (!newTitle.trim()) {
      Alert.alert('Playlist Name', 'Please type a name for your playlist.');
      return;
    }
    const created = createPlaylist(newTitle.trim());
    setNewTitle('');
    setIsCreateModalOpen(false);
    setSelectedPlaylist(created);
    showToast(`Created "${created.name}" 🎶`);
  };

  // Quick 1-tap delete confirmation
  const handleQuickDelete = (pl) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to remove "${pl.name}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(pl.id);
            showToast(`"${pl.name}" deleted from library 🗑️`);
          },
        },
      ]
    );
  };

  // TOUCH DRAG SYSTEM: Continuous touch tracking from hold to release
  const handleCardTouchStart = (pl, e) => {
    const pageX = e.nativeEvent.pageX;
    const pageY = e.nativeEvent.pageY;
    touchStartPos.current = { x: pageX, y: pageY };
    isDragActiveRef.current = false;

    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
    }

    dragTimerRef.current = setTimeout(() => {
      // 220ms hold: Enter drag mode!
      isDragActiveRef.current = true;
      setDraggingPlaylist(pl);
      dragPan.setValue({ x: 0, y: 0 });
      dragScale.setValue(0.72);
      dragOpacity.setValue(1);
      dragRotate.setValue(0);
      setIsOverTrash(false);
      isOverTrashRef.current = false;

      // Slide in dustbin
      Animated.timing(trashFadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }, 220);
  };

  const handleCardTouchMove = (pl, e) => {
    const pageX = e.nativeEvent.pageX;
    const pageY = e.nativeEvent.pageY;
    const dx = pageX - touchStartPos.current.x;
    const dy = pageY - touchStartPos.current.y;

    if (!isDragActiveRef.current) {
      // If user moved > 8px before timer, it's a scroll! Cancel hold
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        if (dragTimerRef.current) {
          clearTimeout(dragTimerRef.current);
          dragTimerRef.current = null;
        }
      }
      return;
    }

    // Move card with user's finger!
    dragPan.setValue({ x: dx, y: dy });

    // Check proximity to bottom dustbin
    const isNearBottom = pageY > height - 165 || Math.hypot(pageX - width / 2, pageY - (height - 80)) < 120;

    if (isNearBottom !== isOverTrashRef.current) {
      isOverTrashRef.current = isNearBottom;
      setIsOverTrash(isNearBottom);

      // Dustbin scale & card suction
      Animated.spring(dustbinScale, {
        toValue: isNearBottom ? 1.25 : 1.0,
        friction: 5,
        useNativeDriver: true,
      }).start();

      Animated.timing(dragScale, {
        toValue: isNearBottom ? 0.48 : 0.72,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleCardTouchEnd = (pl, e) => {
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }

    if (!isDragActiveRef.current) {
      // Normal tap: Open playlist modal!
      setSelectedPlaylist(pl);
      return;
    }

    isDragActiveRef.current = false;

    if (isOverTrashRef.current) {
      // DROPPED IN DUSTBIN: VORTEX SUCK-IN ANIMATION!
      const currentDx = dragPan.x._value;
      const currentDy = dragPan.y._value;

      Animated.parallel([
        Animated.timing(dragPan, {
          toValue: { x: currentDx * 0.3, y: currentDy + 80 },
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dragScale, {
          toValue: 0.01,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(dragOpacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(dragRotate, {
          toValue: 1, // 360deg spin
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => {
        deletePlaylist(pl.id);
        showToast(`"${pl.name}" sucked into dustbin 🗑️`);

        // Snap dustbin shut and reset
        Animated.parallel([
          Animated.timing(trashFadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.spring(dustbinScale, { toValue: 1.0, useNativeDriver: true }),
        ]).start(() => {
          setDraggingPlaylist(null);
          setIsOverTrash(false);
          isOverTrashRef.current = false;
          dragPan.setValue({ x: 0, y: 0 });
          dragScale.setValue(1);
          dragOpacity.setValue(1);
          dragRotate.setValue(0);
        });
      });
    } else {
      // Released elsewhere: Spring card back into place!
      Animated.parallel([
        Animated.spring(dragPan, {
          toValue: { x: 0, y: 0 },
          friction: 6,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.spring(dragScale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(trashFadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(dustbinScale, {
          toValue: 1.0,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setDraggingPlaylist(null);
        setIsOverTrash(false);
        isOverTrashRef.current = false;
      });
    }
  };

  // Get liked songs objects
  const likedSongs = songs.filter((s) => (likedSongIds || []).includes(s.id));

  // Filter playlists based on search query
  const filteredPlaylists = (playlists || []).filter((pl) =>
    pl.name.toLowerCase().includes(searchLibraryQuery.toLowerCase())
  );

  // Filter public playlists based on search query
  const filteredPublicPlaylists = (publicPlaylists || []).filter((pl) => {
    if (!searchLibraryQuery.trim()) return true;
    const q = searchLibraryQuery.toLowerCase();
    return (
      (pl.name && pl.name.toLowerCase().includes(q)) ||
      (pl.desc && pl.desc.toLowerCase().includes(q)) ||
      (pl.theory && pl.theory.toLowerCase().includes(q))
    );
  });

  // Filter albums based on search query
  const filteredAlbums = (albums || []).filter(
    (a) =>
      a.name.toLowerCase().includes(searchLibraryQuery.toLowerCase()) ||
      a.desc.toLowerCase().includes(searchLibraryQuery.toLowerCase())
  );

  const spinInterpolation = dragRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const tiltInterpolation = dragPan.x.interpolate({
    inputRange: [-120, 0, 120],
    outputRange: ['-7deg', '0deg', '7deg'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!draggingPlaylist}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(isSyncingBackend)}
            onRefresh={() => refreshBackendData(false)}
            tintColor="#A855F7"
            colors={['#A855F7', '#7C3AED']}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Your Library</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => openYouTubeImporter && openYouTubeImporter()}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: 'rgba(255, 0, 0, 0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 0, 0, 0.28)',
                  marginRight: 8,
                },
              ]}
              accessibilityLabel="Stream from YouTube"
            >
              <Ionicons name="logo-youtube" size={19} color="#FF0000" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsCreateModalOpen(true)}
              style={styles.iconBtn}
              accessibilityLabel="Create Playlist"
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar in Library */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search in your library..."
            placeholderTextColor="#64748B"
            value={searchLibraryQuery}
            onChangeText={setSearchLibraryQuery}
            style={styles.searchInput}
          />
          {searchLibraryQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchLibraryQuery('')}>
              <Ionicons name="close-circle" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Liked Songs Special Banner */}
        {(activeFilter === 'All' || activeFilter === 'Liked') && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setSelectedPlaylist({
                id: 'liked-songs-special',
                name: 'Liked Songs',
                desc: 'All loved tracks across Pulse Music',
              });
            }}
            style={styles.likedSongsCard}
          >
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.likedGradient}
            >
              <Ionicons name="heart" size={26} color="#FFFFFF" />
            </LinearGradient>

            <View style={styles.playlistMeta}>
              <Text style={styles.playlistTitle}>Liked Songs</Text>
              <Text style={styles.playlistSub}>
                Auto Playlist • {(likedSongIds || []).length}{' '}
                {(likedSongIds || []).length === 1 ? 'song' : 'songs'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (likedSongs.length > 0) {
                  playTrack(likedSongs[0], { queue: likedSongs, queueSource: 'liked_songs' });
                } else {
                  Alert.alert('Liked Songs', 'Heart any song to add it here!');
                }
              }}
              style={styles.likedPlayBtn}
            >
              <Ionicons name="play" size={16} color="#090A0F" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Offline Downloads Special Card */}
        {(activeFilter === 'All' || activeFilter === 'Downloads') && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab && setActiveTab('downloads')}
            style={[styles.likedSongsCard, { borderColor: 'rgba(168, 85, 247, 0.35)' }]}
          >
            <LinearGradient
              colors={['#4C1D95', '#6D28D9', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.likedGradient}
            >
              <Ionicons name="cloud-done" size={26} color="#FFFFFF" />
            </LinearGradient>

            <View style={styles.playlistMeta}>
              <Text style={styles.playlistTitle}>Offline Downloads</Text>
              <Text style={styles.playlistSub}>
                {storageStats?.count || Object.keys(downloadedSongs || {}).length} offline tracks • {storageStats?.usedMB || '0.0'} MB stored
              </Text>
            </View>

            <View style={[styles.likedPlayBtn, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Action Row: Create Custom Playlist */}
        {(activeFilter === 'All' || activeFilter === 'Playlists') && (
          <View style={styles.topActionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsCreateModalOpen(true)}
              style={styles.createCard}
            >
              <View style={styles.createIconWrapper}>
                <Ionicons name="add" size={22} color="#C084FC" />
              </View>
              <View style={styles.actionMeta}>
                <Text style={styles.createTitle}>New Custom Playlist</Text>
                <Text style={styles.actionSub}>Build personalized playlist</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Dedicated Public Playlists Tab (Visible ONLY when user taps "Public Playlists" tab) */}
        {activeFilter === 'Public Playlists' && (
          <View style={styles.publicTabContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>Public Playlists</Text>
              <View style={styles.headingBadgeRow}>
                <Text style={styles.sectionCount}>{filteredPublicPlaylists.length}</Text>
              </View>
            </View>

            {filteredPublicPlaylists.length === 0 ? (
              <View style={styles.emptyPublicCard}>
                <Ionicons name="musical-notes-outline" size={36} color="#64748B" />
                <Text style={styles.emptyPublicTitle}>No Public Playlists Yet</Text>
                <Text style={styles.emptyPublicSub}>
                  Admin created playlists with songs & theory will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.spotifyPublicList}>
                {filteredPublicPlaylists.map((pl) => {
                  const songCount = Array.isArray(pl.songs)
                    ? pl.songs.filter(Boolean).length
                    : Array.isArray(pl.songIds)
                    ? pl.songIds.length
                    : 0;
                  const plSongs = Array.isArray(pl.songs) ? pl.songs.filter(Boolean) : [];
                  const firstSong = plSongs[0];

                  return (
                    <TouchableOpacity
                      key={pl.id || pl._id}
                      activeOpacity={0.78}
                      onPress={() => setSelectedPlaylist(pl)}
                      style={styles.spotifyPublicRow}
                    >
                      {/* Big Circular Artwork - Spotify Style, Zero Border, Transparent */}
                      <View style={styles.spotifyCircleWrap}>
                        {pl.image ? (
                          <Image
                            source={
                              typeof pl.image === 'string'
                                ? { uri: pl.image }
                                : pl.image?.uri
                                ? { uri: pl.image.uri }
                                : pl.image
                            }
                            style={styles.spotifyCircleImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <LinearGradient
                            colors={[pl.bgColour || pl.bgColor || '#7C3AED', '#0E111E']}
                            style={styles.spotifyCircleGradient}
                          >
                            <Ionicons name="sparkles" size={32} color="#FFFFFF" />
                          </LinearGradient>
                        )}
                      </View>

                      {/* Content Meta */}
                      <View style={styles.spotifyMetaWrap}>
                        <Text style={styles.spotifyPublicTitle} numberOfLines={1}>
                          {pl.name}
                        </Text>
                        <Text style={styles.spotifyPublicBadge} numberOfLines={1}>
                          Public Playlist • {songCount} {songCount === 1 ? 'track' : 'tracks'}
                        </Text>
                        {pl.desc ? (
                          <Text style={styles.spotifyPublicDesc} numberOfLines={2}>
                            {pl.desc}
                          </Text>
                        ) : null}
                        {pl.theory ? (
                          <View style={styles.publicTheoryPill}>
                            <Text style={styles.publicTheoryText} numberOfLines={1}>
                              💡 {pl.theory}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Quick Play Circle Button */}
                      {firstSong && (
                        <TouchableOpacity
                          onPress={() => {
                            playTrack(firstSong, {
                              queue: plSongs,
                              queueSource: `playlist:${pl._id || pl.id}`,
                            });
                          }}
                          style={styles.spotifyQuickPlayBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* User Playlists List with Direct In-Place Hold & Drag */}
        {(activeFilter === 'All' || activeFilter === 'Playlists') && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>Your Playlists</Text>
              <View style={styles.headingBadgeRow}>
                <Text style={styles.dragHintBadge}>Hold & drag to trash 🗑️</Text>
                <Text style={styles.sectionCount}>{filteredPlaylists.length}</Text>
              </View>
            </View>

            {filteredPlaylists.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No playlists match your search.</Text>
              </View>
            ) : (
              filteredPlaylists.map((pl) => {
                const isThisDragging = draggingPlaylist && draggingPlaylist.id === pl.id;

                return (
                  <Animated.View
                    key={pl.id}
                    onTouchStart={(e) => handleCardTouchStart(pl, e)}
                    onTouchMove={(e) => handleCardTouchMove(pl, e)}
                    onTouchEnd={(e) => handleCardTouchEnd(pl, e)}
                    style={[
                      styles.playlistRow,
                      isThisDragging && {
                        zIndex: 9999,
                        elevation: 25,
                        backgroundColor: '#1E233C',
                        borderColor: isOverTrash ? '#EF4444' : '#A855F7',
                        borderWidth: 1.5,
                        shadowColor: isOverTrash ? '#EF4444' : '#8B5CF6',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.8,
                        shadowRadius: 16,
                        opacity: dragOpacity,
                        transform: [
                          { translateX: dragPan.x },
                          { translateY: dragPan.y },
                          { scale: dragScale },
                          { rotate: isOverTrash ? spinInterpolation : tiltInterpolation },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={pl.gradient || ['#1F2438', '#141829']}
                      style={styles.customCover}
                    >
                      <Ionicons name="musical-notes" size={22} color="#FFFFFF" />
                    </LinearGradient>

                    <View style={styles.playlistMeta}>
                      <Text numberOfLines={1} style={styles.playlistTitle}>
                        {pl.name}
                      </Text>
                      <Text style={[styles.playlistSub, isThisDragging && isOverTrash && styles.playlistSubActive]}>
                        {isThisDragging
                          ? isOverTrash
                            ? 'Release to drop in Dustbin 🗑️'
                            : 'Dragging to Dustbin...'
                          : `Playlist • ${pl.songIds.length} ${pl.songIds.length === 1 ? 'track' : 'tracks'}`}
                      </Text>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.rowRightActions}>
                      <TouchableOpacity
                        onPress={() => {
                          const plSongs = (pl.songs && pl.songs.length > 0)
                            ? pl.songs
                            : songs.filter((s) => (pl.songIds || []).includes(s.id || s._id));
                          const firstSong = plSongs[0];
                          if (firstSong) {
                            playTrack(firstSong, { queue: plSongs, queueSource: `playlist:${pl._id || pl.id}` });
                          } else {
                            setSelectedPlaylist(pl);
                          }
                        }}
                        style={styles.quickPlayBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="play" size={15} color="#C084FC" style={{ marginLeft: 2 }} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleQuickDelete(pl)}
                        style={styles.quickDeleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={15} color="#F43F5E" />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </>
        )}

        {/* Saved Albums Section */}
        {(activeFilter === 'All' || activeFilter === 'Albums') && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 14 }]}>
              <Text style={styles.sectionHeading}>Saved Albums</Text>
              <Text style={styles.sectionCount}>{filteredAlbums.length}</Text>
            </View>

            {filteredAlbums.map((album) => (
              <TouchableOpacity
                key={album.id}
                activeOpacity={0.75}
                onPress={() => setSelectedAlbum(album)}
                style={styles.playlistRow}
              >
                <Image source={album.image} style={styles.albumThumb} resizeMode="cover" />
                <View style={styles.playlistMeta}>
                  <Text numberOfLines={1} style={styles.playlistTitle}>
                    {album.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.playlistSub}>
                    Album • {album.desc}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* FIXED STATIONARY DUSTBIN AT BOTTOM CENTER */}
      {draggingPlaylist && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fixedDustbinWrapper,
            {
              opacity: trashFadeAnim,
              transform: [{ scale: dustbinScale }],
            },
          ]}
        >
          {/* Neat & Clean Dustbin Orb */}
          <View style={[styles.fixedDustbinBtn, isOverTrash && styles.fixedDustbinBtnActive]}>
            <LinearGradient
              colors={
                isOverTrash
                  ? ['#9333EA', '#7E22CE', '#581C87']
                  : ['#231F33', '#181524', '#0F0D17']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fixedDustbinGradient}
            >
              <Ionicons
                name={isOverTrash ? 'trash' : 'trash-outline'}
                size={28}
                color={isOverTrash ? '#FFFFFF' : '#C084FC'}
              />
            </LinearGradient>
          </View>
        </Animated.View>
      )}

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

      {/* Create Custom Playlist Modal */}
      <Modal
        visible={isCreateModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalCard}>
            <Text style={styles.createModalTitle}>Give your playlist a name</Text>
            <Text style={styles.createModalSub}>Create and personalize your collection</Text>
            <TextInput
              style={styles.createModalInput}
              placeholder="e.g. Synthwave Night, Focus Beats"
              placeholderTextColor="#64748B"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus={true}
            />
            <View style={styles.createModalActions}>
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateConfirm}
                style={styles.modalConfirmBtn}
              >
                <Text style={styles.modalConfirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060712',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2338',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#141828',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242C46',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111424',
    marginHorizontal: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2540',
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 14,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#121626',
    borderWidth: 1,
    borderColor: '#21273F',
  },
  filterPillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  likedSongsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#121528',
    borderWidth: 1,
    borderColor: '#252C4A',
    marginBottom: 10,
  },
  likedGradient: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  likedPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topActionsRow: {
    flexDirection: 'row',
    marginHorizontal: 18,
    gap: 10,
    marginBottom: 14,
  },
  createCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#101426',
    borderWidth: 1,
    borderColor: '#1F2744',
  },
  createIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#162136',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#243254',
  },
  createTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  publicSectionWrap: {
    marginBottom: 20,
  },
  curatedBadge: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyPublicCard: {
    marginHorizontal: 18,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#0E111F',
    borderWidth: 1,
    borderColor: '#1E2540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPublicTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyPublicSub: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  publicTabContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  spotifyPublicList: {
    gap: 12,
    marginTop: 8,
  },
  spotifyPublicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  spotifyCircleWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    overflow: 'hidden',
    backgroundColor: '#1E1B4B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  spotifyCircleImage: {
    width: '100%',
    height: '100%',
    borderRadius: 41,
  },
  spotifyCircleGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
  },
  spotifyMetaWrap: {
    flex: 1,
    marginLeft: 16,
    marginRight: 10,
    justifyContent: 'center',
  },
  spotifyPublicTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  spotifyPublicBadge: {
    color: '#A855F7',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  spotifyPublicDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  spotifyQuickPlayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  publicPlaylistCard: {
    width: 150,
    backgroundColor: '#101424',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  publicPlaylistCoverWrap: {
    width: 130,
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  publicPlaylistCover: {
    width: '100%',
    height: '100%',
  },
  publicPlaylistGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicSongBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  publicSongCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  publicPlaylistTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  publicPlaylistDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 4,
  },
  publicTheoryPill: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  publicTheoryText: {
    color: '#C084FC',
    fontSize: 9,
    fontStyle: 'italic',
  },
  actionMeta: {
    flex: 1,
  },
  actionSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  sectionHeading: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dragHintBadge: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#171B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionCount: {
    color: '#A855F7',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyWrap: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#101324',
    borderWidth: 1,
    borderColor: '#1E243C',
    marginBottom: 8,
  },
  customCover: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  albumThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  playlistMeta: {
    flex: 1,
  },
  playlistTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  playlistSub: {
    color: '#64748B',
    fontSize: 12,
  },
  playlistSubActive: {
    color: '#EF4444',
    fontWeight: '800',
  },
  rowRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickPlayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#181C30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262D4A',
  },
  quickDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },

  // STATIONARY FIXED DUSTBIN AT BOTTOM
  fixedDustbinWrapper: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  fixedDustbinRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  fixedDustbinRingActive: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(239, 68, 68, 0.28)',
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  fixedDustbinBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedDustbinBtnActive: {
    borderColor: '#C084FC',
    shadowColor: '#A855F7',
    shadowOpacity: 0.9,
    shadowRadius: 22,
    elevation: 25,
  },
  fixedDustbinGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedDustbinTag: {
    marginTop: 8,
    backgroundColor: 'rgba(18, 22, 38, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    minWidth: 84,
    alignItems: 'center',
  },
  fixedDustbinTagActive: {
    backgroundColor: '#EF4444',
    borderColor: '#FFFFFF',
  },
  fixedDustbinTagText: {
    color: '#FDA4AF',
    fontSize: 10,
    fontWeight: '700',
  },
  fixedDustbinTagTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
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
    borderColor: '#F43F5E',
    shadowColor: '#F43F5E',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  createModalCard: {
    width: '100%',
    backgroundColor: '#12162B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#283152',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  createModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  createModalSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 16,
  },
  createModalInput: {
    color: '#FFFFFF',
    fontSize: 15,
    backgroundColor: '#0B0D18',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#283254',
    marginBottom: 16,
  },
  createModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
