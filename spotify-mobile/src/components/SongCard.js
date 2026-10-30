import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

export const SongCard = ({ song, index, onRemove, queue, queueSource }) => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlayPause,
    isSongLiked,
    toggleLikeSong,
    setAddToPlaylistSong,
    setIsFullPlayerOpen,
    isTrackDownloaded,
    isTrackCached,
    getTrackDownloadProgress,
    isTrackDownloading,
    downloadSong,
    removeDownload,
  } = usePlayer();

  const currentId = String(currentTrack?._id || currentTrack?.id || '');
  const songId = String(song?._id || song?.id || '');
  const isCurrent = Boolean(
    currentTrack &&
    songId &&
    (currentId === songId ||
      (currentTrack.name && song.name && currentTrack.name.trim().toLowerCase() === song.name.trim().toLowerCase()))
  );

  const isLiked = isSongLiked ? (isSongLiked(songId) || isSongLiked(song.id)) : false;
  const isDownloaded = isTrackDownloaded ? isTrackDownloaded(songId) : false;
  const isCached = !isDownloaded && isTrackCached ? isTrackCached(songId) : false;
  const isDownloading = isTrackDownloading ? isTrackDownloading(songId) : false;
  const downloadProgress = getTrackDownloadProgress ? getTrackDownloadProgress(songId) : 0;

  // Real-time Bouncy Equalizer Bars for Active Song
  const bar1 = useRef(new Animated.Value(4)).current;
  const bar2 = useRef(new Animated.Value(14)).current;
  const bar3 = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!isCurrent || !isPlaying) {
      bar1.setValue(4);
      bar2.setValue(8);
      bar3.setValue(5);
      return;
    }

    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(bar1, { toValue: 16, duration: 280, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(bar1, { toValue: 4, duration: 280, easing: Easing.linear, useNativeDriver: false }),
      ])
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.timing(bar2, { toValue: 5, duration: 220, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(bar2, { toValue: 18, duration: 220, easing: Easing.linear, useNativeDriver: false }),
      ])
    );
    const anim3 = Animated.loop(
      Animated.sequence([
        Animated.timing(bar3, { toValue: 15, duration: 250, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(bar3, { toValue: 4, duration: 250, easing: Easing.linear, useNativeDriver: false }),
      ])
    );

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [isCurrent, isPlaying]);

  const imageSource = typeof song.image === 'string'
    ? { uri: song.image }
    : song.image?.uri
    ? { uri: song.image.uri }
    : song.image;

  const handlePress = () => {
    playTrack(song, { queue, queueSource });
    if (setIsFullPlayerOpen) {
      setIsFullPlayerOpen(true);
    }
  };

  const handleDownloadPress = () => {
    if (isDownloaded) {
      Alert.alert(
        'Offline Track',
        `"${song.name}" is saved offline. Would you like to remove it from your device storage?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove Download',
            style: 'destructive',
            onPress: () => removeDownload && removeDownload(songId),
          },
        ]
      );
    } else if (isCached) {
      Alert.alert(
        '⚡ Auto-Cached Track',
        `"${song.name}" is already cached on your device from streaming and can be played offline without internet! Would you like to pin it permanently so it is never cleared by cache cleanup?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pin Permanently',
            onPress: () => downloadSong && downloadSong(song),
          },
        ]
      );
    } else if (!isDownloading) {
      downloadSong && downloadSong(song);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[styles.container, isCurrent && styles.activeContainer]}
    >
      <View style={styles.leftSection}>
        <View style={[styles.imageWrapper, isCurrent && styles.activeImageWrapper]}>
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
          {isCurrent && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              style={styles.playingOverlay}
            >
              {isPlaying ? (
                <View style={styles.equalizerRow}>
                  <Animated.View style={[styles.eqBar, { height: bar1 }]} />
                  <Animated.View style={[styles.eqBar, { height: bar2 }]} />
                  <Animated.View style={[styles.eqBar, { height: bar3 }]} />
                </View>
              ) : (
                <Ionicons name="play" size={16} color="#C084FC" />
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            {isCurrent && (
              <View style={styles.playingBadge}>
                <View style={styles.playingDot} />
                <Text style={styles.playingBadgeText}>{isPlaying ? 'PLAYING' : 'PAUSED'}</Text>
              </View>
            )}
            <Text numberOfLines={1} style={[styles.title, isCurrent && styles.activeTitle]}>
              {song.name}
            </Text>
            {isDownloaded ? (
              <View style={styles.downloadBadge}>
                <Ionicons name="arrow-down-circle" size={13} color="#10B981" />
              </View>
            ) : isCached ? (
              <View style={styles.cachedBadge}>
                <Ionicons name="flash" size={11} color="#C084FC" />
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={[styles.subtitle, isCurrent && styles.activeSubtitle]}>
            {song.desc || song.artist || 'Pulse Sound'}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Quick Play/Pause Icon Button to the left of the Download Button */}
        {isCurrent && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            style={styles.cardPlayPauseBtn}
            hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
            accessibilityLabel={isPlaying ? "Pause track" : "Play track"}
          >
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={24}
              color="#C084FC"
            />
          </TouchableOpacity>
        )}

        <Text style={[styles.duration, isCurrent && { color: '#C084FC', fontWeight: '700' }]}>
          {song.duration}
        </Text>

        {/* Offline Download Status Button */}
        <TouchableOpacity
          onPress={handleDownloadPress}
          style={styles.iconBtn}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessibilityLabel={isDownloaded ? "Remove download" : isCached ? "Cached offline - Tap to pin" : "Download song for offline listening"}
        >
          {isDownloading ? (
            <View style={styles.downloadingWrap}>
              <ActivityIndicator size="small" color="#10B981" />
            </View>
          ) : isDownloaded ? (
            <Ionicons name="checkmark-circle" size={19} color="#10B981" />
          ) : isCached ? (
            <View style={styles.cachedIconWrap}>
              <Ionicons name="flash" size={16} color="#A855F7" />
            </View>
          ) : (
            <Ionicons name="arrow-down-circle-outline" size={19} color="#64748B" />
          )}
        </TouchableOpacity>

        {/* Global Real-time Like / Heart Button */}
        <TouchableOpacity
          onPress={() => toggleLikeSong && toggleLikeSong(songId)}
          style={styles.iconBtn}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessibilityLabel="Like Song"
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={isLiked ? '#F43F5E' : '#64748B'}
          />
        </TouchableOpacity>

        {/* Real-time Add to Playlist Plus Button */}
        {onRemove ? (
          <TouchableOpacity
            onPress={() => onRemove(song.id)}
            style={styles.iconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityLabel="Remove from playlist"
          >
            <Ionicons name="trash-outline" size={17} color="#F43F5E" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setAddToPlaylistSong && setAddToPlaylistSong(song)}
            style={styles.iconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityLabel="Add to playlist"
          >
            <Ionicons name="add-circle-outline" size={20} color="#A855F7" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#0D1124',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  activeContainer: {
    backgroundColor: '#181434',
    borderColor: '#C084FC',
    borderWidth: 1.5,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  imageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#262D4A',
  },
  activeImageWrapper: {
    borderColor: '#C084FC',
    borderWidth: 1.5,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 16, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 18,
    gap: 3,
  },
  eqBar: {
    width: 3.5,
    backgroundColor: '#C084FC',
    borderRadius: 2,
  },
  playingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.20)',
    borderColor: '#A855F7',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginRight: 6,
    gap: 4,
  },
  playingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#C084FC',
  },
  playingBadgeText: {
    color: '#C084FC',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  activeTitle: {
    color: '#C084FC',
    fontWeight: '800',
  },
  activeSubtitle: {
    color: '#DDD6FE',
  },
  downloadBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cachedBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3B0764',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  cachedIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardPlayPauseBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  duration: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 2,
  },
  iconBtn: {
    padding: 3,
  },
  downloadingWrap: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
