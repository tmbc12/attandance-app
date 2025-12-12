import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api';
import { API_ENDPOINTS } from '../constants';

interface Holiday {
  _id: string;
  date: string;
  description?: string;
  organizationId: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface HolidayState {
  holidays: Holiday[];
  isLoading: boolean;
  error: string | null;
}

const initialState: HolidayState = {
  holidays: [],
  isLoading: false,
  error: null,
};

// Fetch all holidays
export const fetchHolidays = createAsyncThunk(
  'holidays/fetchAll',
  async (params: { year?: number; month?: number } | undefined, { rejectWithValue }) => {
    try {
      const urlParams = new URLSearchParams();
      if (params?.year) urlParams.append('year', params.year.toString());
      if (params?.month) urlParams.append('month', params.month.toString());
      
      const url = urlParams.toString() 
        ? `${API_ENDPOINTS.HOLIDAYS.LIST}?${urlParams.toString()}`
        : API_ENDPOINTS.HOLIDAYS.LIST;
      
      const response = await api.get(url);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to fetch holidays';
      return rejectWithValue(errorMessage);
    }
  }
);

// Create holiday
export const createHoliday = createAsyncThunk(
  'holidays/create',
  async (data: { date: string; description?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(API_ENDPOINTS.HOLIDAYS.CREATE, data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to create holiday';
      return rejectWithValue(errorMessage);
    }
  }
);

// Update holiday
export const updateHoliday = createAsyncThunk(
  'holidays/update',
  async ({ id, data }: { id: string; data: { date?: string; description?: string } }, { rejectWithValue }) => {
    try {
      const response = await api.put(API_ENDPOINTS.HOLIDAYS.UPDATE(id), data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to update holiday';
      return rejectWithValue(errorMessage);
    }
  }
);

// Delete holiday
export const deleteHoliday = createAsyncThunk(
  'holidays/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(API_ENDPOINTS.HOLIDAYS.DELETE(id));
      return id;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to delete holiday';
      return rejectWithValue(errorMessage);
    }
  }
);

const holidaySlice = createSlice({
  name: 'holidays',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch holidays
    builder.addCase(fetchHolidays.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchHolidays.fulfilled, (state, action) => {
      state.isLoading = false;
      state.holidays = action.payload;
    });
    builder.addCase(fetchHolidays.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create holiday
    builder.addCase(createHoliday.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createHoliday.fulfilled, (state, action) => {
      state.isLoading = false;
      state.holidays.push(action.payload);
    });
    builder.addCase(createHoliday.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update holiday
    builder.addCase(updateHoliday.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateHoliday.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.holidays.findIndex(h => h._id === action.payload._id);
      if (index !== -1) {
        state.holidays[index] = action.payload;
      }
    });
    builder.addCase(updateHoliday.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Delete holiday
    builder.addCase(deleteHoliday.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deleteHoliday.fulfilled, (state, action) => {
      state.isLoading = false;
      state.holidays = state.holidays.filter(h => h._id !== action.payload);
    });
    builder.addCase(deleteHoliday.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError } = holidaySlice.actions;
export default holidaySlice.reducer;

