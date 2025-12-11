import { useEffect, useState, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
} from '@expo-google-fonts/sora';
import 'react-native-reanimated';

import { store } from '../src/store';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import { loadStoredAuth } from '../src/store/slices/authSlice';
import { loadAutoCheckInSettings, setMonitoringStatus } from '../src/store/slices/autoCheckInSlice';
import { toastConfig } from '../src/components/CustomToast';
import { locationService } from '../src/services/locationService';
import { wifiService } from '../src/services/wifiService';
import AnimatedSplashScreen from '../src/components/AnimatedSplashScreen';
import { useAuthMonitor } from '../src/hooks/useAuthMonitor';
import { NotificationProvider } from '@/context/NotificationContext';
import ConfirmModal from '../src/components/common/ConfirmModal';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const { settings } = useAppSelector((state) => state.autoCheckIn);
  const [isMounted, setIsMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  // Monitor authentication and handle automatic token refresh
  const { showSessionExpiredModal, setShowSessionExpiredModal, handleSessionExpiredConfirm } = useAuthMonitor();

  const [fontsLoaded] = useFonts({
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
  });

  useEffect(() => {
    dispatch(loadStoredAuth());
    dispatch(loadAutoCheckInSettings());
    setIsMounted(true);

    // Setup notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!isMounted || isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to tabs if authenticated
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading, isMounted, fontsLoaded]);

  // Initialize auto check-in monitoring when authenticated
  useEffect(() => {
    if (!isAuthenticated || !settings.enabled) return;

    const initializeMonitoring = async () => {
      try {
        console.log('Initializing auto check-in monitoring...');
        
        // Start location monitoring if configured
        if (settings.officeLocation) {
          const started = await locationService.startMonitoring();
          if (started) {
            dispatch(setMonitoringStatus(true));
            console.log('Location monitoring started');
          }
        }

        // Start WiFi monitoring if enabled
        if (settings.officeWiFi?.enabled) {
          const wifiStarted = await wifiService.startMonitoring();
          console.log('WiFi monitoring started:', wifiStarted);
        }
      } catch (error) {
        console.error('Error initializing monitoring:', error);
      }
    };

    initializeMonitoring();

    return () => {
      // Cleanup when app closes or user logs out
      locationService.stopMonitoring();
      wifiService.stopMonitoring();
    };
  }, [isAuthenticated, settings.enabled]);

  if (!fontsLoaded) {
    return null;
  }

  const handleSplashAnimationEnd = () => {
    setShowSplash(false);
  };

  return (
    <View style={styles.container}>
      {showSplash && fontsLoaded && (
        <AnimatedSplashScreen onAnimationEnd={handleSplashAnimationEnd} />
      )}
      <Slot />
      <StatusBar style="light" />
      <Toast config={toastConfig} />
      <ConfirmModal
        visible={showSessionExpiredModal}
        title="Session Expired"
        description="Your session has expired. Please log in again."
        onCancel={handleSessionExpiredConfirm}
        onOkClick={handleSessionExpiredConfirm}
        okClickLabel="ok"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NotificationProvider>
      <Provider store={store}>
        <RootLayoutNav />
      </Provider>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}
