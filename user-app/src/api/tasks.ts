import apiClient from './client';

export interface TaskData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  tags?: string[];
}

export interface TaskHistory {
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
}

export interface Task {
  _id: string;
  // title: string;
  // description?: string;
  history: TaskHistory[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  date: string;
  dueDate?: string;
  timeTracking: {
    totalSeconds: number;
    currentSessionStart?: string;
    lastPauseTime?: string;
    sessions: Array<{
      startTime: string;
      endTime: string;
      duration: number;
      type: string;
    }>;
  };
  isCarriedForward: boolean;
  carriedFromDate?: string;
  tags: string[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  pauseTime: string;
  startTime: string;
  stopTime: string;
  pausedForInSeconds: number;
  assignedBy: {
    _id: string;
    name: string;
  };
}

export const tasksAPI = {
  // Create new task
  createTask: async (data: TaskData) => {
    const response = await apiClient.post('/api/tasks', data);
    return response.data;
  },

  // Get today's tasks
  getTodayTasks: async () => {
    const response = await apiClient.get('/api/tasks/today');
    return response.data;
  },

  // Get tasks with filters
  getTasks: async (params?: { status?: string; startDate?: string; endDate?: string; limit?: number; skip?: number }) => {
    const response = await apiClient.get('/api/tasks', { params });
    return response.data;
  },

  // Start task
  startTask: async (taskId: string) => {
    const response = await apiClient.post(`/api/tasks/${taskId}/start`);
    return response.data;
  },

  // Pause task
  pauseTask: async (taskId: string) => {
    const response = await apiClient.post(`/api/tasks/${taskId}/pause`);
    return response.data;
  },

  // Resume task
  resumeTask: async (taskId: string) => {
    const response = await apiClient.post(`/api/tasks/${taskId}/resume`);
    return response.data;
  },

  // Stop task
  stopTask: async (taskId: string) => {
    const response = await apiClient.post(`/api/tasks/${taskId}/stop`);
    return response.data;
  },

  // Complete task
  completeTask: async (taskId: string) => {
    const response = await apiClient.post(`/api/tasks/${taskId}/complete`);
    return response.data;
  },

  // Update task
  updateTask: async (taskId: string, data: Partial<TaskData>) => {
    const response = await apiClient.put(`/api/tasks/${taskId}`, data);
    return response.data;
  },

  // Delete task
  deleteTask: async (taskId: string) => {
    const response = await apiClient.delete(`/api/tasks/${taskId}`);
    return response.data;
  },

  // Carry forward incomplete tasks
  carryForwardTasks: async () => {
    const response = await apiClient.post('/api/tasks/carry-forward');
    return response.data;
  },
};
