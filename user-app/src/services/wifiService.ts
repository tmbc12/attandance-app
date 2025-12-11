import { Platform } from 'react-native';
import * as Network from 'expo-network';
import * as Notifications from 'expo-notifications';
import { store } from '../store';
import { checkIn } from '../store/slices/attendanceSlice';
import { setLastCheckInAttempt } from '../store/slices/autoCheckInSlice';

let wifiCheckInterval: NodeJS.Timeout | null = null;
let lastKnownSsid: string | null = null;

export const wifiService = {
  // Get current WiFi SSID
  async getCurrentWiFiSSID(): Promise<string | null> {
    try {
      // Note: Getting WiFi SSID requires native modules
      // For iOS, you need location permissions and WiFi entitlement
      // For Android, you need location permissions
      
      const networkState = await Network.getNetworkStateAsync();
      
      if (networkState.type === Network.NetworkStateType.WIFI) {
        // On real devices with proper permissions, this would return the SSID
        // For development, we'll use a placeholder
        console.log('Connected to WiFi');
        
        // In production, you would use a native module to get actual SSID
        // For now, we'll return a mock value if on WiFi
        return 'WIFI_NETWORK'; // Placeholder - would be actual SSID in production
      }
      
      return null;
    } catch (error) {
      console.error('Error getting WiFi SSID:', error);
      return null;
    }
  },

  // Check if connected to office WiFi
  async isConnectedToOfficeWiFi(): Promise<boolean> {
    try {
      const state = store.getState();
      const { officeWiFi } = state.autoCheckIn.settings;

      if (!officeWiFi || !officeWiFi.enabled) {
        return false;
      }

      const currentSsid = await this.getCurrentWiFiSSID();
      
      if (!currentSsid) {
        return false;
      }

      // Case-insensitive comparison
      return currentSsid.toLowerCase() === officeWiFi.ssid.toLowerCase();
    } catch (error) {
      console.error('Error checking office WiFi:', error);
      return false;
    }
  },

  // Handle WiFi connection change
  async handleWiFiChange(ssid: string | null): Promise<void> {
    try {
      const state = store.getState();
      const { settings } = state.autoCheckIn;
      const { hasCheckedIn, hasCheckedOut } = state.attendance;

      // Only proceed if auto check-in is enabled
      if (!settings.enabled || hasCheckedIn || hasCheckedOut) {
        return;
      }

      // Check if connected to office WiFi
      if (settings.officeWiFi && settings.officeWiFi.enabled && ssid) {
        if (ssid.toLowerCase() === settings.officeWiFi.ssid.toLowerCase()) {
          console.log('Connected to office WiFi, attempting auto check-in');

          try {
            // Get current location
            const location = await this.getCurrentLocation();

            // Attempt auto check-in
            await store.dispatch(checkIn({
              location: location ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              } : undefined,
            })).unwrap();

            store.dispatch(setLastCheckInAttempt(new Date().toISOString()));

            // Send success notification
            if (settings.notificationsEnabled) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: '✅ Auto Check-In Successful',
                  body: 'You have been checked in via office WiFi!',
                  sound: true,
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: null,
              });
            }
          } catch (error) {
            console.error('WiFi auto check-in failed:', error);

            // Send failure notification
            if (settings.notificationsEnabled) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: '❌ Auto Check-In Failed',
                  body: 'Please check in manually.',
                  sound: true,
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: null,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling WiFi change:', error);
    }
  },

  // Start WiFi monitoring
  async startMonitoring(): Promise<boolean> {
    try {
      const state = store.getState();
      const { officeWiFi } = state.autoCheckIn.settings;

      if (!officeWiFi || !officeWiFi.enabled) {
        console.log('Office WiFi not configured');
        return false;
      }

      // Stop existing monitoring if any
      this.stopMonitoring();

      // Check WiFi status every 30 seconds
      wifiCheckInterval = setInterval(async () => {
        try {
          const currentSsid = await this.getCurrentWiFiSSID();

          // Check if SSID changed
          if (currentSsid !== lastKnownSsid) {
            console.log('WiFi SSID changed:', currentSsid);
            lastKnownSsid = currentSsid;

            // Handle WiFi change
            await this.handleWiFiChange(currentSsid);
          }
        } catch (error) {
          console.error('Error in WiFi check interval:', error);
        }
      }, 30000); // Check every 30 seconds

      // Do initial check
      const initialSsid = await this.getCurrentWiFiSSID();
      lastKnownSsid = initialSsid;
      await this.handleWiFiChange(initialSsid);

      console.log('WiFi monitoring started');
      return true;
    } catch (error) {
      console.error('Error starting WiFi monitoring:', error);
      return false;
    }
  },

  // Stop WiFi monitoring
  stopMonitoring(): void {
    if (wifiCheckInterval) {
      clearInterval(wifiCheckInterval);
      wifiCheckInterval = null;
      lastKnownSsid = null;
      console.log('WiFi monitoring stopped');
    }
  },

  // Check if monitoring is active
  isMonitoring(): boolean {
    return wifiCheckInterval !== null;
  },

  // Get current location (helper method)
  async getCurrentLocation(): Promise<any> {
    try {
      // Use Location service if available
      const { locationService } = require('./locationService');
      return await locationService.getCurrentLocation();
    } catch (error) {
      console.error('Error getting location for WiFi check-in:', error);
      return null;
    }
  },

  // Test WiFi connectivity
  async testWiFiConnection(): Promise<{
    connected: boolean;
    ssid: string | null;
    isOfficeWiFi: boolean;
  }> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const ssid = await this.getCurrentWiFiSSID();
      const isOfficeWiFi = await this.isConnectedToOfficeWiFi();

      return {
        connected: networkState.type === Network.NetworkStateType.WIFI,
        ssid,
        isOfficeWiFi,
      };
    } catch (error) {
      console.error('Error testing WiFi connection:', error);
      return {
        connected: false,
        ssid: null,
        isOfficeWiFi: false,
      };
    }
  },
};



