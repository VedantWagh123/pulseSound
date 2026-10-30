import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

export const AddToPlaylistModal = () => {
  const {
    addToPlaylistSong,
    setAddToPlaylistSong,
    playlists,
    createPlaylist,
    toggleSongInPlaylist,
  } = usePlayer();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [toastAnim] = useState(new Animated.Value(0));

  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  if (!addToPlaylistSong) return null;

  const handleToggle = (playlist) => {
    const wasAdded = toggleSongInPlaylist(playlist.id, addToPlaylistSong.id);
    if (wasAdded) {
      showToast(`Added to "${playlist.name}" 🎵`);
    } else {
      showToast(`Removed from "${playlist.name}"`);
    }
  };

  const handleCreateAndAdd = () => {
    if (!newPlaylistName.trim()) {
      showToast('Please enter a playlist name');
      return;
    }
    const created = createPlaylist(newPlaylistName.trim(), addToPlaylistSong.id);
    setNewPlaylistName('');
    setIsCreatingNew(false);
    showToast(`Created & added to "${created.name}" 🚀`);
  };

  return (
    <Modal
      visible={!!addToPlaylistSong}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setIsCreatingNew(false);
        setAddToPlaylistSong(null);
      }}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            setIsCreatingNew(false);
            setAddToPlaylistSong(null);
          }}
        />

        <View style={styles.sheetContainer}>
          <View style={styles.handleBar} />

          {/* Top Bar */}
          <View style={styles.topBar}>
            <Text style={styles.sheetTitle}>Add to Playlist</Text>
            <TouchableOpacity
              onPress={() => {
                setIsCreatingNew(false);
                setAddToPlaylistSong(null);
              }}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Selected Song Preview Banner */}
          <View style={styles.songBanner}>
            <Image source={addToPlaylistSong.image} style={styles.songThumb} resizeMode="cover" />
            <View style={styles.songMeta}>
              <Text numberOfLines={1} style={styles.songTitle}>
                {addToPlaylistSong.name}
              </Text>
              <Text numberOfLines={1} style={styles.songSubtitle}>
                {addToPlaylistSong.album || addToPlaylistSong.desc}
              </Text>
            </View>
            <View style={styles.songBadge}>
              <Ionicons name="musical-notes" size={14} color="#C084FC" />
            </View>
          </View>

          {/* Create New Playlist Action / Input */}
          {isCreatingNew ? (
            <View style={styles.createInputBox}>
              <TextInput
                placeholder="Give your playlist a name..."
                placeholderTextColor="#64748B"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus={true}
                style={styles.textInput}
              />
              <View style={styles.createActionRow}>
                <TouchableOpacity
                  onPress={() => {
                    setIsCreatingNew(false);
                    setNewPlaylistName('');
                  }}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCreateAndAdd} style={styles.confirmCreateBtn}>
                  <Text style={styles.confirmCreateBtnText}>Create & Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsCreatingNew(true)}
              style={styles.newPlaylistBtn}
            >
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.plusIconWrap}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.newPlaylistMeta}>
                <Text style={styles.newPlaylistTitle}>Create New Playlist</Text>
                <Text style={styles.newPlaylistSub}>Tap to name and add track</Text>
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>Your Existing Playlists</Text>

          {/* Playlists List with Real-time Checkmarks */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.playlistList}
          >
            {playlists.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No playlists yet. Create your first above!</Text>
              </View>
            ) : (
              playlists.map((pl) => {
                const isAdded = pl.songIds.includes(addToPlaylistSong.id);
                return (
                  <TouchableOpacity
                    key={pl.id}
                    activeOpacity={0.75}
                    onPress={() => handleToggle(pl)}
                    style={[styles.playlistItem, isAdded && styles.playlistItemAdded]}
                  >
                    <LinearGradient
                      colors={pl.gradient || ['#8B5CF6', '#4C1D95']}
                      style={styles.playlistThumb}
                    >
                      <Ionicons name="musical-notes" size={18} color="#FFFFFF" />
                    </LinearGradient>

                    <View style={styles.playlistDetails}>
                      <Text numberOfLines={1} style={styles.playlistName}>
                        {pl.name}
                      </Text>
                      <Text style={styles.playlistTracks}>
                        {pl.songIds.length} {pl.songIds.length === 1 ? 'song' : 'songs'}
                      </Text>
                    </View>

                    <View style={[styles.checkCircle, isAdded && styles.checkCircleActive]}>
                      {isAdded ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : (
                        <Ionicons name="add" size={16} color="#64748B" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 28 }} />
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
                        outputRange: [16, 0],
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
    maxHeight: '85%',
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
    marginBottom: 10,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C2238',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 14,
    marginBottom: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#141829',
    borderWidth: 1,
    borderColor: '#242C47',
  },
  songThumb: {
    width: 42,
    height: 42,
    borderRadius: 10,
    marginRight: 12,
  },
  songMeta: {
    flex: 1,
  },
  songTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  songSubtitle: {
    color: '#A855F7',
    fontSize: 12,
    fontWeight: '500',
  },
  songBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E2338',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#12162A',
    borderWidth: 1,
    borderColor: '#262F52',
  },
  plusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  newPlaylistMeta: {
    flex: 1,
  },
  newPlaylistTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  newPlaylistSub: {
    color: '#94A3B8',
    fontSize: 11,
  },
  createInputBox: {
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#141829',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0B0D18',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#262E4A',
  },
  createActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmCreateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
  },
  confirmCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  playlistList: {
    paddingHorizontal: 18,
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#121528',
    borderWidth: 1,
    borderColor: '#1F253F',
    marginBottom: 8,
  },
  playlistItemAdded: {
    backgroundColor: '#181C35',
    borderColor: '#7C3AED60',
  },
  playlistThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistDetails: {
    flex: 1,
  },
  playlistName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  playlistTracks: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '500',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#333D5E',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1222',
  },
  checkCircleActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#1E243D',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
