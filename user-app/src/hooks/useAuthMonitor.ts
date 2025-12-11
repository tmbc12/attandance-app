import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { eventEmitter } from '../utils/eventEmitter';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tmbc-attendance-app.vercel.app';
const REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000; // Refresh every 7 days (well before 30-day expiry)

/**
 * Hook to monitor authentication status and automatically refresh tokens
 * Prevents session expiration by proactively refreshing tokens
 */
export const useAuthMonitor = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isAuthenticated, token } = useAppSelector((state) => state.auth);
  const refreshTimerRef = useRef<number | null>(null);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  const handleLogout = useCallback(async () => {
    await dispatch(logout());
    router.replace('/(auth)/login');
  }, [dispatch, router]);

  // Listen for session expiration events from API interceptor
  useEffect(() => {
    const handleSessionExpired = async () => {
      console.log('⚠️ Session expired event received');
      setShowSessionExpiredModal(true);
    };

    // Add event listener for session expiration
    eventEmitter.on('auth:session-expired', handleSessionExpired);

    return () => {
      eventEmitter.off('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const handleSessionExpiredConfirm = useCallback(async () => {
    setShowSessionExpiredModal(false);
    await handleLogout();
  }, [handleLogout]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Clear any existing refresh timer
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    // Function to refresh token proactively
    const refreshToken = async () => {
      try {
        console.log('🔄 Proactively refreshing authentication token...');

        const currentToken = await AsyncStorage.getItem('authToken');
        if (!currentToken) {
          console.log('⚠️ No token found, logging out...');
          await handleLogout();
          return;
        }

        const response = await axios.post(
          `${API_URL}/api/auth/refresh-token`,
          {},
          {
            headers: { Authorization: `Bearer ${currentToken}` }
          }
        );

        const newToken = response.data.token;
        await AsyncStorage.setItem('authToken', newToken);

        console.log('✅ Token refreshed successfully');
      } catch (error: any) {
        console.error('❌ Token refresh failed:', error.response?.data || error.message);

        // If refresh fails with 401, logout the user
        if (error.response?.status === 401) {
          console.log('⚠️ Session expired, logging out...');
          await handleLogout();
        }
      }
    };

    // Initial check and refresh
    refreshToken();

    // Set up periodic refresh
    refreshTimerRef.current = setInterval(() => {
      refreshToken();
    }, REFRESH_INTERVAL);

    // Cleanup function
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated, token, handleLogout]);

  return { 
    handleLogout,
    showSessionExpiredModal,
    setShowSessionExpiredModal,
    handleSessionExpiredConfirm,
  };
};
