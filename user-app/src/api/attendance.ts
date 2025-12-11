import apiClient from './client';

export interface CheckInData {
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

export interface CorrectionRequestData {
  attendanceId: string;
  requestType: 'check-in' | 'check-out' | 'both';
  requestedCheckIn?: {
    time: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    notes?: string;
  };
  requestedCheckOut?: {
    time: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    notes?: string;
  };
  reason: string;
}

export const attendanceAPI = {
  checkIn: async (data: CheckInData) => {
    const response = await apiClient.post('/api/attendance/check-in', data);
    return response.data;
  },

  checkOut: async (data: CheckInData) => {
    const response = await apiClient.post('/api/attendance/check-out', data);
    return response.data;
  },

  getTodayStatus: async () => {
    console.log('📱 [ATTENDANCE API] Fetching today status...');
    try {
      const response = await apiClient.get('/api/attendance/today');
      console.log('✅ [ATTENDANCE API] Today status received:', {
        hasAttendance: !!response.data.attendance,
        hasCheckedIn: response.data.hasCheckedIn,
        hasCheckedOut: response.data.hasCheckedOut
      });
      return response.data;
    } catch (error: any) {
      console.log('❌ [ATTENDANCE API] Failed to fetch today status:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      throw error;
    }
  },

  getMyAttendance: async (month: number, year: number) => {
    const response = await apiClient.get('/api/attendance/my-attendance', {
      params: { month, year },
    });
    return response.data;
  },

  getTeamToday: async () => {
    const response = await apiClient.get('/api/attendance/team-today');
    return response.data;
  },

  // Correction requests
  submitCorrectionRequest: async (data: CorrectionRequestData) => {
    const response = await apiClient.post('/api/corrections/request', data);
    return response.data;
  },

  getMyCorrectionRequests: async (status?: string, limit = 20, skip = 0) => {
    const response = await apiClient.get('/api/corrections/my-requests', {
      params: { status, limit, skip },
    });
    return response.data;
  },

  // Notifications
  getMyNotifications: async (limit = 20, skip = 0, unreadOnly = false) => {
    const response = await apiClient.get('/api/notifications/employee', {
      params: { limit, skip, unreadOnly },
    });
    return response.data;
  },

  markNotificationAsRead: async (notificationId: string) => {
    const response = await apiClient.put(`/api/notifications/employee/${notificationId}/read`);
    return response.data;
  },

  markAllNotificationsAsRead: async () => {
    const response = await apiClient.put('/api/notifications/employee/read-all');
    return response.data;
  },

  // Attendance Preferences
  getAttendancePreferences: async () => {
    const response = await apiClient.get('/api/attendance/preferences');
    return response.data;
  },

  updateAttendancePreferences: async (data: {
    attendanceMode?: 'manual' | 'gps' | 'wifi' | 'both';
    autoCheckInEnabled?: boolean;
  }) => {
    const response = await apiClient.put('/api/attendance/preferences', data);
    return response.data;
  },

  // Organization Settings (for employees to view)
  getOrganizationSettings: async () => {
    const response = await apiClient.get('/api/organization/settings');
    return response.data;
  },
};
