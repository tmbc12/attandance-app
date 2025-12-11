'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, Save, MapPin, Wifi, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';

interface NavigatorWithWifi extends Navigator {
  wifi?: {
    requestScan(): Promise<{ getNetworks(): Promise<Array<{ ssid: string; bssid: string; name: string }>> }>;
  };
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectingWifi, setDetectingWifi] = useState(false);
  const [availableNetworks, setAvailableNetworks] = useState<Array<{ ssid: string; bssid: string; name: string }>>([]);
  const [settings, setSettings] = useState({
    workingHours: {
      start: '09:00',
      end: '18:00'
    },
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday
    timezone: 'Asia/Kolkata',
    lateCheckInBuffer: 60, // minutes
    attendanceCloseEnabled: false,
    attendanceCloseTime: '10:00',
    autoCheckInWindow: 90, // minutes
    companyLocation: {
      enabled: false,
      latitude: null,
      longitude: null,
      radius: 200,
      address: ''
    },
    companyWifi: {
      enabled: false,
      networks: [] as Array<{ ssid: string; bssid: string; name: string }>
    }
  });

  // Fetch current settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/api/organization/settings');
        setSettings(response.data);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        toast.error('Failed to load current settings');
      } finally {
        setFetchingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  const weekDays = [
    { id: 0, name: 'Sunday' },
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' }
  ];

  const toggleWorkingDay = (dayId: number) => {
    setSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(dayId)
        ? prev.workingDays.filter(d => d !== dayId)
        : [...prev.workingDays, dayId].sort()
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.put('/api/organization/settings', settings);
      toast.success('Settings saved successfully!');
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to save settings';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Office Location Functions
  const handleLocationToggle = () => {
    setSettings(prev => ({
      ...prev,
      companyLocation: {
        ...prev.companyLocation,
        enabled: !prev.companyLocation.enabled
      }
    }));
  };

  const handleLocationChange = (field: string, value: string | number | null) => {
    setSettings(prev => ({
      ...prev,
      companyLocation: {
        ...prev.companyLocation,
        [field]: value
      }
    }));
  };

  // WiFi Functions
  const handleWifiToggle = () => {
    setSettings(prev => ({
      ...prev,
      companyWifi: {
        ...prev.companyWifi,
        enabled: !prev.companyWifi.enabled
      }
    }));
  };

  const addWifiNetwork = () => {
    setSettings(prev => ({
      ...prev,
      companyWifi: {
        ...prev.companyWifi,
        networks: [...prev.companyWifi.networks, { ssid: '', bssid: '', name: '' }]
      }
    }));
  };

  const removeWifiNetwork = (index: number) => {
    setSettings(prev => ({
      ...prev,
      companyWifi: {
        ...prev.companyWifi,
        networks: prev.companyWifi.networks.filter((_, i) => i !== index)
      }
    }));
  };

  const updateWifiNetwork = (index: number, field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      companyWifi: {
        ...prev.companyWifi,
        networks: prev.companyWifi.networks.map((network, i) => 
          i === index ? { ...network, [field]: value } : network
        )
      }
    }));
  };

  // Auto-Detection Functions
  const detectCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setDetectingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Update location settings
      handleLocationChange('latitude', latitude);
      handleLocationChange('longitude', longitude);
      
      // Suggest optimal radius based on accuracy
      const accuracy = position.coords.accuracy;
      const suggestedRadius = Math.max(100, Math.min(300, Math.round(accuracy * 2)));
      handleLocationChange('radius', suggestedRadius);

      // Try to get address using reverse geocoding
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const data = await response.json();
        if (data.city && data.principalSubdivision) {
          handleLocationChange('address', `${data.city}, ${data.principalSubdivision}`);
        }
      } catch {
        console.log('Address lookup failed, continuing without address');
      }

      toast.success('Location detected successfully!');
    } catch (error: unknown) {
      console.error('Location detection failed:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: number }).code;
        if (errorCode === 1) {
          toast.error('Location access denied. Please allow location access and try again.');
        } else if (errorCode === 2) {
          toast.error('Location unavailable. Please check your internet connection.');
        } else if (errorCode === 3) {
          toast.error('Location request timed out. Please try again.');
        } else {
          toast.error('Failed to detect location. Please try again.');
        }
      } else {
        toast.error('Failed to detect location. Please try again.');
      }
    } finally {
      setDetectingLocation(false);
    }
  };

  const detectWifiNetworks = async () => {
    setDetectingWifi(true);
    
    try {
      // Check if WiFi scanning is supported
      if (!(navigator as NavigatorWithWifi).wifi) {
        // Fallback: Show manual network addition
        toast.error('WiFi scanning not supported in this browser. Please add networks manually.');
        setAvailableNetworks([]);
        return;
      }

      // Request WiFi access
      const wifi = await (navigator as NavigatorWithWifi).wifi!.requestScan();
      const networks = await wifi.getNetworks();
      
      setAvailableNetworks(networks);
      toast.success(`Found ${networks.length} WiFi networks`);
    } catch (error: unknown) {
      console.error('WiFi detection failed:', error);
      
      // Fallback: Show common office network suggestions
      const commonNetworks = [
        { ssid: 'Office-WiFi', bssid: '', name: 'Main Office WiFi' },
        { ssid: 'Company-Guest', bssid: '', name: 'Guest Network' },
        { ssid: 'Office-5G', bssid: '', name: 'Office 5GHz Network' },
        { ssid: 'Company-2.4G', bssid: '', name: 'Office 2.4GHz Network' }
      ];
      
      setAvailableNetworks(commonNetworks);
      toast.success('Showing common office network templates');
    } finally {
      setDetectingWifi(false);
    }
  };

  const addDetectedNetwork = (network: { ssid: string; bssid: string; name: string }) => {
    setSettings(prev => ({
      ...prev,
      companyWifi: {
        ...prev.companyWifi,
        networks: [...prev.companyWifi.networks, {
          ssid: network.ssid || '',
          bssid: network.bssid || '',
          name: network.name || network.ssid || 'Office Network'
        }]
      }
    }));
    
    // Remove from available networks
    setAvailableNetworks(prev => prev.filter(n => n !== network));
    toast.success('Network added successfully!');
  };

  if (fetchingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure working hours, days, and attendance policies.
        </p>
      </div>

      {/* Working Hours */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Clock className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Working Hours</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={settings.workingHours.start}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                workingHours: { ...prev.workingHours, start: e.target.value }
              }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={settings.workingHours.end}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                workingHours: { ...prev.workingHours, end: e.target.value }
              }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Late Check-in Buffer (minutes)
          </label>
          <input
            type="number"
            min="0"
            max="180"
            value={settings.lateCheckInBuffer}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              lateCheckInBuffer: parseInt(e.target.value)
            }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Grace period for late check-in before marking as late
          </p>
        </div>

        {/* Attendance Closing Time */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Close Attendance After Time</h3>
              <p className="text-xs text-gray-500 mt-1">
                Block check-ins after specified time (useful to prevent late entries)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({
                ...prev,
                attendanceCloseEnabled: !prev.attendanceCloseEnabled
              }))}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${settings.attendanceCloseEnabled ? 'bg-blue-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${settings.attendanceCloseEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {settings.attendanceCloseEnabled && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Time
              </label>
              <input
                type="time"
                value={settings.attendanceCloseTime}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  attendanceCloseTime: e.target.value
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Employees cannot check-in after this time
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Working Days */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Calendar className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Working Days</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {weekDays.map(day => (
            <button
              key={day.id}
              onClick={() => toggleWorkingDay(day.id)}
              className={`
                px-4 py-3 rounded-md text-sm font-medium transition-colors
                ${settings.workingDays.includes(day.id)
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                  : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                }
              `}
            >
              {day.name}
            </button>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Timezone</h2>
        <select
          value={settings.timezone}
          onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          <option value="America/New_York">America/New_York (EST)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
          <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
        </select>
      </div>

      {/* Auto Check-In Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Clock className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Auto Check-In Settings</h2>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Auto Check-In Window (minutes)
          </label>
          <input
            type="number"
            min="30"
            max="300"
            value={settings.autoCheckInWindow}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              autoCheckInWindow: parseInt(e.target.value)
            }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            How early employees can auto check-in before work starts (e.g., 90 minutes = 7:30 AM for 9:00 AM start)
          </p>
        </div>
      </div>

      {/* Office Location */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Office Location</h2>
          </div>
          <button
            type="button"
            onClick={handleLocationToggle}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${settings.companyLocation.enabled ? 'bg-blue-600' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${settings.companyLocation.enabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Enable location-based automatic check-in for employees when they arrive at the office.
        </p>

        {settings.companyLocation.enabled && (
          <div className="space-y-4">
            {/* Auto-Detection Button */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Auto-Detection</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Automatically detect your current location and set it as the office location
                  </p>
                </div>
                <button
                  type="button"
                  onClick={detectCurrentLocation}
                  disabled={detectingLocation}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {detectingLocation ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Detecting...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Detect Current Location
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={settings.companyLocation.latitude || ''}
                  onChange={(e) => handleLocationChange('latitude', parseFloat(e.target.value))}
                  placeholder="e.g., 12.9716"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={settings.companyLocation.longitude || ''}
                  onChange={(e) => handleLocationChange('longitude', parseFloat(e.target.value))}
                  placeholder="e.g., 77.5946"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detection Radius (meters)
              </label>
              <input
                type="number"
                min="50"
                max="1000"
                value={settings.companyLocation.radius}
                onChange={(e) => handleLocationChange('radius', parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Recommended: 100-300 meters for accurate detection
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Office Address
              </label>
              <input
                type="text"
                value={settings.companyLocation.address}
                onChange={(e) => handleLocationChange('address', e.target.value)}
                placeholder="e.g., 123 Main Street, City, State"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Office WiFi */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Wifi className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Office WiFi</h2>
          </div>
          <button
            type="button"
            onClick={handleWifiToggle}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${settings.companyWifi.enabled ? 'bg-blue-600' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${settings.companyWifi.enabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Enable WiFi-based automatic check-in for employees when they connect to office WiFi networks.
        </p>

        {settings.companyWifi.enabled && (
          <div className="space-y-4">
            {/* WiFi Auto-Detection */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-green-900">WiFi Auto-Detection</h3>
                  <p className="text-xs text-green-700 mt-1">
                    Automatically detect available WiFi networks in your office
                  </p>
                </div>
                <button
                  type="button"
                  onClick={detectWifiNetworks}
                  disabled={detectingWifi}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {detectingWifi ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Scan WiFi Networks
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Available Networks */}
            {availableNetworks.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Available Networks</h4>
                <div className="space-y-2">
                  {availableNetworks.map((network, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{network.ssid || 'Unknown Network'}</div>
                        {network.bssid && (
                          <div className="text-xs text-gray-500">MAC: {network.bssid}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => addDetectedNetwork(network)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">WiFi Networks</h3>
              <button
                type="button"
                onClick={addWifiNetwork}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Network
              </button>
            </div>

            {settings.companyWifi.networks.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Wifi className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No WiFi networks configured</p>
                <p className="text-xs">Click &quot;Add Network&quot; to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {settings.companyWifi.networks.map((network, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Network {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeWifiNetwork(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Network Name (SSID)
                        </label>
                        <input
                          type="text"
                          value={network.ssid}
                          onChange={(e) => updateWifiNetwork(index, 'ssid', e.target.value)}
                          placeholder="Office-WiFi"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          MAC Address (BSSID)
                        </label>
                        <input
                          type="text"
                          value={network.bssid}
                          onChange={(e) => updateWifiNetwork(index, 'bssid', e.target.value)}
                          placeholder="00:11:22:33:44:55"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Friendly Name
                        </label>
                        <input
                          type="text"
                          value={network.name}
                          onChange={(e) => updateWifiNetwork(index, 'name', e.target.value)}
                          placeholder="Main Office WiFi"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">WiFi Configuration Tips</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>SSID is the network name employees see when connecting</li>
                      <li>BSSID (MAC address) provides more precise identification</li>
                      <li>You can add multiple networks for different office areas</li>
                      <li>Employees will be auto checked-in when connecting to any configured network</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
