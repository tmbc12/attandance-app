import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import type { Session } from 'next-auth';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  permissions?: string[];
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Async thunks
export const login = createAsyncThunk<
  { session: Session },
  LoginCredentials,
  { rejectValue: string }
>(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // First, try to authenticate directly to get the actual error message
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.31.75:5000';
      const loginResponse = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginResponse.json();

      // If login fails, return the actual error message from backend
      if (!loginResponse.ok) {
        return rejectWithValue(loginData.message || 'Invalid email or password. Please check your credentials and try again.');
      }

      // Now sign in with NextAuth
      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return rejectWithValue(loginData.message || 'Login failed');
      }

      if (!result?.ok) {
        return rejectWithValue('Login failed');
      }

      return { session: {} as Session };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login. Please try again later.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await nextAuthSignOut({ redirect: false });

      // Clear any stored tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token');
      }

      return null;
    } catch (error) {
      // Even if logout fails, clear local state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token');
      }
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSession: (state, action: { payload: Session | null }) => {
      const session = action.payload;
      if (session?.user) {
        state.session = session;
        state.user = session.user as AuthUser;
        state.isAuthenticated = true;
        state.error = null;
      } else {
        state.session = null;
        state.user = null;
        state.isAuthenticated = false;
      }
    },
    clearSession: (state) => {
      state.user = null;
      state.session = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        // Note: The actual session will be set by the setSession action
        // triggered by the useSession hook
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.session = null;
        state.error = action.payload || 'Login failed';
      })
      // Logout
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.session = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        // Even if logout fails, clear the state
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.session = null;
        state.error = null;
      });
  },
});

export const { clearError, setSession, clearSession } = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectError = (state: { auth: AuthState }) => state.auth.error;

export default authSlice.reducer;
