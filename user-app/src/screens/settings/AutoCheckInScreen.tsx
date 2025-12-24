import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  updateSettings,
  setMonitoringStatus,
} from '../../store/slices/autoCheckInSlice';
import { locationService } from '../../services/locationService';
import { wifiService } from '../../services/wifiService';
import apiClient from '../../api/client';

export default function AutoCheckInScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isMonitoring, settings } = useAppSelector((state) => state.autoCheckIn);
  
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  const [autoCheckInEnabled, setAutoCheckInEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Organization settings from admin (read-only)
  const [organizationSettings, setOrganizationSettings] = useState<any>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    loadOrganizationSettings();
    checkPermissions();
  }, []);

  // Load current auto check-in settings from Redux store
  useEffect(() => {
    if (settings) {
      setAutoCheckInEnabled(settings.enabled);
      setNotificationsEnabled(settings.notificationsEnabled);
    }
  }, [settings]);

  const loadOrganizationSettings = async () => {
    try {
      setFetchingSettings(true);
      console.log('Loading organization settings...');
      
      // Check if user is logged in
      const token = await AsyncStorage.getItem('authToken');
      console.log('Auth token exists:', !!token);
      
      const response = await apiClient.get('/api/attendance/organization-settings');
      console.log('Organization settings loaded:', response.data);
      setOrganizationSettings(response.data);
      
      // Update Redux with organization settings
      dispatch(updateSettings({
        enabled: autoCheckInEnabled,
        officeLocation: response.data.companyLocation?.enabled ? {
          latitude: response.data.companyLocation.latitude,
          longitude: response.data.companyLocation.longitude,
          radius: response.data.companyLocation.radius,
        } : null,
        officeWiFi: response.data.companyWifi?.enabled ? {
          ssid: response.data.companyWifi.networks[0]?.ssid || '',
          enabled: true,
        } : null,
        notificationsEnabled,
        autoCheckOutEnabled: false,
      }));
    } catch (error: any) {
      console.error('Failed to load organization settings:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Handle token expiration
      if (error.response?.status === 401 && error.response?.data?.message === 'Token is not valid') {
        setModalTitle('Session Expired');
        setModalMessage('Your login session has expired. Please log in again.');
        setModalAction(() => () => {
          setShowModal(false);
          AsyncStorage.removeItem('authToken');
          AsyncStorage.removeItem('userData');
          router.replace('/(auth)/login');
        });
        setShowModal(true);
      } else {
        setModalTitle('Error');
        setModalMessage('Failed to load office settings. Please try again.');
        setModalAction(null);
        setShowModal(true);
      }
    } finally {
      setFetchingSettings(false);
    }
  };

  const checkPermissions = async () => {
    const hasPermissions = await locationService.hasPermissions();
    setLocationPermission(hasPermissions);
  };

  const handleRequestPermissions = async () => {
    setIsLoading(true);
    try {
      // First check current permission status
      const statusCheck = await locationService.getPermissionStatus();
      
      // If permission is already denied, open settings directly
      if (statusCheck === 'denied') {
        setIsLoading(false);
        setModalTitle('Permission Required');
        setModalMessage('Location permission is required for auto check-in. Please enable it in your device settings.');
        setModalAction(() => async () => {
          setShowModal(false);
          // Open device settings
          if (Platform.OS === 'ios') {
            await Linking.openURL('app-settings:');
          } else {
            await Linking.openSettings();
          }
        });
        setShowModal(true);
        return;
      }
      
      // If permission is undetermined, request it (will show system dialog)
      console.log('Starting permission request...');
      const result = await locationService.requestPermissions();
      console.log('Permission request result:', result);
      setLocationPermission(result.granted);
      
      // If still denied after request, open settings
      if (!result.granted && result.needsSettings) {
        setModalTitle('Permission Required');
        setModalMessage('Location permission is required for auto check-in. Please enable it in your device settings.');
        setModalAction(() => async () => {
          setShowModal(false);
          // Open device settings
          if (Platform.OS === 'ios') {
            await Linking.openURL('app-settings:');
          } else {
            await Linking.openSettings();
          }
        });
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoCheckIn = async (value: boolean) => {
    if (value && !locationPermission) {
      setModalTitle('Location Access Required');
      setModalMessage('We request location access only to verify your presence at the office for automatic check-in and check-out. \nYour location is not tracked continuously and is used only at work start times.');
      setModalAction(null);
      setShowModal(true);
      return;
    }

    if (value && !organizationSettings?.companyLocation?.enabled && !organizationSettings?.companyWifi?.enabled) {
      setModalTitle('Not Configured');
      setModalMessage('Auto check-in is not configured by your administrator. Please contact your admin to set up office location or WiFi settings.');
      setModalAction(null);
      setShowModal(true);
      return;
    }

    setAutoCheckInEnabled(value);

    // Update Redux settings
    const updatedSettings = {
      enabled: value,
      officeLocation: organizationSettings?.companyLocation?.enabled ? {
        latitude: organizationSettings.companyLocation.latitude,
        longitude: organizationSettings.companyLocation.longitude,
        radius: organizationSettings.companyLocation.radius,
      } : null,
      officeWiFi: organizationSettings?.companyWifi?.enabled ? {
        ssid: organizationSettings.companyWifi.networks[0]?.ssid || '',
        enabled: true,
      } : null,
      notificationsEnabled,
      autoCheckOutEnabled: false,
    };

    dispatch(updateSettings(updatedSettings));

    // Save settings to AsyncStorage
    try {
      await AsyncStorage.setItem('autoCheckInSettings', JSON.stringify(updatedSettings));
      console.log('Auto check-in settings saved to storage');
    } catch (error) {
      console.error('Failed to save auto check-in settings:', error);
    }

    if (value) {
      // Start monitoring
      const started = await locationService.startMonitoring();
      if (started) {
        dispatch(setMonitoringStatus(true));
        
        // Start WiFi monitoring if enabled
        if (organizationSettings?.companyWifi?.enabled) {
          await wifiService.startMonitoring();
        }
      }
    } else {
      // Stop monitoring
      await locationService.stopMonitoring();
      wifiService.stopMonitoring();
      dispatch(setMonitoringStatus(false));
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    
    const updatedSettings = {
      enabled: autoCheckInEnabled,
      officeLocation: organizationSettings?.companyLocation?.enabled ? {
        latitude: organizationSettings.companyLocation.latitude,
        longitude: organizationSettings.companyLocation.longitude,
        radius: organizationSettings.companyLocation.radius,
      } : null,
      officeWiFi: organizationSettings?.companyWifi?.enabled ? {
        ssid: organizationSettings.companyWifi.networks[0]?.ssid || '',
        enabled: true,
      } : null,
      notificationsEnabled: value,
      autoCheckOutEnabled: false,
    };
    
    dispatch(updateSettings(updatedSettings));

    // Save settings to AsyncStorage
    try {
      await AsyncStorage.setItem('autoCheckInSettings', JSON.stringify(updatedSettings));
      console.log('Auto check-in settings saved to storage');
    } catch (error) {
      console.error('Failed to save auto check-in settings:', error);
    }
  };

  if (fetchingSettings) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  const hasLocationEnabled = organizationSettings?.companyLocation?.enabled;
  const hasWifiEnabled = organizationSettings?.companyWifi?.enabled;
  const hasAnyMethodEnabled = hasLocationEnabled || hasWifiEnabled;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#F97316', '#EF4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Auto Check-In</Text>
            <Text style={styles.subtitle}>Automatic attendance when you arrive</Text>
          </SafeAreaView>
        </LinearGradient>

        {/* Configuration Status */}
        {!hasAnyMethodEnabled && (
          <View style={styles.section}>
            <View style={styles.warningCard}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Not Configured</Text>
                <Text style={styles.warningText}>
                  Auto check-in has not been configured by your administrator. Please contact your admin to set up office location or WiFi settings.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Enable Auto Check-In */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enable Auto Check-In</Text>
          <View style={styles.actionCard}>
            <View style={styles.actionButton}>
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonText}>Auto Check-In</Text>
                <Text style={styles.actionButtonSubtext}>
                  Automatically check in when you arrive at the office
                </Text>
              </View>
              <Switch
                value={autoCheckInEnabled}
                onValueChange={handleToggleAutoCheckIn}
                trackColor={{ false: '#2C2C2C', true: '#4ADE80' }}
                thumbColor={autoCheckInEnabled ? '#A3E635' : '#9CA3AF'}
                disabled={!hasAnyMethodEnabled}
                ios_backgroundColor="#2C2C2C"
              />
            </View>
            {isMonitoring && (
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Monitoring Active</Text>
              </View>
            )}
          </View>
        </View>

        {/* Location Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Permissions</Text>
          <View style={styles.infoCard}>
            <Text style={styles.sectionDescription}>
            We collect your location only to verify office presence for auto check-in and check-out.
            </Text>
            <Text style={styles.sectionDescription}>
            Location is not tracked continuously and is accessed only during work start times.
            </Text>
            {locationPermission ? (
              <View style={styles.permissionGranted}>
                <Text style={styles.permissionText}>✓ Location permissions granted</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.button}
                onPress={handleRequestPermissions}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Grant Permissions</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Office Location (Read-Only) */}
        {hasLocationEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Office Location</Text>
            <View style={styles.infoCard}>
              <Text style={styles.sectionDescription}>
                Configured by your administrator
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Latitude</Text>
                <Text style={styles.infoValue}>
                  {organizationSettings.companyLocation.latitude?.toFixed(6) || 'Not set'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Longitude</Text>
                <Text style={styles.infoValue}>
                  {organizationSettings.companyLocation.longitude?.toFixed(6) || 'Not set'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Detection Radius</Text>
                <Text style={styles.infoValue}>
                  {organizationSettings.companyLocation.radius || 200}m
                </Text>
              </View>
              {organizationSettings.companyLocation.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>
                    {organizationSettings.companyLocation.address}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.helpCard}>
              <Text style={styles.helpText}>
                💡 You will be automatically checked in when you arrive within {organizationSettings.companyLocation.radius || 200} meters of the office location.
              </Text>
            </View>
          </View>
        )}

        {/* Office WiFi (Read-Only) */}
        {hasWifiEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Office WiFi</Text>
            <View style={styles.infoCard}>
              <Text style={styles.sectionDescription}>
                Configured by your administrator
              </Text>
              {organizationSettings.companyWifi.networks.map((network: any, index: number) => (
                <View key={index} style={styles.networkItem}>
                  <View style={styles.networkHeader}>
                    <Ionicons name="wifi" size={20} color="#9CA3AF" style={styles.networkIcon} />
                    <View style={styles.networkInfo}>
                      <Text style={styles.networkName}>{network.ssid}</Text>
                      {network.name && (
                        <Text style={styles.networkSubtext}>{network.name}</Text>
                      )}
                      {network.bssid && (
                        <Text style={styles.networkSubtext}>MAC: {network.bssid}</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.helpCard}>
              <Text style={styles.helpText}>
                💡 You will be automatically checked in when you connect to any of the configured office WiFi networks.
              </Text>
            </View>
          </View>
        )}

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.actionCard}>
            <View style={styles.actionButton}>
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonText}>Notifications</Text>
                <Text style={styles.actionButtonSubtext}>
                  Get notified when automatic check-in occurs
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#2C2C2C', true: '#4ADE80' }}
                thumbColor={notificationsEnabled ? '#A3E635' : '#9CA3AF'}
                ios_backgroundColor="#2C2C2C"
              />
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsList}>
            {hasLocationEnabled && (
              <View style={styles.stepItem}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <Text style={styles.stepText}>
                  When you arrive at the office, your device detects the location
                </Text>
              </View>
            )}
            {hasWifiEnabled && (
              <View style={styles.stepItem}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>{hasLocationEnabled ? '2' : '1'}</Text>
                </View>
                <Text style={styles.stepText}>
                  When you connect to office WiFi, your device detects the network
                </Text>
              </View>
            )}
            <View style={styles.stepItem}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>{hasLocationEnabled && hasWifiEnabled ? '3' : '2'}</Text>
              </View>
              <Text style={styles.stepText}>
                You're automatically checked in without any action needed
              </Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>{hasLocationEnabled && hasWifiEnabled ? '4' : '3'}</Text>
              </View>
              <Text style={styles.stepText}>
                You receive a notification confirming your check-in
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Custom Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Text style={styles.modalMessage}>{modalMessage}</Text>
              
              <View style={styles.modalButtonContainer}>
                {modalAction ? (
                  <>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={() => setShowModal(false)}
                    >
                      <Text style={styles.modalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.modalConfirmButton}
                      onPress={modalAction}
                    >
                      <LinearGradient
                        colors={['#EF4444', '#F97316']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.modalConfirmButtonGradient}
                      >
                        <Text style={styles.modalConfirmButtonText}>OK</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={() => setShowModal(false)}
                    >
                      <Text style={styles.modalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.modalConfirmButton}
                      onPress={() => {
                        setShowModal(false);
                        // Request permission after modal closes
                        setTimeout(() => {
                          handleRequestPermissions();
                        }, 300);
                      }}
                    >
                      <LinearGradient
                        colors={['#3B82F6', '#2563EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.modalConfirmButtonGradient}
                      >
                        <Text style={styles.modalConfirmButtonText}>OK</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  header: {
    width: '100%',
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerSafeArea: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#1F1F1F',
    borderColor: '#F59E0B',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#F59E0B',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    lineHeight: 20,
  },
  actionCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 4,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  actionButtonContent: {
    flex: 1,
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#1F3A2F',
    borderRadius: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: '#4ADE80',
  },
  permissionGranted: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1F3A2F',
    borderRadius: 8,
  },
  permissionText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#4ADE80',
  },
  button: {
    marginTop: 12,
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
  infoCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  networkItem: {
    marginBottom: 12,
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkIcon: {
    marginRight: 12,
  },
  networkInfo: {
    flex: 1,
  },
  networkName: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  networkSubtext: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  helpCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
  },
  helpText: {
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    lineHeight: 18,
  },
  stepsList: {
    marginTop: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    fontSize: 12,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalConfirmButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  modalSingleButton: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalSingleButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSingleButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
});
