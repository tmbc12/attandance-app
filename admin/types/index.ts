export interface RootState {
  ui: {
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
    };
    selectedEmployee: Employee | null;
    selectedDepartment: {
      _id: string;
      name: string;
      description: string;
      colorCode?: string;
      manager?: {
        _id: string;
        name: string;
        email: string;
      };
      employeeCount: number;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    } | null;
    loading: {
      global: boolean;
      employees: boolean;
      invites: boolean;
    };
  };
  employees: {
    employees: Employee[];
    total: number;
    page: number;
    limit: number;
    isLoading: boolean;
    error: string | null;
    filters: {
      search: string;
      status?: string;
      department?: string;
    };
  };
  departments: {
    departments: Array<{
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
    }>;
    isLoading: boolean;
    error: string | null;
  };
}

export interface Employee {
  _id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin' | 'tl';
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
  updatedAt: string;
  phone?: string;
  designation: string;
  department?: string | { _id: string; name: string };
  invitation?: {
    status: 'invited' | 'accepted' | 'expired' | 'revoked';
  };
}

export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}
