import apiClient from './client';

export const authAPI = {
  login: async (email: string, password: string) => {
    console.log('📱 [AUTH API] Login attempt starting...', { email, hasPassword: !!password });
    console.log('📱 [AUTH API] API URL:', process.env.EXPO_PUBLIC_API_URL || 'https://tmbc-attendance-app.vercel.app');

    try {
      console.log('📱 [AUTH API] Making POST request to /api/auth/employee-login');
      const response = await apiClient.post('/api/auth/employee-login', { email, password });
      console.log('📱 [AUTH API] Login successful, received response:', {
        hasToken: !!response.data.token,
        hasUser: !!response.data.user,
        userName: response.data.user?.name
      });
      return response.data;
    } catch (error: any) {
      console.log('❌ [AUTH API] Login failed:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        error: error.response?.data || error.message
      });
      throw error;
    }
  },

  register: async (token: string, password: string, name: string) => {
    const response = await apiClient.post('/api/employees/register', { token, password, name });
    return response.data;
  },

  verifyInvite: async (token: string) => {
    const response = await apiClient.get(`/api/employees/verify-invite/${token}`);
    return response.data;
  },

  verifyInviteCode: async (code: string) => {
    console.log('📱 Mobile app calling verifyInviteCode with code:', code);
    console.log('📱 API URL:', process.env.EXPO_PUBLIC_API_URL || 'https://tmbc-attendance-app.vercel.app');
    const response = await apiClient.post('/api/employees/verify-code', { code });
    console.log('📱 API response:', response.data);
    return response.data;
  },

  registerWithCode: async (data: {
    inviteCode: string;
    email: string;
    name: string;
    password: string;
    dateOfBirth: string;
    gender: string;
    profileImage?: string;
  }) => {
    const response = await apiClient.post('/api/employees/register-with-code', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/api/employees/profile');
    return response.data;
  },
};
