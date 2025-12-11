import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AutoCheckInSettings {
  enabled: boolean;
  officeLocation: {
    latitude: number;
    longitude: number;
    radius: number; // in meters
  } | null;
  officeWiFi: {
    ssid: string;
    enabled: boolean;
  } | null;
  notificationsEnabled: boolean;
  autoCheckOutEnabled: boolean;
}

interface AutoCheckInState {
  settings: AutoCheckInSettings;
  isMonitoring: boolean;
  lastCheckInAttempt: string | null;
  error: string | null;
}

const initialState: AutoCheckInState = {
  settings: {
    enabled: false,
    officeLocation: null,
    officeWiFi: null,
    notificationsEnabled: true,
    autoCheckOutEnabled: false,
  },
  isMonitoring: false,
  lastCheckInAttempt: null,
  error: null,
};

// Load settings from storage
export const loadAutoCheckInSettings = createAsyncThunk(
  'autoCheckIn/loadSettings',
  async () => {
    try {
      const settingsStr = await AsyncStorage.getItem('autoCheckInSettings');
      if (settingsStr) {
        return JSON.parse(settingsStr);
      }
      return null;
    } catch (error) {
      console.error('Failed to load auto check-in settings:', error);
      return null;
    }
  }
);

// Save settings to storage
export const saveAutoCheckInSettings = createAsyncThunk(
  'autoCheckIn/saveSettings',
  async (settings: AutoCheckInSettings) => {
    try {
      await AsyncStorage.setItem('autoCheckInSettings', JSON.stringify(settings));
      return settings;
    } catch (error) {
      console.error('Failed to save auto check-in settings:', error);
      throw error;
    }
  }
);

const autoCheckInSlice = createSlice({
  name: 'autoCheckIn',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<AutoCheckInSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setMonitoringStatus: (state, action: PayloadAction<boolean>) => {
      state.isMonitoring = action.payload;
    },
    setLastCheckInAttempt: (state, action: PayloadAction<string>) => {
      state.lastCheckInAttempt = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAutoCheckInSettings.fulfilled, (state, action) => {
        if (action.payload) {
          state.settings = action.payload;
        }
      })
      .addCase(saveAutoCheckInSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addCase(saveAutoCheckInSettings.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to save settings';
      });
  },
});

export const {
  updateSettings,
  setMonitoringStatus,
  setLastCheckInAttempt,
  setError,
  clearError,
} = autoCheckInSlice.actions;

export default autoCheckInSlice.reducer;

