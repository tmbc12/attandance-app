import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { attendanceAPI, CheckInData, CorrectionRequestData } from '../../api/attendance';
import { attendanceStorage } from '../../utils/storage';

interface Attendance {
  _id: string;
  date: string;
  checkIn?: {
    time: string;
    location?: any;
  };
  checkOut?: {
    time: string;
    location?: any;
  };
  status: string;
  workingHours: number;
  isLate: boolean;
  lateBy: number;
  lateByFormatted?: string; // e.g., "6 hours 31 minutes"
  checkInTime?: string; // e.g., "03:28 PM"
  checkOutTime?: string; // e.g., "06:45 PM"
  overtimeFormatted?: string; // e.g., "2 hours 15 minutes"
}

interface CorrectionRequest {
  _id: string;
  attendance: {
    _id: string;
    date: string;
  };
  requestType: string;
  originalCheckIn?: any;
  originalCheckOut?: any;
  requestedCheckIn?: any;
  requestedCheckOut?: any;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

interface AttendanceState {
  todayAttendance: Attendance | null;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  monthlyAttendances: Attendance[];
  monthlyStats: any;
  teamAttendances: any[];
  correctionRequests: CorrectionRequest[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  todayAttendance: null,
  hasCheckedIn: false,
  hasCheckedOut: false,
  monthlyAttendances: [],
  monthlyStats: null,
  teamAttendances: [],
  correctionRequests: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const loadStoredAttendanceState = createAsyncThunk(
  'attendance/loadStoredState',
  async () => {
    const state = await attendanceStorage.loadState();
    return state;
  }
);

export const checkIn = createAsyncThunk(
  'attendance/checkIn',
  async (data: CheckInData, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.checkIn(data);

      // Save state to AsyncStorage
      await attendanceStorage.saveState({
        hasCheckedIn: true,
        hasCheckedOut: false,
        checkInTime: new Date().toISOString(),
        todayDate: new Date().toDateString(),
      });

      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Check-in failed');
    }
  }
);

export const checkOut = createAsyncThunk(
  'attendance/checkOut',
  async (data: CheckInData, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.checkOut(data);

      // Update state in AsyncStorage
      await attendanceStorage.saveState({
        hasCheckedIn: true,
        hasCheckedOut: true,
        todayDate: new Date().toDateString(),
      });

      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Check-out failed');
    }
  }
);

export const getTodayStatus = createAsyncThunk(
  'attendance/getTodayStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.getTodayStatus();

      // Update AsyncStorage with server state
      if (response.attendance) {
        await attendanceStorage.saveState({
          hasCheckedIn: response.hasCheckedIn,
          hasCheckedOut: response.hasCheckedOut,
          checkInTime: response.attendance?.checkIn?.time,
          todayDate: new Date().toDateString(),
        });
      }

      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch status');
    }
  }
);

export const getMyAttendance = createAsyncThunk(
  'attendance/getMyAttendance',
  async ({ month, year }: { month: number; year: number }, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.getMyAttendance(month, year);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance');
    }
  }
);

export const getTeamToday = createAsyncThunk(
  'attendance/getTeamToday',
  async (_, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.getTeamToday();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch team attendance');
    }
  }
);

// Correction request thunks
export const submitCorrectionRequest = createAsyncThunk(
  'attendance/submitCorrectionRequest',
  async (data: CorrectionRequestData, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.submitCorrectionRequest(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit correction request');
    }
  }
);

export const getMyCorrectionRequests = createAsyncThunk(
  'attendance/getMyCorrectionRequests',
  async (status: string | undefined = undefined, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.getMyCorrectionRequests(status);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch correction requests');
    }
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Load stored state
    builder.addCase(loadStoredAttendanceState.fulfilled, (state, action) => {
      if (action.payload) {
        state.hasCheckedIn = action.payload.hasCheckedIn;
        state.hasCheckedOut = action.payload.hasCheckedOut;

        // Create a temporary attendance object with the stored check-in time
        if (action.payload.checkInTime && !action.payload.hasCheckedOut) {
          state.todayAttendance = {
            _id: 'temp',
            date: new Date().toISOString(),
            checkIn: {
              time: action.payload.checkInTime,
            },
            status: 'present',
            workingHours: 0,
            isLate: false,
            lateBy: 0,
          };
        }
      }
    });

    // Check-in
    builder.addCase(checkIn.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(checkIn.fulfilled, (state, action) => {
      state.isLoading = false;
      state.todayAttendance = action.payload.attendance;
      state.hasCheckedIn = true;
    });
    builder.addCase(checkIn.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Check-out
    builder.addCase(checkOut.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(checkOut.fulfilled, (state, action) => {
      state.isLoading = false;
      state.todayAttendance = action.payload.attendance;
      state.hasCheckedOut = true;
    });
    builder.addCase(checkOut.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Get today status
    builder.addCase(getTodayStatus.fulfilled, (state, action) => {
      state.todayAttendance = action.payload.attendance;
      state.hasCheckedIn = action.payload.hasCheckedIn;
      state.hasCheckedOut = action.payload.hasCheckedOut;
    });

    // Get my attendance
    builder.addCase(getMyAttendance.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(getMyAttendance.fulfilled, (state, action) => {
      state.isLoading = false;
      state.monthlyAttendances = action.payload.attendances;
      state.monthlyStats = action.payload.stats;
    });

    // Get team today
    builder.addCase(getTeamToday.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getTeamToday.fulfilled, (state, action) => {
      state.isLoading = false;
      state.teamAttendances = action.payload.attendances || [];
    });
    builder.addCase(getTeamToday.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Submit correction request
    builder.addCase(submitCorrectionRequest.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(submitCorrectionRequest.fulfilled, (state, action) => {
      state.isLoading = false;
      // Add to the list if we have it loaded
      if (state.correctionRequests) {
        state.correctionRequests.unshift(action.payload.correction);
      }
    });
    builder.addCase(submitCorrectionRequest.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Get my correction requests
    builder.addCase(getMyCorrectionRequests.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getMyCorrectionRequests.fulfilled, (state, action) => {
      state.isLoading = false;
      state.correctionRequests = action.payload.corrections || [];
    });
    builder.addCase(getMyCorrectionRequests.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError } = attendanceSlice.actions;
export default attendanceSlice.reducer;
