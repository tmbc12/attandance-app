import { createSlice } from '@reduxjs/toolkit';
import { Employee, Notification } from '../../types';

interface Department {
  _id: string;
  name: string;
  description: string;
  colorCode: string;
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

interface Holiday {
  _id: string;
  date: string;
  description?: string;
  organizationId: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UiState {
  sidebarOpen: boolean;
  theme: string;
  notifications: Notification[];
  modals: {
    addEmployee: boolean;
    editEmployee: boolean;
    addDepartment: boolean;
    editDepartment: boolean;
    bulkInvite: boolean;
    employeeDetails: boolean;
    deleteConfirm: boolean;
    deleteDepartmentConfirm: boolean;
    addHoliday: boolean;
    editHoliday: boolean;
    deleteHolidayConfirm: boolean;
  };
  selectedEmployee: Employee | null;
  selectedDepartment: Department | null;
  selectedHoliday: Holiday | null;
  loading: {
    global: boolean;
    employees: boolean;
    invites: boolean;
  };
}

const initialState: UiState = {
  sidebarOpen: true,
  theme: 'light',
  notifications: [],
  modals: {
    addEmployee: false,
    editEmployee: false,
    addDepartment: false,
    editDepartment: false,
    bulkInvite: false,
    employeeDetails: false,
    deleteConfirm: false,
    deleteDepartmentConfirm: false,
    addHoliday: false,
    editHoliday: false,
    deleteHolidayConfirm: false
  },
  selectedEmployee: null,
  selectedDepartment: null,
  selectedHoliday: null,
  loading: {
    global: false,
    employees: false,
    invites: false
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    addNotification: (state, action) => {
      const notification = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...action.payload
      };
      state.notifications.unshift(notification);
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    openModal: (state, action: { payload: { modal: keyof UiState['modals']; data?: Employee | Department | Holiday } }) => {
      const { modal, data } = action.payload;
      state.modals[modal] = true;
      if (data) {
        if (modal === 'editDepartment' || modal === 'addDepartment' || modal === 'deleteDepartmentConfirm') {
          state.selectedDepartment = data as Department;
        } else if (modal === 'editHoliday' || modal === 'deleteHolidayConfirm') {
          state.selectedHoliday = data as Holiday;
        } else {
          state.selectedEmployee = data as Employee;
        }
      }
    },
    closeModal: (state, action: { payload: keyof UiState['modals'] }) => {
      const modal = action.payload;
      state.modals[modal] = false;
      if (modal === 'employeeDetails' || modal === 'deleteConfirm' || modal === 'editEmployee') {
        state.selectedEmployee = null;
      }
      if (modal === 'editDepartment' || modal === 'deleteDepartmentConfirm' || modal === 'addDepartment') {
        state.selectedDepartment = null;
      }
      if (modal === 'editHoliday' || modal === 'deleteHolidayConfirm' || modal === 'addHoliday') {
        state.selectedHoliday = null;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(modal => {
        state.modals[modal as keyof UiState['modals']] = false;
      });
      state.selectedEmployee = null;
      state.selectedDepartment = null;
      state.selectedHoliday = null;
    },
    setSelectedEmployee: (state, action) => {
      state.selectedEmployee = action.payload;
    },
    setLoading: (state, action: { payload: { key: keyof UiState['loading']; value: boolean } }) => {
      const { key, value } = action.payload;
      state.loading[key] = value;
    }
  }
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
  closeAllModals,
  setSelectedEmployee,
  setLoading
} = uiSlice.actions;

export default uiSlice.reducer;



