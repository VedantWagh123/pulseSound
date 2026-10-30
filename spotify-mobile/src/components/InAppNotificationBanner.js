import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

export const InAppNotificationBanner = () => {
  const { inAppToast, dismissInAppToast, setIsNotificationModalOpen } = usePlayer();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (inAppToast) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [inAppToast]);

  if (!inAppToast) return null;

  const isDownload = inAppToast.type === 'download';
  const isLike = inAppToast.type === 'like';

  const iconName = isDownload ? 'arrow-down-circle' : isLike ? 'heart' : 'notifications';
  const accentColor = isDownload ? '#10B981' : isLike ? '#F43F5E' : '#38BDF8';
  const badgeText = isDownload ? 'DOWNLOAD COMPLETE' : isLike ? 'SONG ADDED' : 'NOTIFICATION';

  const imageSource = typeof inAppToast.songImage === 'string'
    ? { uri: inAppToast.songImage }
    : inAppToast.songImage?.uri
    ? { uri: inAppToast.songImage.uri }
    : inAppToast.songImage;

  const handleBannerPress = () => {
    dismissInAppToast();
    setIsNotificationModalOpen(true);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.bannerCard, { borderColor: accentColor }]}
        activeOpacity={0.9}
        onPress={handleBannerPress}
      >
        {/* Left: Song Art or Icon */}
        <View style={styles.imageWrap}>
          {imageSource ? (
            <Image source={imageSource} style={styles.songImage} resizeMode="cover" />
          ) : (
            <View style={[styles.iconWrap, { backgroundColor: `${accentColor}25` }]}>
              <Ionicons name={iconName} size={20} color={accentColor} />
            </View>
          )}
          <View style={[styles.iconBadge, { backgroundColor: accentColor }]}>
            <Ionicons name={iconName} size={10} color="#FFFFFF" />
          </View>
        </View>

        {/* Center: Details */}
        <View style={styles.textWrap}>
          <View style={styles.topRow}>
            <Text style={[styles.badgeText, { color: accentColor }]}>{badgeText}</Text>
            <Text style={styles.timeText}>Just now</Text>
          </View>
          <Text numberOfLines={1} style={styles.titleText}>
            {inAppToast.songName || inAppToast.title || 'PULSE SOUND'}
          </Text>
          <Text numberOfLines={1} style={styles.descText}>
            {inAppToast.message || 'New update available in your library.'}
          </Text>
        </View>

        {/* Right: Dismiss button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={dismissInAppToast}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Dismiss notification"
        >
          <Ionicons name="close" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 14,
    right: 14,
    zIndex: 99999,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 18, 30, 0.96)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
  imageWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    position: 'relative',
    marginRight: 11,
  },
  songImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0F121E',
  },
  textWrap: {
    flex: 1,
    marginRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  descText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

