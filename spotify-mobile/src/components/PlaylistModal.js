import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  useWindowDimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from './SongCard';

export const PlaylistModal = () => {
  const {
    selectedPlaylist,
    setSelectedPlaylist,
    songs,
    playTrack,
    currentTrack,
    isPlaying,
    togglePlayPause,
    setIsFullPlayerOpen,
    likedSongIds,
    removeSongFromPlaylist,
    deletePlaylist,
    addSongToPlaylist,
    downloadPlaylistPacks,
  } = usePlayer();

  const { width } = useWindowDimensions();
  const [isPickingSongs, setIsPickingSongs] = useState(false);
  const [searchSongQuery, setSearchSongQuery] = useState('');

  if (!selectedPlaylist) return null;

  const isLikedSpecial = selectedPlaylist.id === 'liked-songs-special';
  const isPublicOrCurated = Boolean(selectedPlaylist.isPublic || selectedPlaylist.isCurated);

  // Get raw songs belonging to this playlist
  let rawSongList = [];
  if (isLikedSpecial) {
    rawSongList = songs.filter((s) => likedSongIds.includes(s.id || s._id));
  } else if (Array.isArray(selectedPlaylist.songs) && selectedPlaylist.songs.filter(Boolean).length > 0) {
    const validSongs = selectedPlaylist.songs.filter(Boolean);
    if (typeof validSongs[0] === 'object' && (validSongs[0].name || validSongs[0].file)) {
      rawSongList = validSongs;
    } else {
      const targetIds = validSongs.map((s) => String(typeof s === 'object' ? (s._id || s.id) : s));
      rawSongList = songs.filter((s) => targetIds.includes(String(s._id || s.id)));
    }
  } else if (Array.isArray(selectedPlaylist.songIds) && selectedPlaylist.songIds.length > 0) {
    const targetIds = selectedPlaylist.songIds.map((id) => String(id));
    rawSongList = songs.filter((s) => targetIds.includes(String(s.id || s._id)));
  }

  // Ensure every song has up-to-date image, video, streamUrl from global synced songs
  const playlistSongList = rawSongList.filter(Boolean).map((ps) => {
    if (!ps) return ps;
    const psId = ps._id || ps.id;
    const match = songs.find(
      (s) => String(s._id || s.id) === String(psId) ||
        (s.name && ps.name && s.name.trim().toLowerCase() === ps.name.trim().toLowerCase())
    );
    return {
      ...(match || {}),
      ...(typeof ps === 'object' ? ps : {}),
      image: ps.image || match?.image,
      video: ps.video || match?.video || '',
      videoPublicId: ps.videoPublicId || match?.videoPublicId || '',
      file: ps.file || match?.file,
    };
  });

  const isCurrentSongInPlaylist = Boolean(
    currentTrack &&
    playlistSongList.some(
      (s) => String(s._id || s.id) === String(currentTrack._id || currentTrack.id) ||
        (s.name && currentTrack.name && s.name.trim().toLowerCase() === currentTrack.name.trim().toLowerCase())
    )
  );
  const isPlaylistPlaying = isCurrentSongInPlaylist && isPlaying;

  const handlePlayPausePlaylist = () => {
    if (playlistSongList.length === 0) return;
    if (isCurrentSongInPlaylist) {
      togglePlayPause();
    } else {
      playTrack(playlistSongList[0], {
        queue: playlistSongList,
        queueSource: `playlist:${selectedPlaylist._id || selectedPlaylist.id}`,
      });
      if (setIsFullPlayerOpen) {
        setIsFullPlayerOpen(true);
      }
    }
  };

  const handleDelete = () => {
    if (isPublicOrCurated) {
      Alert.alert('Official Playlist', 'Public admin playlists cannot be deleted by users.');
      return;
    }
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${selectedPlaylist.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(selectedPlaylist.id);
            setSelectedPlaylist(null);
          },
        },
      ]
    );
  };

  // Filter songs for the song picker
  const pickerSongs = songs.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchSongQuery.toLowerCase()) ||
      (s.desc && s.desc.toLowerCase().includes(searchSongQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <Modal
      visible={!!selectedPlaylist}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        setIsPickingSongs(false);
        setSelectedPlaylist(null);
      }}
    >
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Gradient Header */}
          <LinearGradient
            colors={
              isLikedSpecial
                ? ['#4F46E5', '#7C3AED', '#0E111E']
                : [
                    selectedPlaylist.gradient?.[0] || selectedPlaylist.bgColor || '#7C3AED',
                    selectedPlaylist.gradient?.[1] || '#1E1B4B',
                    '#0E111E',
                  ]
            }
            style={styles.heroSection}
          >
            <View style={styles.safeHeader}>
              <TouchableOpacity
                onPress={() => setSelectedPlaylist(null)}
                style={styles.backBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {!isLikedSpecial && !isPublicOrCurated && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.backBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#F43F5E" />
                </TouchableOpacity>
              )}
            </View>

            {/* Playlist Artwork Banner */}
            <View style={styles.coverWrapper}>
              {selectedPlaylist.image ? (
                <Image
                  source={
                    typeof selectedPlaylist.image === 'string'
                      ? { uri: selectedPlaylist.image }
                      : selectedPlaylist.image?.uri
                      ? { uri: selectedPlaylist.image.uri }
                      : selectedPlaylist.image
                  }
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={
                    isLikedSpecial
                      ? ['#4F46E5', '#7C3AED']
                      : selectedPlaylist.gradient || ['#8B5CF6', '#4C1D95']
                  }
                  style={styles.coverGradient}
                >
                  <Ionicons
                    name={isLikedSpecial ? 'heart' : 'musical-notes'}
                    size={54}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              )}
            </View>

            {isPublicOrCurated && (
              <View style={styles.publicBadge}>
                <Ionicons name="sparkles" size={12} color="#C084FC" />
                <Text style={styles.publicBadgeText}>OFFICIAL PUBLIC PLAYLIST</Text>
              </View>
            )}

            <Text style={styles.playlistTitle}>{selectedPlaylist.name}</Text>
            <Text style={styles.playlistDesc}>
              {isLikedSpecial
                ? 'All tracks you loved across Pulse Music'
                : selectedPlaylist.desc || 'Custom User Playlist'}
            </Text>

            <View style={styles.metaRow}>
              <Ionicons name="disc-outline" size={14} color="#C084FC" />
              <Text style={styles.metaText}>
                {playlistSongList.length} {playlistSongList.length === 1 ? 'Song' : 'Songs'}
              </Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{isPublicOrCurated ? 'Pulse Sound Admin' : 'Pulse Music'}</Text>
            </View>

            {/* Theory & Curator Concept Box */}
            {selectedPlaylist.theory ? (
              <View style={styles.theoryBox}>
                <View style={styles.theoryHeaderRow}>
                  <Ionicons name="bulb-outline" size={15} color="#A855F7" />
                  <Text style={styles.theoryHeading}>CURATOR THEORY & VIBE</Text>
                </View>
                <Text style={styles.theoryText}>{selectedPlaylist.theory}</Text>
              </View>
            ) : null}

            {/* Play All & Add Songs Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePlayPausePlaylist}
                disabled={playlistSongList.length === 0}
                style={[
                  styles.playAllBtn,
                  playlistSongList.length === 0 && { opacity: 0.5 },
                  isPlaylistPlaying && styles.playAllBtnPlaying,
                ]}
                accessibilityLabel={isPlaylistPlaying ? 'Pause Playlist' : 'Play Playlist'}
              >
                <LinearGradient
                  colors={isPlaylistPlaying ? ['#A855F7', '#7C3AED'] : ['#8B5CF6', '#6D28D9']}
                  style={styles.playGradient}
                >
                  <Ionicons
                    name={isPlaylistPlaying ? 'pause' : 'play'}
                    size={26}
                    color="#FFFFFF"
                    style={isPlaylistPlaying ? {} : { marginLeft: 3 }}
                  />
                </LinearGradient>
              </TouchableOpacity>

              {!isLikedSpecial && !isPublicOrCurated && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsPickingSongs(!isPickingSongs)}
                  style={styles.addSongsBtn}
                >
                  <Ionicons
                    name={isPickingSongs ? 'chevron-up' : 'add'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.addSongsText}>
                    {isPickingSongs ? 'Done Adding' : 'Add Songs'}
                  </Text>
                </TouchableOpacity>
              )}

              {playlistSongList.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => downloadPlaylistPacks && downloadPlaylistPacks(selectedPlaylist.name, playlistSongList)}
                  style={styles.downloadPlaylistBtn}
                  accessibilityLabel="Download entire playlist for offline"
                >
                  <Ionicons name="arrow-down-circle-outline" size={20} color="#C084FC" />
                  <Text style={styles.downloadPlaylistText}>Download All</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>

          {/* Quick Song Picker Drawer inside Playlist */}
          {isPickingSongs && !isLikedSpecial && (
            <View style={styles.pickerSection}>
              <View style={styles.pickerHeader}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  placeholder="Search songs to add..."
                  placeholderTextColor="#64748B"
                  value={searchSongQuery}
                  onChangeText={setSearchSongQuery}
                  style={styles.pickerInput}
                />
              </View>

              <Text style={styles.pickerSubLabel}>Tap + to add into this playlist:</Text>

              {pickerSongs.map((song, idx) => {
                const isAlreadyIn = selectedPlaylist.songIds.includes(song.id) || selectedPlaylist.songIds.includes(song._id);
                return (
                  <View key={`${song._id || song.id || 'picker'}-${idx}`} style={styles.pickerRow}>
                    <Image source={song.image} style={styles.pickerThumb} resizeMode="cover" />
                    <View style={styles.pickerMeta}>
                      <Text numberOfLines={1} style={styles.pickerTitle}>
                        {song.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.pickerArtist}>
                        {song.desc}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        if (isAlreadyIn) {
                          removeSongFromPlaylist(selectedPlaylist.id, song.id);
                        } else {
                          addSongToPlaylist(selectedPlaylist.id, song.id);
                        }
                      }}
                      style={[
                        styles.pickerAddBtn,
                        isAlreadyIn && styles.pickerAddBtnActive,
                      ]}
                    >
                      <Ionicons
                        name={isAlreadyIn ? 'checkmark' : 'add'}
                        size={18}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Songs List in Playlist */}
          <View style={styles.songListContainer}>
            <View style={styles.tracksHeaderRow}>
              <Text style={styles.tracksHeader}>
                {playlistSongList.length > 0 ? 'Playlist Tracks' : 'Empty Playlist'}
              </Text>
              {playlistSongList.length > 0 && (
                <View style={styles.tracksCountPill}>
                  <Text style={styles.tracksCountPillText}>{playlistSongList.length} Tracks</Text>
                </View>
              )}
            </View>

            {playlistSongList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>No songs here yet</Text>
                <Text style={styles.emptySub}>
                  {isLikedSpecial
                    ? 'Heart ❤️ any song in the app to see it here!'
                    : 'Tap "Add Songs" above or "+" on any song card to add tracks!'}
                </Text>
              </View>
            ) : (
              playlistSongList.map((song, index) => (
                <SongCard
                  key={`${song._id || song.id || 'pl-track'}-${index}`}
                  song={song}
                  index={index}
                  queue={playlistSongList}
                  queueSource={`playlist:${selectedPlaylist._id || selectedPlaylist.id}`}
                  onRemove={
                    !isLikedSpecial
                      ? (songId) => removeSongFromPlaylist(selectedPlaylist.id, songId)
                      : null
                  }
                />
              ))
            )}
          </View>

          <View style={{ height: currentTrack ? 100 : 40 }} />
        </ScrollView>

        {/* Floating Now Playing Mini-Bar inside PlaylistModal */}
        {currentTrack && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsFullPlayerOpen(true)}
            style={styles.floatingMiniBar}
          >
            <Image
              source={
                typeof currentTrack.image === 'string'
                  ? { uri: currentTrack.image }
                  : currentTrack.image?.uri
                  ? { uri: currentTrack.image.uri }
                  : currentTrack.image
              }
              style={styles.miniBarThumb}
              resizeMode="cover"
            />
            <View style={styles.miniBarMeta}>
              <View style={styles.miniBarTitleRow}>
                <View style={styles.miniBarBadge}>
                  <Text style={styles.miniBarBadgeText}>NOW PLAYING</Text>
                </View>
                <Text numberOfLines={1} style={styles.miniBarTitle}>
                  {currentTrack.name}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.miniBarArtist}>
                {currentTrack.artist || currentTrack.desc || 'Pulse Sound'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              style={styles.miniBarPlayBtn}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A0F',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    alignItems: 'center',
  },
  safeHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 42,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(9, 10, 18, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverWrapper: {
    width: 140,
    height: 140,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 14,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  publicBadgeText: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  theoryBox: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  theoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  theoryHeading: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  theoryText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  playlistTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  playlistDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  metaText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  metaDot: {
    color: '#64748B',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playAllBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  playAllBtnPlaying: {
    shadowColor: '#A855F7',
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
  },
  playGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSongsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1C223A',
    borderWidth: 1,
    borderColor: '#2F385C',
  },
  addSongsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  downloadPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  downloadPlaylistText: {
    color: '#C084FC',
    fontSize: 13,
    fontWeight: '700',
  },
  pickerSection: {
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#12162B',
    borderWidth: 1,
    borderColor: '#7C3AED60',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0D18',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#242C48',
  },
  pickerInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  pickerSubLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2035',
  },
  pickerThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    marginRight: 10,
  },
  pickerMeta: {
    flex: 1,
    marginRight: 8,
  },
  pickerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  pickerArtist: {
    color: '#64748B',
    fontSize: 11,
  },
  pickerAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#242C4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerAddBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  songListContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  tracksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tracksHeader: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  tracksCountPill: {
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    borderColor: 'rgba(168, 85, 247, 0.45)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tracksCountPillText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  floatingMiniBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 18, 38, 0.92)',
    borderColor: 'rgba(192, 132, 252, 0.28)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  miniBarThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#1E2342',
  },
  miniBarMeta: {
    flex: 1,
    marginRight: 8,
  },
  miniBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  miniBarBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    borderColor: 'rgba(168, 85, 247, 0.38)',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniBarBadgeText: {
    color: '#C084FC',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  miniBarTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  miniBarArtist: {
    color: '#94A3B8',
    fontSize: 11,
  },
  miniBarPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
