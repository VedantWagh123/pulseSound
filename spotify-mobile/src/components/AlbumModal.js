import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from './SongCard';

export const AlbumModal = () => {
  const { selectedAlbum, setSelectedAlbum, songs, playTrack, downloadPlaylistPacks } = usePlayer();
  const { width } = useWindowDimensions();
  const coverSize = Math.min(Math.max(width * 0.52, 160), 240);

  if (!selectedAlbum) return null;

  // Filter songs for this album or fallback to all songs
  const albumSongs = songs.filter((s) => {
    if (!s.album || !selectedAlbum.name) return false;
    return s.album.trim().toLowerCase() === selectedAlbum.name.trim().toLowerCase();
  });
  const displaySongs = albumSongs.length > 0 ? albumSongs : songs;

  const handlePlayAll = () => {
    if (displaySongs.length > 0) {
      playTrack(displaySongs[0], {
        queue: displaySongs,
        queueSource: `album:${selectedAlbum.name}`,
      });
    }
  };

  return (
    <Modal
      visible={!!selectedAlbum}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setSelectedAlbum(null)}
    >
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Gradient & Image */}
          <LinearGradient
            colors={[selectedAlbum.bgColor || '#10B981', '#121524', '#090A0F']}
            style={styles.heroSection}
          >
            <View style={styles.safeHeader}>
              <TouchableOpacity
                onPress={() => setSelectedAlbum(null)}
                style={styles.backBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn}>
                <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={[styles.coverWrapper, { width: coverSize, height: coverSize }]}>
              <Image
                source={
                  typeof selectedAlbum?.image === 'string'
                    ? { uri: selectedAlbum.image }
                    : selectedAlbum?.image?.uri
                    ? { uri: selectedAlbum.image.uri }
                    : selectedAlbum?.image
                }
                style={styles.coverImage}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.albumTitle}>{selectedAlbum.name}</Text>
            <Text style={styles.albumDesc}>{selectedAlbum.desc}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="musical-notes" size={14} color="#C084FC" />
              <Text style={styles.metaText}>{displaySongs.length} Songs</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>About 25 min</Text>
            </View>

            {/* Play & Shuffle Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePlayAll}
                style={[styles.playAllBtn, { backgroundColor: selectedAlbum.bgColor || '#8B5CF6' }]}
              >
                <Ionicons name="play" size={22} color="#FFFFFF" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.shuffleBtn}>
                <Ionicons name="shuffle" size={22} color="#C4B5FD" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => downloadPlaylistPacks && downloadPlaylistPacks(selectedAlbum.name, displaySongs)}
                style={styles.shuffleBtn}
                accessibilityLabel="Download Album for offline"
              >
                <Ionicons name="arrow-down-circle-outline" size={24} color="#10B981" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Songs List */}
          <View style={styles.songListContainer}>
            <Text style={styles.tracksHeader}>Tracks</Text>
            {displaySongs.map((song, index) => (
              <SongCard
                key={`${song._id || song.id || 'track'}-${index}`}
                song={song}
                index={index}
                queue={displaySongs}
                queueSource={`album:${selectedAlbum.name}`}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A12',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  safeHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  albumTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  albumDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
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
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 10,
  },
  shuffleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161926',
    borderWidth: 1,
    borderColor: '#23293D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songListContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  tracksHeader: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
});
