import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../context/PlayerContext';

const formatTimestamp = (isoString) => {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (_) {
    return 'Recently';
  }
};

export const NotificationModal = () => {
  const {
    isNotificationModalOpen,
    setIsNotificationModalOpen,
    notifications,
    unreadNotificationCount,
    markAllNotificationsRead,
    clearAllNotifications,
    removeNotification,
    playTrack,
    songs,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'download' | 'like'
  const { height } = useWindowDimensions();

  if (!isNotificationModalOpen) return null;

  const filteredNotifications = (notifications || []).filter((item) => {
    // 1. Strict validation: Must not be null, empty, or missing essential content
    if (!item || typeof item !== 'object') return false;
    const hasValidContent =
      (item.title && typeof item.title === 'string' && item.title.trim() !== '') ||
      (item.message && typeof item.message === 'string' && item.message.trim() !== '') ||
      (item.songName && typeof item.songName === 'string' && item.songName.trim() !== '') ||
      item.song;
    if (!hasValidContent) return false;

    if (activeTab === 'download') return item.type === 'download';
    if (activeTab === 'like') return item.type === 'like';
    return true;
  });

  const handlePlaySong = (item) => {
    if (!item) return;
    const targetSong = item.song || (songs || []).find((s) => String(s._id || s.id) === String(item.songId));
    if (targetSong) {
      playTrack(targetSong);
      setIsNotificationModalOpen(false);
    }
  };

  return (
    <Modal
      visible={isNotificationModalOpen}
      animationType="slide"
      transparent
      onRequestClose={() => setIsNotificationModalOpen(false)}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalSheet, { maxHeight: height * 0.88 }]}>
          {/* Studio Accent Top Glow Bar */}
          <LinearGradient
            colors={['#7C3AED', '#38BDF8', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topAccentBar}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.bellIconWrap}>
                <Ionicons name="notifications" size={20} color="#FBBF24" />
                {unreadNotificationCount > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>{unreadNotificationCount}</Text>
                  </View>
                )}
              </View>
              <View>
                <Text style={styles.headerTitle}>Notifications</Text>
                <Text style={styles.headerSub}>
                  {notifications.length} total • Downloads & Likes
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              {unreadNotificationCount > 0 && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={markAllNotificationsRead}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Mark all as read"
                >
                  <Ionicons name="checkmark-done" size={18} color="#38BDF8" />
                </TouchableOpacity>
              )}

              {notifications.length > 0 && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={clearAllNotifications}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Clear all notifications"
                >
                  <Ionicons name="trash-outline" size={17} color="#94A3B8" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsNotificationModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close notifications"
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Filter Pills */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterPill, activeTab === 'all' && styles.filterPillActive]}
              onPress={() => setActiveTab('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, activeTab === 'all' && styles.filterTextActive]}>
                All ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTab === 'download' && styles.filterPillActive]}
              onPress={() => setActiveTab('download')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-down-circle"
                size={14}
                color={activeTab === 'download' ? '#10B981' : '#64748B'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.filterText, activeTab === 'download' && styles.filterTextActive]}>
                Downloads
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTab === 'like' && styles.filterPillActive]}
              onPress={() => setActiveTab('like')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="heart"
                size={14}
                color={activeTab === 'like' ? '#F43F5E' : '#64748B'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.filterText, activeTab === 'like' && styles.filterTextActive]}>
                Liked Songs
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content List */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="notifications-outline" size={38} color="#64748B" />
                </View>
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'all'
                    ? 'When you download songs or like tracks, updates will appear right here.'
                    : activeTab === 'download'
                    ? 'No download notifications yet. Save tracks offline to see updates.'
                    : 'No liked song notifications yet. Heart your favorite songs to see them here.'}
                </Text>
              </View>
            ) : (
              filteredNotifications.map((notif) => {
                const isDownload = notif.type === 'download';
                const isLike = notif.type === 'like';

                const iconName = isDownload
                  ? 'arrow-down'
                  : isLike
                  ? 'heart'
                  : 'flash';
                const iconColor = isDownload
                  ? '#10B981'
                  : isLike
                  ? '#F43F5E'
                  : '#C084FC';
                const iconBg = isDownload
                  ? 'rgba(16, 185, 129, 0.18)'
                  : isLike
                  ? 'rgba(244, 63, 94, 0.18)'
                  : 'rgba(192, 132, 252, 0.18)';

                const imageSource = typeof notif.songImage === 'string'
                  ? { uri: notif.songImage }
                  : notif.songImage?.uri
                  ? { uri: notif.songImage.uri }
                  : notif.songImage;

                return (
                  <TouchableOpacity
                    key={notif.id}
                    style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
                    activeOpacity={0.8}
                    onPress={() => handlePlaySong(notif)}
                  >
                    {/* Left: Song Artwork or Fallback Icon */}
                    <View style={styles.cardImageWrapper}>
                      {imageSource ? (
                        <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.cardFallback, { backgroundColor: iconBg }]}>
                          <Ionicons name={iconName} size={20} color={iconColor} />
                        </View>
                      )}
                      <View style={[styles.cardTypeBadge, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName} size={11} color={iconColor} />
                      </View>
                    </View>

                    {/* Middle: Title, Message & Timestamp */}
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>
                          {notif.title && typeof notif.title === 'string' && notif.title.trim()
                            ? notif.title
                            : isDownload
                            ? 'Song Downloaded'
                            : isLike
                            ? 'Song Liked'
                            : 'Pulse Notification'}
                        </Text>
                        <Text style={styles.cardTime}>{formatTimestamp(notif.timestamp)}</Text>
                      </View>
                      <Text numberOfLines={2} style={styles.cardMessage}>
                        {notif.message && typeof notif.message === 'string' && notif.message.trim()
                          ? notif.message
                          : notif.songName
                          ? `Track "${notif.songName}" updated in your library.`
                          : isDownload
                          ? 'Available for 100% offline playback.'
                          : isLike
                          ? 'Added to your Liked Songs.'
                          : 'Activity update in your music library.'}
                      </Text>
                      {notif.songName ? (
                        <Text numberOfLines={1} style={styles.cardSongName}>
                          🎵 {notif.songName}
                        </Text>
                      ) : null}
                    </View>

                    {/* Right: Quick Play and Dismiss Action */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.cardPlayBtn}
                        onPress={() => handlePlaySong(notif)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Play song"
                      >
                        <Ionicons name="play" size={14} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cardRemoveBtn}
                        onPress={() => removeNotification(notif.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Delete notification"
                      >
                        <Ionicons name="close" size={14} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#080A18',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.22)',
    overflow: 'hidden',
    paddingBottom: 20,
  },
  topAccentBar: {
    height: 3,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0F121E',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderColor: '#7C3AED',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollArea: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1326',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  notifCardUnread: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  cardImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 8,
    position: 'relative',
    marginRight: 12,
  },
  cardImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  cardFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTypeBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0F121E',
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardTime: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
  },
  cardMessage: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
  },
  cardSongName: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  cardActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  cardPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

