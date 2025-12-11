import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { eventEmitter } from '../utils/eventEmitter';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tmbc-attendance-app.vercel.app';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const token = await AsyncStorage.getItem('authToken');

        if (!token) {
          // No token available, clear storage and reject
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userData');
          isRefreshing = false;
          return Promise.reject(error);
        }

        // Attempt to refresh the token
        const response = await axios.post(
          `${API_URL}/api/auth/refresh-token`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const newToken = response.data.token;

        // Save new token
        await AsyncStorage.setItem('authToken', newToken);

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Notify all queued requests
        onTokenRefreshed(newToken);

        isRefreshing = false;

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear storage and reject
        isRefreshing = false;
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');

        console.log('⚠️ Session expired - please log in again');

        // Dispatch a custom event that can be caught by the app to handle logout
        if (eventEmitter) {
          eventEmitter.emit('auth:session-expired');
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
