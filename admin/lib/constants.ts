// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Teambo';
export const COMPANY_WEBSITE = process.env.NEXT_PUBLIC_COMPANY_WEBSITE || 'https://yourcompany.com';

// Session Configuration
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days (1 month) in seconds

// Route Paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  DASHBOARD: '/dashboard',
  EMPLOYEES: '/dashboard/employees',
  EMPLOYEES_ADD: '/dashboard/employees/add',
  REPORTS: '/dashboard/reports',
  SETTINGS: '/dashboard/settings',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
  },
  EMPLOYEES: {
    LIST: '/api/employees',
    CREATE: '/api/employees',
    UPDATE: (id: string) => `/api/employees/${id}`,
    DELETE: (id: string) => `/api/employees/${id}`,
  },
  DEPARTMENTS: {
    LIST: '/api/departments',
    CREATE: '/api/departments',
    GET: (id: string) => `/api/departments/${id}`,
    UPDATE: (id: string) => `/api/departments/${id}`,
    DELETE: (id: string) => `/api/departments/${id}`,
  },
  HOLIDAYS: {
    LIST: '/api/holidays',
    CREATE: '/api/holidays',
    GET: (id: string) => `/api/holidays/${id}`,
    UPDATE: (id: string) => `/api/holidays/${id}`,
    DELETE: (id: string) => `/api/holidays/${id}`,
  },
  TASKS: {
    ASSIGN: '/api/tasks/assign',
    LIST: '/api/tasks',
  },
} as const;

// Employee Status
export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  INACTIVE: 'inactive',
} as const;

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  TEAM_LEAD: 'team_lead',
} as const;

// Permissions
export const PERMISSIONS = {
  MANAGE_EMPLOYEES: 'manage_employees',
  MANAGE_INVITES: 'manage_invites',
  VIEW_REPORTS: 'view_reports',
  MANAGE_SETTINGS: 'manage_settings',
  BULK_OPERATIONS: 'bulk_operations',
} as const;
