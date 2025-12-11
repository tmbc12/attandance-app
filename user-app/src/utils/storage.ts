import AsyncStorage from '@react-native-async-storage/async-storage';

const ATTENDANCE_STATE_KEY = '@attendance_state';

export interface StoredAttendanceState {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime?: string;
  todayDate: string;
}

export const attendanceStorage = {
  // Save attendance state
  saveState: async (state: StoredAttendanceState) => {
    try {
      await AsyncStorage.setItem(ATTENDANCE_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving attendance state:', error);
    }
  },

  // Load attendance state
  loadState: async (): Promise<StoredAttendanceState | null> => {
    try {
      const stateStr = await AsyncStorage.getItem(ATTENDANCE_STATE_KEY);

      if (!stateStr) {
        return null;
      }

      const state: StoredAttendanceState = JSON.parse(stateStr);

      // Check if the stored state is for today
      const today = new Date().toDateString();

      if (state.todayDate !== today) {
        // Clear old state
        await AsyncStorage.removeItem(ATTENDANCE_STATE_KEY);
        return null;
      }

      return state;
    } catch (error) {
      console.error('Error loading attendance state:', error);
      return null;
    }
  },

  // Clear attendance state
  clearState: async () => {
    try {
      await AsyncStorage.removeItem(ATTENDANCE_STATE_KEY);
    } catch (error) {
      console.error('Error clearing attendance state:', error);
    }
  },
};
