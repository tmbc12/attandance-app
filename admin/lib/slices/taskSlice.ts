import { TaskGroup } from "@/types/task";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api";

type Priority = "low" | "medium" | "high" | "urgent";

export interface AssignTaskData {
  employeeId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: Priority;
  tags?: string;
}

export interface FetchTasksParams {
  selectedDate: string;
  statusFilter: "all" | "pending" | "in_progress" | "completed" | "paused";
  priorityFilter: "all" | "low" | "medium" | "high" | "urgent";
}

interface TaskState {
  employeeWiseTask: TaskGroup[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TaskState = {
  employeeWiseTask: [],
  isLoading: false,
  error: null,
};

export const assignTask = createAsyncThunk(
  "tasks/assign",
  async (data: AssignTaskData[], { rejectWithValue }) => {
    try {
      const response = await api.post("/api/tasks/assign", {
        tasks: data,
      });

      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to assign task";
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchEmployeeWiseTasks = createAsyncThunk(
  "tasks/fetchByEmployee",
  async (
    { selectedDate, statusFilter, priorityFilter }: FetchTasksParams,
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get("/api/tasks/employee-wise", {
        params: {
          date: selectedDate,
          status: statusFilter,
          priority: priorityFilter,
        },
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch tasks";
      return rejectWithValue(errorMessage);
    }
  }
);

const holidaySlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(assignTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(assignTask.fulfilled, (state, action) => {
        state.isLoading = false;

        const newData = action.payload.employeeWiseTasks;

        newData.forEach((newEmp: TaskGroup) => {
          const existingEmp = state.employeeWiseTask.find(
            (e) => e.employee._id === newEmp.employee._id
          );

          if (existingEmp) {
            existingEmp.tasks.unshift(...newEmp.tasks);
            //   existingEmp.taskCount += newEmp.taskCount;
          } else {
            state.employeeWiseTask.unshift(newEmp);
          }
        });
      })
      .addCase(assignTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchEmployeeWiseTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeWiseTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employeeWiseTask = action.payload.employeeWiseTasks;
      })
      .addCase(fetchEmployeeWiseTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default holidaySlice.reducer;
