import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { tasksAPI, Task, TaskData } from "../../api/tasks";

interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  paused: number;
  completed: number;
  totalTimeSpent: number;
}

interface TasksState {
  tasks: Task[];
  assignedTasks: Task[];
  stats: TaskStats | null;
  isLoading: boolean;
  error: string | null;
  activeTaskId: string | null;
  timerRunning: boolean;
}

const initialState: TasksState = {
  tasks: [],
  assignedTasks: [],
  stats: null,
  isLoading: false,
  error: null,
  activeTaskId: null,
  timerRunning: false,
};

// Async thunks
export const createTask = createAsyncThunk(
  "tasks/create",
  async (data: TaskData, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.createTask(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create task"
      );
    }
  }
);

export const assignTask = createAsyncThunk(
  "tasks/assign",
  async (data: { taskId: string; assignedTo: string }, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.assignTask(data.taskId, data.assignedTo);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to assign task"
      );
    }
  }
);

export const getTodayTasks = createAsyncThunk(
  "tasks/getTodayTasks",
  async (_, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.getTodayTasks();
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch tasks"
      );
    }
  }
);

export const getTasks = createAsyncThunk(
  "tasks/getTasks",
  async (
    {
      status,
      startDate,
      endDate,
      limit = 50,
      skip = 0,
      isAssigned,
    }: {
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      skip?: number;
      isAssigned?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await tasksAPI.getTasks({
        status,
        startDate,
        endDate,
        limit,
        skip,
        isAssigned,
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch tasks"
      );
    }
  }
);

export const startTask = createAsyncThunk(
  "tasks/start",
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.startTask(taskId);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to start task"
      );
    }
  }
);

export const pauseTask = createAsyncThunk(
  "tasks/pause",
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.pauseTask(taskId);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to pause task"
      );
    }
  }
);

export const resumeTask = createAsyncThunk(
  "tasks/resume",
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.resumeTask(taskId);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to resume task"
      );
    }
  }
);

export const stopTask = createAsyncThunk(
  "tasks/stop",
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.stopTask(taskId);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to stop task"
      );
    }
  }
);

export const completeTask = createAsyncThunk(
  "tasks/complete",
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.completeTask(taskId);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to complete task"
      );
    }
  }
);

export const updateTask = createAsyncThunk(
  "tasks/update",
  async (
    { taskId, data }: { taskId: string; data: Partial<TaskData> },
    { rejectWithValue }
  ) => {
    try {
      const response = await tasksAPI.updateTask(taskId, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update task"
      );
    }
  }
);

export const deleteTask = createAsyncThunk(
  "tasks/delete",
  async (taskId: string, { rejectWithValue }) => {
    try {
      await tasksAPI.deleteTask(taskId);
      return taskId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete task"
      );
    }
  }
);

export const carryForwardTasks = createAsyncThunk(
  "tasks/carryForward",
  async (_, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.carryForwardTasks();
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to carry forward tasks"
      );
    }
  }
);

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setActiveTask: (state, action: PayloadAction<string | null>) => {
      state.activeTaskId = action.payload;
    },
    setTimerRunning: (state, action: PayloadAction<boolean>) => {
      state.timerRunning = action.payload;
    },
    updateTaskTimer: (
      state,
      action: PayloadAction<{ taskId: string; seconds: number }>
    ) => {
      const task = state.tasks.find((t) => t._id === action.payload.taskId);
      if (task) {
        task.timeTracking.totalSeconds = action.payload.seconds;
      }
    },
    addTask: (
      state,
      action: PayloadAction<{ task: Task; userRole: string }>
    ) => {
      state.tasks.unshift(action.payload.task);
      if (
        action.payload.userRole === "team_lead" ||
        action.payload.userRole === "manager"
      ) {
        state.assignedTasks.unshift(action.payload.task);
      }

      // Update stats
      if (state.stats) {
        state.stats.total += 1;
        state.stats.pending += 1;
      }
    },
    addSplittedTask: (state, action: PayloadAction<Task>) => {
      state.tasks.unshift(action.payload);

      // Update stats
      if (state.stats) {
        state.stats.total += 1;
        state.stats.pending += 1;
      }
    },
  },
  extraReducers: (builder) => {
    // Create task
    builder.addCase(createTask.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createTask.fulfilled, (state, action) => {
      state.isLoading = false;
      state.tasks.unshift(action.payload.task);
      // Update stats
      if (state.stats) {
        state.stats.total += 1;
        state.stats.pending += 1;
      }
    });
    builder.addCase(createTask.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Assign Tasks
    builder.addCase(assignTask.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(assignTask.fulfilled, (state, action) => {
      state.isLoading = false;
      state.assignedTasks = state.assignedTasks.filter(
        (t) => t._id !== action.payload.task._id
      );
      state.tasks = state.tasks.filter(
        (t) => t._id !== action.payload.task._id
      );
    });
    builder.addCase(assignTask.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Get today's tasks
    builder.addCase(getTodayTasks.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getTodayTasks.fulfilled, (state, action) => {
      state.isLoading = false;
      state.tasks = action.payload.tasks || [];
      state.stats = action.payload.stats || null;
      // Find active task
      const activeTask = state.tasks.find((t) => t.status === "in_progress");
      state.activeTaskId = activeTask?._id || null;
      state.timerRunning = !!activeTask;
    });
    builder.addCase(getTodayTasks.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Get tasks with filters
    builder.addCase(getTasks.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getTasks.fulfilled, (state, action) => {
      state.isLoading = false;
      state.assignedTasks = action.payload.tasks || [];
    });
    builder.addCase(getTasks.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Start task
    builder.addCase(startTask.fulfilled, (state, action) => {
      const taskIndex = state.tasks.findIndex(
        (t) => t._id === action.payload.task._id
      );
      if (taskIndex !== -1) {
        state.tasks[taskIndex] = action.payload.task;
      }
      state.activeTaskId = action.payload.task._id;
      state.timerRunning = true;
      // Update stats
      if (state.stats) {
        state.stats.inProgress += 1;
        if (action.payload.task.status === "pending") state.stats.pending -= 1;
        if (action.payload.task.status === "paused") state.stats.paused -= 1;
      }
    });

    // Pause task
    builder.addCase(pauseTask.fulfilled, (state, action) => {
      const taskIndex = state.tasks.findIndex(
        (t) => t._id === action.payload.task._id
      );
      if (taskIndex !== -1) {
        state.tasks[taskIndex] = action.payload.task;
      }
      state.activeTaskId = null;
      state.timerRunning = false;
      // Update stats
      if (state.stats) {
        state.stats.paused += 1;
        state.stats.inProgress -= 1;
      }
    });

    // Resume task
    builder.addCase(resumeTask.fulfilled, (state, action) => {
      const taskIndex = state.tasks.findIndex(
        (t) => t._id === action.payload.task._id
      );
      if (taskIndex !== -1) {
        state.tasks[taskIndex] = action.payload.task;
      }
      state.activeTaskId = action.payload.task._id;
      state.timerRunning = true;
      // Update stats
      if (state.stats) {
        state.stats.inProgress += 1;
        state.stats.paused -= 1;
      }
    });

    // Stop task
    builder.addCase(stopTask.fulfilled, (state, action) => {
      const taskIndex = state.tasks.findIndex(
        (t) => t._id === action.payload.task._id
      );
      if (taskIndex !== -1) {
        state.tasks[taskIndex] = action.payload.task;
      }
      state.activeTaskId = null;
      state.timerRunning = false;
      // Update stats
      if (state.stats) {
        state.stats.pending += 1;
        state.stats.inProgress -= 1;
      }
    });

    // Complete task
    builder.addCase(completeTask.fulfilled, (state, action) => {
      const taskIndex = state.tasks.findIndex(
        (t) => t._id === action.payload.task._id
      );
      if (taskIndex !== -1) {
        state.tasks[taskIndex] = action.payload.task;
      }
      if (state.activeTaskId === action.payload.task._id) {
        state.activeTaskId = null;
        state.timerRunning = false;
      }
      // Update stats
      if (state.stats) {
        state.stats.completed += 1;
        if (action.payload.task.status === "in_progress")
          state.stats.inProgress -= 1;
        if (action.payload.task.status === "pending") state.stats.pending -= 1;
        if (action.payload.task.status === "paused") state.stats.paused -= 1;
      }
    });

    // Update task
    builder.addCase(updateTask.fulfilled, (state, action) => {
      const taskIndex = state.tasks.findIndex(
        (t) => t._id === action.payload.task._id
      );
      if (taskIndex !== -1) {
        state.tasks[taskIndex] = action.payload.task;
      }
    });

    // Delete task
    builder.addCase(deleteTask.fulfilled, (state, action) => {
      state.tasks = state.tasks.filter((t) => t._id !== action.payload);
      if (state.activeTaskId === action.payload) {
        state.activeTaskId = null;
        state.timerRunning = false;
      }
      // Update stats
      if (state.stats) {
        state.stats.total -= 1;
      }
    });

    // Carry forward tasks
    builder.addCase(carryForwardTasks.fulfilled, (state, action) => {
      if (action.payload.carriedTasks) {
        state.tasks = [...action.payload.carriedTasks, ...state.tasks];
      }
    });
  },
});

export const {
  clearError,
  setActiveTask,
  setTimerRunning,
  updateTaskTimer,
  addTask,
  addSplittedTask,
} = tasksSlice.actions;
export default tasksSlice.reducer;
