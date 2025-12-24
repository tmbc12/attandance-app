import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../api/auth';

export interface User {
  _id: string;
  name: string;
  email: string;
  employeeId: string;
  departmentId: string;
  departmentName: string;
  designation: string;
  role: string;
  status: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    console.log('📱 [AUTH SLICE] Login thunk started', { email, hasPassword: !!password });
    try {
      console.log('📱 [AUTH SLICE] Calling authAPI.login...');
      const data = await authAPI.login(email, password);
      console.log('📱 [AUTH SLICE] Login successful, saving to AsyncStorage...');
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      console.log('✅ [AUTH SLICE] Login completed successfully');
      return data;
    } catch (error: any) {
      console.log('❌ [AUTH SLICE] Login error:', {
        message: error.response?.data?.message,
        status: error.response?.status,
        fullError: error.message,
        data: error.response?.data
      });
      // Handle different error formats
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data ||
        error.message ||
        'Login failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ token, password, name }: { token: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      const data = await authAPI.register(token, password, name);
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const registerWithCode = createAsyncThunk(
  'auth/registerWithCode',
  async (data: {
    inviteCode: string;
    email: string;
    name: string;
    password: string;
    dateOfBirth: string;
    gender: string;
    profileImage?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await authAPI.registerWithCode(data);
      await AsyncStorage.setItem('authToken', response.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStored',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('userData');

      if (token && userData) {
        return {
          token,
          user: JSON.parse(userData),
        };
      }
      return rejectWithValue('No stored auth');
    } catch (error) {
      return rejectWithValue('Failed to load auth');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  console.log('🚪 Logging out user...');
  await AsyncStorage.removeItem('authToken');
  await AsyncStorage.removeItem('userData');
  console.log('✅ User logged out successfully');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Register with Code
    builder.addCase(registerWithCode.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(registerWithCode.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    });
    builder.addCase(registerWithCode.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Load stored auth
    builder.addCase(loadStoredAuth.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
