import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Instantly dismiss default white splash screen so custom dark animation shows directly
try {
  ExpoSplashScreen.hideAsync().catch(() => {});
} catch (_) {}
import { PlayerProvider, usePlayer } from './src/context/PlayerContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SplashScreen } from './src/components/SplashScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingSurveyScreen } from './src/screens/OnboardingSurveyScreen';
import { HomeView } from './src/views/HomeView';
import { SearchView } from './src/views/SearchView';
import { LibraryView } from './src/views/LibraryView';
import { DownloadsView } from './src/views/DownloadsView';
import { MiniPlayer } from './src/components/MiniPlayer';
import { BottomNav } from './src/components/BottomNav';
import { FullPlayerModal } from './src/components/FullPlayerModal';
import { AlbumModal } from './src/components/AlbumModal';
import { ProfileModal } from './src/components/ProfileModal';
import { AddToPlaylistModal } from './src/components/AddToPlaylistModal';
import { PlaylistModal } from './src/components/PlaylistModal';
import { EqualizerModal } from './src/components/EqualizerModal';
import { NotificationModal } from './src/components/NotificationModal';
import { InAppNotificationBanner } from './src/components/InAppNotificationBanner';
import { PulseFindBubble } from './src/components/PulseFindBubble';
import { PulseFindModal } from './src/components/PulseFindModal';
import { YouTubeStreamModal } from './src/components/YouTubeStreamModal';
import { ActivityIndicator } from 'react-native';

function MainAppContent() {
  const { activeTab } = usePlayer();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#060712" />
      <View style={styles.container}>
        {/* Main Content Area */}
        <View style={styles.content}>
          {activeTab === 'home' && <HomeView />}
          {activeTab === 'search' && <SearchView />}
          {activeTab === 'library' && <LibraryView />}
          {activeTab === 'downloads' && <DownloadsView />}
        </View>

        {/* Real-time Floating In-App Banner */}
        <InAppNotificationBanner />

        {/* Floating Mini Player */}
        <MiniPlayer />

        {/* Floating Draggable PULSE FIND Microphone Bubble */}
        <PulseFindBubble />

        {/* Persistent Bottom Tab Bar */}
        <BottomNav />

        {/* Overlay Modals */}
        <AlbumModal />
        <ProfileModal />
        <AddToPlaylistModal />
        <PlaylistModal />
        <EqualizerModal />
        <NotificationModal />
        <FullPlayerModal />
        <PulseFindModal />
        <YouTubeStreamModal />
      </View>
    </SafeAreaView>
  );
}

function RootNavigator() {
  const { currentUser, isLoadingAuth } = useAuth();
  const [isSplashActive, setIsSplashActive] = useState(true);

  // 1. Splash Screen
  if (isSplashActive) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" backgroundColor="#060712" />
        <SplashScreen onFinish={() => setIsSplashActive(false)} />
      </View>
    );
  }

  // 2. Loading Auth State from AsyncStorage
  if (isLoadingAuth) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" backgroundColor="#060712" />
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  // 3. Not Logged In -> Show Professional Auth Screen (Login / Register / Forgot Password)
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.authSafeArea}>
        <StatusBar style="light" backgroundColor="#060712" />
        <AuthScreen />
      </SafeAreaView>
    );
  }

  // 4. Logged In for the First Time -> Show Onboarding Survey with Celebratory Stamp
  if (!currentUser.hasCompletedOnboarding) {
    return (
      <SafeAreaView style={styles.authSafeArea}>
        <StatusBar style="light" backgroundColor="#060712" />
        <OnboardingSurveyScreen />
      </SafeAreaView>
    );
  }

  // 5. Authenticated & Onboarded -> Full App Experience
  return (
    <PlayerProvider>
      <MainAppContent />
    </PlayerProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#060712',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#060712',
  },
  content: {
    flex: 1,
  },
  authSafeArea: {
    flex: 1,
    backgroundColor: '#060712',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#060712',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
