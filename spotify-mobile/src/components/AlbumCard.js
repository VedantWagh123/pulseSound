import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export const AlbumCard = ({ album, onPress, onPlayPress }) => {
  const { width } = useWindowDimensions();
  // Responsive card width bounded gracefully for small screens up to tablets
  const cardWidth = Math.min(Math.max(width * 0.42, 138), 200);
  const imageHeight = cardWidth - 20;

  const imageSource = typeof album?.image === 'string'
    ? { uri: album.image }
    : album?.image?.uri
    ? { uri: album.image.uri }
    : album?.image;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress && onPress(album)}
      style={[styles.card, { width: cardWidth }]}
    >
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(10, 11, 16, 0.8)']}
          style={styles.imageGradient}
        />
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onPlayPress && onPlayPress(album)}
          style={[styles.playButton, { backgroundColor: album.bgColor || '#8B5CF6' }]}
        >
          <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      <Text numberOfLines={1} style={styles.title}>
        {album.name}
      </Text>
      <Text numberOfLines={2} style={styles.desc}>
        {album.desc}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginRight: 14,
    backgroundColor: '#0D1124',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  imageContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  playButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  desc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
});
