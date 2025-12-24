import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { store } from '../store';
import { checkIn } from '../store/slices/attendanceSlice';
import { setLastCheckInAttempt } from '../store/slices/autoCheckInSlice';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_TASK_NAME = 'geofence-task';

// Calculate distance between two coordinates (Haversine formula)
function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const state = store.getState();
    const { settings } = state.autoCheckIn;
    const { hasCheckedIn, hasCheckedOut } = state.attendance;

    // Only proceed if auto check-in is enabled and user hasn't checked in yet
    if (!settings.enabled || hasCheckedIn || hasCheckedOut) {
      return;
    }

    const currentLocation = locations[0];
    const officeLocation = settings.officeLocation;

    if (officeLocation && currentLocation) {
      const distance = getDistance(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        officeLocation.latitude,
        officeLocation.longitude
      );

      // Check if user is within office radius
      if (distance <= officeLocation.radius) {
        console.log('User entered office area, attempting auto check-in');
        
        try {
          // Attempt auto check-in
          await store.dispatch(checkIn({
            location: {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            },
          })).unwrap();

          store.dispatch(setLastCheckInAttempt(new Date().toISOString()));

          // Send notification
          if (settings.notificationsEnabled) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '✅ Auto Check-In Successful',
                body: 'You have been automatically checked in!',
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null,
            });
          }
        } catch (error) {
          console.error('Auto check-in failed:', error);
          
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
  }
});

// Define geofence task
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }

  if (data) {
    const { eventType, region } = data;
    const state = store.getState();
    const { settings } = state.autoCheckIn;

    if (eventType === Location.GeofencingEventType.Enter) {
      console.log('Entered geofence region:', region.identifier);
      
      // User entered office area
      const { hasCheckedIn, hasCheckedOut } = state.attendance;
      
      if (settings.enabled && !hasCheckedIn && !hasCheckedOut) {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          await store.dispatch(checkIn({
            location: {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            },
          })).unwrap();

          store.dispatch(setLastCheckInAttempt(new Date().toISOString()));

          if (settings.notificationsEnabled) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '✅ Auto Check-In Successful',
                body: 'Welcome to the office!',
                sound: true,
              },
              trigger: null,
            });
          }
        } catch (error) {
          console.error('Geofence check-in failed:', error);
        }
      }
    } else if (eventType === Location.GeofencingEventType.Exit) {
      console.log('Exited geofence region:', region.identifier);
      
      // Handle auto check-out if enabled
      if (settings.autoCheckOutEnabled) {
        // Add auto check-out logic here
      }
    }
  }
});

export const locationService = {
  // Request location permissions (foreground only)
  async requestPermissions(): Promise<{ granted: boolean; needsSettings: boolean }> {
    try {
      console.log('Requesting foreground location permission...');
      // Always try to request permission (even if previously denied, user might have changed settings)
      const foregroundResult = await Location.requestForegroundPermissionsAsync();
      const foregroundStatus = foregroundResult.status;
      console.log('Permission request result:', foregroundStatus);
      
      return { 
        granted: foregroundStatus === 'granted', 
        needsSettings: foregroundStatus === 'denied' 
      };
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return { granted: false, needsSettings: false };
    }
  },

  // Check if location permissions are granted (foreground only)
  async hasPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      return foregroundStatus === 'granted';
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  },

  // Get permission status
  async getPermissionStatus(): Promise<string> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error getting permission status:', error);
      return 'undetermined';
    }
  },

  // Start location monitoring
  async startMonitoring(): Promise<boolean> {
    try {
      const hasPermissions = await this.hasPermissions();
      if (!hasPermissions) {
        console.log('Location permissions not granted');
        return false;
      }

      const state = store.getState();
      const { officeLocation } = state.autoCheckIn.settings;

      if (!officeLocation) {
        console.log('Office location not set');
        return false;
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5 * 60 * 1000, // 5 minutes
        distanceInterval: 100, // 100 meters
        foregroundService: {
          notificationTitle: 'Attendance Tracking',
          notificationBody: 'Monitoring your location for automatic check-in',
          notificationColor: '#3B82F6',
        },
      });

      // Start geofencing
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
        {
          identifier: 'office',
          latitude: officeLocation.latitude,
          longitude: officeLocation.longitude,
          radius: officeLocation.radius,
          notifyOnEnter: true,
          notifyOnExit: true,
        },
      ]);

      console.log('Location monitoring started');
      return true;
    } catch (error) {
      console.error('Error starting location monitoring:', error);
      return false;
    }
  },

  // Stop location monitoring
  async stopMonitoring(): Promise<void> {
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (isTaskDefined) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      const isGeofenceDefined = await TaskManager.isTaskDefined(GEOFENCE_TASK_NAME);
      if (isGeofenceDefined) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      }

      console.log('Location monitoring stopped');
    } catch (error) {
      console.error('Error stopping location monitoring:', error);
    }
  },

  // Check if monitoring is active
  async isMonitoring(): Promise<boolean> {
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (!isTaskDefined) {
        return false;
      }

      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      return isRegistered;
    } catch (error) {
      console.error('Error checking monitoring status:', error);
      return false;
    }
  },

  // Get current location
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermissions = await this.hasPermissions();
      if (!hasPermissions) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  },

  // Set office location
  async setOfficeLocation(latitude: number, longitude: number, radius: number): Promise<void> {
    // This will be handled by Redux, just a helper to restart monitoring if needed
    const isCurrentlyMonitoring = await this.isMonitoring();
    if (isCurrentlyMonitoring) {
      await this.stopMonitoring();
      await this.startMonitoring();
    }
  },
};



