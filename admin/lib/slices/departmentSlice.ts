import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api';
import { API_ENDPOINTS } from '../constants';

interface Department {
  _id: string;
  name: string;
  description: string;
  manager?: {
    _id: string;
    name: string;
    email: string;
  };
  employeeCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DepartmentState {
  departments: Department[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DepartmentState = {
  departments: [],
  isLoading: false,
  error: null,
};

// Fetch all departments
export const fetchDepartments = createAsyncThunk(
  'departments/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(API_ENDPOINTS.DEPARTMENTS.LIST);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to fetch departments';
      return rejectWithValue(errorMessage);
    }
  }
);

// Create department
export const createDepartment = createAsyncThunk(
  'departments/create',
  async (data: { name: string; description?: string; colorCode?: string; manager?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(API_ENDPOINTS.DEPARTMENTS.CREATE, data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to create department';
      return rejectWithValue(errorMessage);
    }
  }
);

// Update department
interface UpdateDepartmentData {
  name?: string;
  description?: string;
  colorCode?: string;
  manager?: string; // API expects manager ID as string, not the full object
}

export const updateDepartment = createAsyncThunk(
  'departments/update',
  async ({ id, data }: { id: string; data: UpdateDepartmentData }, { rejectWithValue }) => {
    try {
      const response = await api.put(API_ENDPOINTS.DEPARTMENTS.UPDATE(id), data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to update department';
      return rejectWithValue(errorMessage);
    }
  }
);

// Delete department
export const deleteDepartment = createAsyncThunk(
  'departments/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(API_ENDPOINTS.DEPARTMENTS.DELETE(id));
      return id;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to delete department';
      return rejectWithValue(errorMessage);
    }
  }
);

const departmentSlice = createSlice({
  name: 'departments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch departments
    builder.addCase(fetchDepartments.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchDepartments.fulfilled, (state, action) => {
      state.isLoading = false;
      state.departments = action.payload;
    });
    builder.addCase(fetchDepartments.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create department
    builder.addCase(createDepartment.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createDepartment.fulfilled, (state, action) => {
      state.isLoading = false;
      state.departments.push({ ...action.payload, employeeCount: 0 });
    });
    builder.addCase(createDepartment.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update department
    builder.addCase(updateDepartment.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateDepartment.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.departments.findIndex(d => d._id === action.payload._id);
      if (index !== -1) {
        state.departments[index] = { ...state.departments[index], ...action.payload };
      }
    });
    builder.addCase(updateDepartment.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Delete department
    builder.addCase(deleteDepartment.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deleteDepartment.fulfilled, (state, action) => {
      state.isLoading = false;
      state.departments = state.departments.filter(d => d._id !== action.payload);
    });
    builder.addCase(deleteDepartment.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError } = departmentSlice.actions;
export default departmentSlice.reducer;
