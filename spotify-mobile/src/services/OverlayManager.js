import { NativeModules, Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PulseOverlayModule } = NativeModules;
const OVERLAY_STORAGE_KEY = '@pulse_find_floating_enabled';

/**
 * Check if the application is currently running in Expo Go
 */
export const isRunningInExpoGo = () => {
  return !PulseOverlayModule && Platform.OS === 'android';
};

/**
 * Check if SYSTEM_ALERT_WINDOW permission is granted
 */
export const canDrawOverlays = async () => {
  if (Platform.OS !== 'android') return false;

  if (PulseOverlayModule?.canDrawOverlays) {
    try {
      return await PulseOverlayModule.canDrawOverlays();
    } catch (_) {
      return false;
    }
  }

  // Fallback for Expo Go or when native module is pending prebuild
  return false;
};

/**
 * Open Android system settings to grant "Display over other apps"
 */
export const requestOverlayPermission = async () => {
  if (Platform.OS !== 'android') return false;

  if (PulseOverlayModule?.openOverlaySettings) {
    try {
      return await PulseOverlayModule.openOverlaySettings();
    } catch (_) {}
  }

  // Standard Android intent fallback via Linking
  try {
    await Linking.openSettings();
    return true;
  } catch (err) {
    console.warn('[OverlayManager] Could not open settings:', err.message);
    return false;
  }
};

/**
 * Start the system-wide floating overlay service (visible over Instagram, Reels, TikTok)
 */
export const startSystemOverlay = async () => {
  if (Platform.OS !== 'android') return { success: false, reason: 'unsupported_platform' };

  if (PulseOverlayModule?.startOverlayService) {
    try {
      const hasPermission = await PulseOverlayModule.canDrawOverlays();
      if (!hasPermission) {
        return { success: false, reason: 'permission_required' };
      }
      await PulseOverlayModule.startOverlayService();
      await AsyncStorage.setItem(OVERLAY_STORAGE_KEY, 'true');
      return { success: true };
    } catch (err) {
      return { success: false, reason: err.message || 'service_start_failed' };
    }
  }

  // If in Expo Go, save preference and inform user
  await AsyncStorage.setItem(OVERLAY_STORAGE_KEY, 'true');
  return {
    success: false,
    reason: 'expo_go_mode',
    message: 'System-wide overlay requires a Custom Expo Development Build (npx expo run:android). In-App floating microphone bubble is active and functional!',
  };
};

/**
 * Stop the system-wide floating overlay service
 */
export const stopSystemOverlay = async () => {
  if (Platform.OS !== 'android') return { success: true };

  try {
    if (PulseOverlayModule?.stopOverlayService) {
      await PulseOverlayModule.stopOverlayService();
    }
    await AsyncStorage.setItem(OVERLAY_STORAGE_KEY, 'false');
    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
};

/**
 * Check if system-wide floating overlay service is currently running
 */
export const isSystemOverlayRunning = async () => {
  if (Platform.OS !== 'android') return false;

  if (PulseOverlayModule?.isOverlayRunning) {
    try {
      return await PulseOverlayModule.isOverlayRunning();
    } catch (_) {
      return false;
    }
  }

  const stored = await AsyncStorage.getItem(OVERLAY_STORAGE_KEY);
  return stored === 'true';
};

