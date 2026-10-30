import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

export const BottomNav = () => {
  const { activeTab, setActiveTab, storageStats, downloadedSongs } = usePlayer();

  const offlineCount = storageStats?.count || Object.keys(downloadedSongs || {}).length;

  const tabs = [
    { id: 'home', label: 'Discover', icon: 'flame', iconOutline: 'flame-outline' },
    { id: 'search', label: 'Search', icon: 'search', iconOutline: 'search-outline' },
    { id: 'library', label: 'Library', icon: 'library', iconOutline: 'library-outline' },
    { id: 'downloads', label: 'Offline', icon: 'cloud-done', iconOutline: 'cloud-done-outline', badge: offlineCount > 0 ? offlineCount : null },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Ionicons
                name={isActive ? tab.icon : tab.iconOutline}
                size={22}
                color={isActive ? (tab.id === 'downloads' ? '#10B981' : '#C084FC') : '#64748B'}
              />
              {tab.badge && !isActive && (
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                isActive && (tab.id === 'downloads' ? styles.activeLabelGreen : styles.activeLabel),
              ]}
            >
              {tab.label}
            </Text>
            {isActive && (
              <View
                style={[
                  styles.activeDot,
                  tab.id === 'downloads' && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#070918',
    borderTopWidth: 1,
    borderTopColor: 'rgba(168, 85, 247, 0.22)',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 14,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 64,
    position: 'relative',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#070810',
    fontSize: 9,
    fontWeight: '900',
  },
  label: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  activeLabel: {
    color: '#C084FC',
    fontWeight: '800',
  },
  activeLabelGreen: {
    color: '#34D399',
    fontWeight: '800',
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EC4899',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});
