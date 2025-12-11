import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api';
import { Employee } from '../../types';

interface FetchEmployeesParams {
  limit?: number;
  page?: number;
  search?: string;
  status?: string;
}

// Async thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (params: FetchEmployeesParams = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/employees', { params });
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        return rejectWithValue(axiosError.response?.data?.message || 'Failed to fetch employees');
      }
      return rejectWithValue('Failed to fetch employees');
    }
  }
);

interface CreateEmployeeData {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  role?: string;
  sendInvite?: boolean;
}

export const createEmployee = createAsyncThunk(
  'employees/createEmployee',
  async (employeeData: CreateEmployeeData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/employees', employeeData);
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        return rejectWithValue(axiosError.response?.data?.message || 'Failed to create employee');
      }
      return rejectWithValue('Failed to create employee');
    }
  }
);

interface UpdateEmployeeParams {
  id: string;
  data: Partial<CreateEmployeeData>;
}

export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, data }: UpdateEmployeeParams, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/employees/${id}`, data);
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        return rejectWithValue(axiosError.response?.data?.message || 'Failed to update employee');
      }
      return rejectWithValue('Failed to update employee');
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/employees/${id}`);
      return id;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        return rejectWithValue(axiosError.response?.data?.message || 'Failed to delete employee');
      }
      return rejectWithValue('Failed to delete employee');
    }
  }
);

export const resendInvite = createAsyncThunk(
  'employees/resendInvite',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/employees/${id}/invite/resend`);
      return { id, ...response.data };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        return rejectWithValue(axiosError.response?.data?.message || 'Failed to resend invite');
      }
      return rejectWithValue('Failed to resend invite');
    }
  }
);

export const revokeInvite = createAsyncThunk(
  'employees/revokeInvite',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.post(`/api/employees/${id}/invite/revoke`);
      return id;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        return rejectWithValue(axiosError.response?.data?.message || 'Failed to revoke invite');
      }
      return rejectWithValue('Failed to revoke invite');
    }
  }
);

export const bulkInvite = createAsyncThunk(
  'employees/bulkInvite',
  async (employees: CreateEmployeeData[], { rejectWithValue }) => {
    try {
      const response = await api.post('/api/employees/bulk-invite', { employees });
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        return rejectWithValue(axiosError.response?.data?.message || 'Failed to bulk invite');
      }
      return rejectWithValue('Failed to bulk invite');
    }
  }
);

interface EmployeeState {
  employees: Employee[];
  totalPages: number;
  currentPage: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  filters: {
    status: string;
    department: string;
    search: string;
  };
}

const initialState: EmployeeState = {
  employees: [],
  totalPages: 0,
  currentPage: 1,
  total: 0,
  isLoading: false,
  error: null,
  filters: {
    status: '',
    department: '',
    search: ''
  }
};

const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearEmployees: (state) => {
      state.employees = [];
      state.totalPages = 0;
      state.currentPage = 1;
      state.total = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Employees
      .addCase(fetchEmployees.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = action.payload.employees;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
        state.total = action.payload.total;
        state.error = null;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch employees';
      })
      // Create Employee
      .addCase(createEmployee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees.unshift(action.payload.employee);
        state.total += 1;
        state.error = null;
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || null;
      })
      // Update Employee
      .addCase(updateEmployee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.employees.findIndex((emp: Employee) => emp._id === action.payload._id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to update employee';
      })
      // Delete Employee
      .addCase(deleteEmployee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = state.employees.filter((emp: Employee) => emp._id !== action.payload);
        state.total -= 1;
        state.error = null;
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to delete employee';
      })
      // Resend Invite
      .addCase(resendInvite.fulfilled, (state, action) => {
        const index = state.employees.findIndex((emp: Employee) => emp._id === action.payload.id);
        if (index !== -1) {
          const employee = state.employees[index] as Employee & { invitation: { status: string; sentAt: Date } };
          employee.invitation.status = 'invited';
          employee.invitation.sentAt = new Date();
        }
      })
      // Revoke Invite
      .addCase(revokeInvite.fulfilled, (state, action) => {
        const index = state.employees.findIndex((emp: Employee) => emp._id === action.payload);
        if (index !== -1) {
          const employee = state.employees[index] as Employee & { invitation: { status: string } };
          employee.invitation.status = 'revoked';
        }
      });
  },
});

export const { setFilters, clearError, clearEmployees } = employeeSlice.actions;
export default employeeSlice.reducer;



