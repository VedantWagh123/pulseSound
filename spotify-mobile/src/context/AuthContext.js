import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postAuthRequest } from '../config/api';

const AuthContext = createContext();

const STORAGE_KEYS = {
  USER: '@pulse_sound_user',
  TOKEN: '@pulse_sound_token',
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Restore authenticated session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [savedUserJson, savedToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        ]);

        if (savedUserJson && savedToken) {
          const parsedUser = JSON.parse(savedUserJson);
          setCurrentUser(parsedUser);
          setToken(savedToken);
        }
      } catch (err) {
        console.log('Session restore note:', err?.message);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    restoreSession();
  }, []);

  // Persist session to AsyncStorage
  const saveSession = async (user, authToken) => {
    try {
      setCurrentUser(user);
      setToken(authToken);
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, authToken || ''),
      ]);
    } catch (err) {
      console.log('Save session error:', err?.message);
    }
  };

  // Register User
  const register = async (name, email, password) => {
    try {
      const res = await postAuthRequest('/api/user/register', { name, email, password });
      if (res && res.success) {
        await saveSession(res.user, res.token);
        return { success: true, user: res.user };
      }
      return { success: false, message: res?.message || 'Registration failed' };
    } catch (err) {
      return { success: false, message: err?.message || 'Network error during registration' };
    }
  };

  // Login User (Testing Mode: triggers survey on every login)
  const login = async (email, password) => {
    try {
      const res = await postAuthRequest('/api/user/login', { email, password });
      if (res && res.success) {
        // In testing mode: Set hasCompletedOnboarding to false on login so the user can test the survey anytime!
        const userForTesting = {
          ...res.user,
          hasCompletedOnboarding: false,
        };
        await saveSession(userForTesting, res.token);
        return { success: true, user: userForTesting };
      }
      return { success: false, message: res?.message || 'Login failed' };
    } catch (err) {
      return { success: false, message: err?.message || 'Network error during login' };
    }
  };

  // Forgot Password
  const forgotPassword = async (email, newPassword) => {
    try {
      const res = await postAuthRequest('/api/user/forgot-password', { email, newPassword });
      if (res && res.success) {
        return { success: true, message: res.message };
      }
      return { success: false, message: res?.message || 'Password reset failed' };
    } catch (err) {
      return { success: false, message: err?.message || 'Network error during password reset' };
    }
  };

  // Save Survey Preferences (First-time onboarding)
  const saveSurvey = async (surveyData) => {
    try {
      if (!currentUser?.id && !currentUser?._id) {
        return { success: false, message: 'User session not found' };
      }

      const userId = currentUser.id || currentUser._id;
      const res = await postAuthRequest('/api/user/survey', {
        userId,
        ...surveyData,
      });

      if (res && res.success) {
        const updatedUser = {
          ...currentUser,
          ...res.user,
          hasCompletedOnboarding: true,
        };
        await saveSession(updatedUser, token);
        return { success: true, user: updatedUser };
      }

      // If backend fails temporarily, update local state so user can proceed without getting stuck
      const fallbackUser = {
        ...currentUser,
        preferences: {
          ...(currentUser.preferences || {}),
          ...surveyData,
        },
        hasCompletedOnboarding: true,
      };
      await saveSession(fallbackUser, token);
      return { success: true, user: fallbackUser };
    } catch (err) {
      console.log('Survey save error:', err?.message);
      return { success: false, message: err?.message || 'Failed to save survey' };
    }
  };

  // Logout User
  const logout = async () => {
    try {
      setCurrentUser(null);
      setToken(null);
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      ]);
    } catch (err) {
      console.log('Logout error:', err?.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isLoadingAuth,
        isAuthenticated: Boolean(currentUser),
        hasCompletedOnboarding: Boolean(currentUser?.hasCompletedOnboarding),
        register,
        login,
        forgotPassword,
        saveSurvey,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
