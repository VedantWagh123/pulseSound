import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { usePlayer } from '../context/PlayerContext';
import { resolveYouTubeTrack } from '../config/api';

const YOUTUBE_HISTORY_STORAGE_KEY = '@pulse_youtube_history';

export const YouTubeStreamModal = () => {
  const {
    isYouTubeModalOpen,
    setIsYouTubeModalOpen,
    initialYouTubeUrl,
    setInitialYouTubeUrl,
    playTrack,
    setAddToPlaylistSong,
    downloadSong,
    exportSongToDevice,
    isTrackDownloaded,
    showInAppToast,
  } = usePlayer();

  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resolvedSong, setResolvedSong] = useState(null);
  const [recentTracks, setRecentTracks] = useState([]);
  const [isExportingTrackId, setIsExportingTrackId] = useState(null);

  // Load history on mount or when modal opens
  useEffect(() => {
    if (isYouTubeModalOpen) {
      loadRecentHistory();
      if (initialYouTubeUrl) {
        setInputUrl(initialYouTubeUrl);
        handleResolve(initialYouTubeUrl);
        setInitialYouTubeUrl('');
      }
    } else {
      setErrorMessage('');
      setIsLoading(false);
    }
  }, [isYouTubeModalOpen, initialYouTubeUrl]);

  const loadRecentHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(YOUTUBE_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentTracks(parsed);
        }
      }
    } catch (_) {}
  };

  const saveToHistory = async (song) => {
    try {
      setRecentTracks((prev) => {
        const filtered = prev.filter((s) => String(s._id || s.id) !== String(song._id || song.id));
        const updated = [song, ...filtered].slice(0, 15);
        AsyncStorage.setItem(YOUTUBE_HISTORY_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } catch (_) {}
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setInputUrl(text.trim());
        setErrorMessage('');
      } else {
        if (showInAppToast) {
          showInAppToast('Clipboard is empty or contains no link', 'info');
        }
      }
    } catch (e) {
      Alert.alert('Paste Error', 'Unable to read from clipboard. Please type or paste manually.');
    }
  };

  const handleResolve = async (urlToResolve) => {
    const target = (urlToResolve || inputUrl || '').trim();
    if (!target) {
      setErrorMessage('Please enter or paste a YouTube link');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setResolvedSong(null);

    const result = await resolveYouTubeTrack(target);
    setIsLoading(false);

    if (result && result.success && result.song) {
      setResolvedSong(result.song);
      saveToHistory(result.song);
      if (showInAppToast) {
        showInAppToast(`⚡ Ready: ${result.song.name}`, 'success');
      }
    } else {
      setErrorMessage(result?.message || 'Could not extract audio stream from this link. Please check the URL.');
    }
  };

  const handlePlayNow = (song) => {
    if (!song) return;
    playTrack(song);
    setIsYouTubeModalOpen(false);
    if (showInAppToast) {
      showInAppToast(`Now Playing: ${song.name} 🎶`, 'success');
    }
  };

  const handleAddToPlaylist = (song) => {
    if (!song) return;
    setAddToPlaylistSong(song);
    setIsYouTubeModalOpen(false);
  };

  const handleDownload = (song) => {
    if (!song) return;
    downloadSong(song);
    if (showInAppToast) {
      showInAppToast(`Downloading "${song.name}" for offline playback... 📥`, 'info');
    }
  };

  const handleExportToDevice = async (song) => {
    if (!song) return;
    const songId = String(song._id || song.id);
    setIsExportingTrackId(songId);
    try {
      if (exportSongToDevice) {
        await exportSongToDevice(song);
      }
    } catch (_) {}
    setIsExportingTrackId(null);
  };

  const handleClearHistory = async () => {
    try {
      await AsyncStorage.removeItem(YOUTUBE_HISTORY_STORAGE_KEY);
      setRecentTracks([]);
      if (showInAppToast) {
        showInAppToast('YouTube stream history cleared', 'info');
      }
    } catch (_) {}
  };

  if (!isYouTubeModalOpen) return null;

  return (
    <Modal
      visible={isYouTubeModalOpen}
      animationType="slide"
      transparent
      onRequestClose={() => setIsYouTubeModalOpen(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          {/* Ambient Background Gradient */}
          <LinearGradient
            colors={['#181024', '#0F121E', '#080912']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerBadgeWrap}>
              <View style={styles.ytIconBadge}>
                <Ionicons name="logo-youtube" size={18} color="#FF0000" />
              </View>
              <View>
                <Text style={styles.headerTitle}>YouTube Streamer</Text>
                <Text style={styles.headerSub}>Stream • Save to Playlist • Offline Download</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsYouTubeModalOpen(false)}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Input Bar */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>PASTE YOUTUBE VIDEO / SONG LINK</Text>
              <View style={styles.inputRow}>
                <Ionicons name="link-outline" size={20} color="#94A3B8" style={{ marginLeft: 10 }} />
                <TextInput
                  placeholder="https://youtu.be/... or youtube.com/watch?v=..."
                  placeholderTextColor="#64748B"
                  value={inputUrl}
                  onChangeText={(val) => {
                    setInputUrl(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={() => handleResolve()}
                  style={styles.urlInput}
                />
                {inputUrl.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setInputUrl('')}
                    style={styles.actionIconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handlePasteFromClipboard}
                    style={styles.pasteBadgeBtn}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="clipboard-outline" size={13} color="#C084FC" />
                    <Text style={styles.pasteBadgeText}>Paste</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={() => handleResolve()}
                disabled={isLoading}
                activeOpacity={0.82}
                style={styles.submitBtn}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtnGradient}
                >
                  {isLoading ? (
                    <View style={styles.btnLoadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Extracting Audio Stream...</Text>
                    </View>
                  ) : (
                    <View style={styles.btnLoadingRow}>
                      <Ionicons name="flash" size={16} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Stream & Resolve Track</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#F87171" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Active Resolved Song Preview Card */}
            {resolvedSong && (
              <View style={styles.resolvedCard}>
                <View style={styles.previewTop}>
                  <Image
                    source={typeof resolvedSong.image === 'string' ? { uri: resolvedSong.image } : resolvedSong.image}
                    style={styles.previewArtwork}
                    resizeMode="cover"
                  />
                  <View style={styles.previewMeta}>
                    <Text numberOfLines={2} style={styles.previewTitle}>
                      {resolvedSong.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.previewArtist}>
                      {resolvedSong.artist}
                    </Text>
                    <View style={styles.metaBadgeRow}>
                      <View style={styles.durationBadge}>
                        <Ionicons name="time-outline" size={11} color="#C084FC" />
                        <Text style={styles.durationBadgeText}>{resolvedSong.duration || '3:30'}</Text>
                      </View>
                      <View style={styles.liveStreamBadge}>
                        <Text style={styles.liveStreamBadgeText}>⚡ 100% Free Stream</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Primary Action Buttons */}
                <View style={styles.actionsGrid}>
                  {/* Play Button */}
                  <TouchableOpacity
                    onPress={() => handlePlayNow(resolvedSong)}
                    style={styles.actionBtnPlay}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="play" size={16} color="#090A0F" />
                    <Text style={styles.actionBtnPlayText}>Play Now</Text>
                  </TouchableOpacity>

                  {/* Save to Playlist */}
                  <TouchableOpacity
                    onPress={() => handleAddToPlaylist(resolvedSong)}
                    style={styles.actionBtnSecondary}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#C084FC" />
                    <Text style={styles.actionBtnSecondaryText}>Save to Playlist</Text>
                  </TouchableOpacity>

                  {/* Offline Download */}
                  <TouchableOpacity
                    onPress={() => handleDownload(resolvedSong)}
                    style={[
                      styles.actionBtnSecondary,
                      isTrackDownloaded && isTrackDownloaded(String(resolvedSong._id || resolvedSong.id)) && styles.actionBtnDownloaded,
                    ]}
                    activeOpacity={0.82}
                  >
                    <Ionicons
                      name={
                        isTrackDownloaded && isTrackDownloaded(String(resolvedSong._id || resolvedSong.id))
                          ? 'checkmark-circle'
                          : 'cloud-download-outline'
                      }
                      size={16}
                      color={
                        isTrackDownloaded && isTrackDownloaded(String(resolvedSong._id || resolvedSong.id))
                          ? '#10B981'
                          : '#94A3B8'
                      }
                    />
                    <Text
                      style={[
                        styles.actionBtnSecondaryText,
                        isTrackDownloaded && isTrackDownloaded(String(resolvedSong._id || resolvedSong.id)) && { color: '#10B981' },
                      ]}
                    >
                      {isTrackDownloaded && isTrackDownloaded(String(resolvedSong._id || resolvedSong.id))
                        ? 'Downloaded'
                        : 'Offline Download'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Dedicated Fast Export to Device Storage (.mp3) */}
                <TouchableOpacity
                  onPress={() => handleExportToDevice(resolvedSong)}
                  disabled={isExportingTrackId === String(resolvedSong._id || resolvedSong.id)}
                  style={styles.actionBtnDevice}
                  activeOpacity={0.82}
                >
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.2)', 'rgba(6, 182, 212, 0.16)', 'rgba(59, 130, 246, 0.2)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionBtnDeviceGradient}
                  >
                    {isExportingTrackId === String(resolvedSong._id || resolvedSong.id) ? (
                      <View style={styles.deviceBtnContent}>
                        <ActivityIndicator size="small" color="#10B981" />
                        <Text style={styles.actionBtnDeviceText}>Downloading to Phone Storage...</Text>
                      </View>
                    ) : (
                      <View style={styles.deviceBtnContent}>
                        <View style={styles.deviceIconCircle}>
                          <Ionicons name="phone-portrait-outline" size={14} color="#10B981" />
                        </View>
                        <Text style={styles.actionBtnDeviceText}>Save to Phone Storage (.mp3)</Text>
                        <View style={styles.mp3Badge}>
                          <Text style={styles.mp3BadgeText}>MP3</Text>
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Recent Imports History */}
            {recentTracks.length > 0 && (
              <View style={styles.historySection}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>Recent YouTube Imports</Text>
                  <TouchableOpacity onPress={handleClearHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.historyClearText}>Clear</Text>
                  </TouchableOpacity>
                </View>

                {recentTracks.map((song) => {
                  const sId = String(song._id || song.id);
                  const isDownloaded = isTrackDownloaded ? isTrackDownloaded(sId) : false;

                  return (
                    <TouchableOpacity
                      key={`yt-hist-${sId}`}
                      onPress={() => handlePlayNow(song)}
                      style={styles.historyRow}
                      activeOpacity={0.78}
                    >
                      <Image
                        source={typeof song.image === 'string' ? { uri: song.image } : song.image}
                        style={styles.historyThumb}
                      />
                      <View style={styles.historyMeta}>
                        <Text numberOfLines={1} style={styles.historySongName}>
                          {song.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.historySongSub}>
                          {song.artist} • {song.duration || '3:30'}
                        </Text>
                      </View>

                      {/* Row Actions */}
                      <View style={styles.historyRowActions}>
                        <TouchableOpacity
                          onPress={() => handleAddToPlaylist(song)}
                          style={styles.historyIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="add" size={18} color="#94A3B8" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDownload(song)}
                          style={styles.historyIconBtn}
                          title="Offline Download"
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={isDownloaded ? 'checkmark-circle' : 'cloud-download-outline'}
                            size={16}
                            color={isDownloaded ? '#10B981' : '#94A3B8'}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleExportToDevice(song)}
                          disabled={isExportingTrackId === sId}
                          style={styles.historyIconBtn}
                          title="Save to Phone Storage (.mp3)"
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {isExportingTrackId === sId ? (
                            <ActivityIndicator size="small" color="#10B981" />
                          ) : (
                            <Ionicons name="download-outline" size={16} color="#38BDF8" />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handlePlayNow(song)}
                          style={styles.historyPlayBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="play" size={14} color="#090A0F" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: '84%',
    backgroundColor: '#0A0C16',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ytIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 0, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 36,
  },
  inputCard: {
    backgroundColor: '#121626',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090B14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingRight: 6,
    minHeight: 46,
  },
  urlInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  actionIconBtn: {
    padding: 6,
  },
  pasteBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(192, 132, 252, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pasteBadgeText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  resolvedCard: {
    backgroundColor: '#121626',
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  previewTop: {
    flexDirection: 'row',
    gap: 12,
  },
  previewArtwork: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#090B14',
  },
  previewMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    marginBottom: 4,
  },
  previewArtist: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationBadgeText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '700',
  },
  liveStreamBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveStreamBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  actionBtnPlay: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
  },
  actionBtnPlayText: {
    color: '#090A0F',
    fontSize: 12,
    fontWeight: '800',
  },
  actionBtnSecondary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E2540',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionBtnSecondaryText: {
    color: '#F1F5F9',
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnDownloaded: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  actionBtnDevice: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  actionBtnDeviceGradient: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deviceIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDeviceText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  mp3Badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  mp3BadgeText: {
    color: '#6EE7B7',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  historySection: {
    marginTop: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  historyClearText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121626',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  historyThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#090B14',
    marginRight: 10,
  },
  historyMeta: {
    flex: 1,
    marginRight: 8,
  },
  historySongName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  historySongSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  historyRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyIconBtn: {
    padding: 4,
  },
  historyPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C084FC',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

