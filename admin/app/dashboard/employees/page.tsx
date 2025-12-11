'use client';

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// import { useSession } from 'next-auth/react';
import { fetchEmployees, setFilters } from '../../../lib/slices/employeeSlice';
import { fetchDepartments } from '../../../lib/slices/departmentSlice';
import { openModal } from '../../../lib/slices/uiSlice';
import {
  Plus,
  Search,
  Download,
  Mail,
  Copy,
  Trash2,
  Edit
} from 'lucide-react';
import { RootState, Employee } from '../../../types';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import api from '../../../lib/api';

export default function EmployeesPage() {
  const dispatch = useDispatch<ThunkDispatch<RootState, undefined, UnknownAction>>();
  const { employees, total, isLoading, filters } = useSelector((state: RootState) => state.employees);
  const departments = useSelector((state: RootState) => state.departments.departments);
  const [searchQuery, setSearchQuery] = useState(filters.search);

  useEffect(() => {
    dispatch(fetchDepartments());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(fetchEmployees(filters as any));
  }, [dispatch, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setFilters({ search: searchQuery }));
  };

  const handleFilterChange = (key: string, value: string) => {
    dispatch(setFilters({ [key]: value }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      suspended: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  interface Invitation {
    status: 'invited' | 'accepted' | 'expired' | 'revoked';
  }

  const getInviteStatusBadge = (invitation: Invitation | null) => {
    if (!invitation) return null;

    const statusConfig = {
      invited: { color: 'bg-blue-100 text-blue-800', label: 'Invited' },
      accepted: { color: 'bg-green-100 text-green-800', label: 'Accepted' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' },
      revoked: { color: 'bg-gray-100 text-gray-800', label: 'Revoked' },
    };

    const config = statusConfig[invitation.status as keyof typeof statusConfig] || statusConfig.invited;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleCopyInviteLink = async (employee: Employee) => {
    try {
      // Resend invite to get a fresh token
      const response = await api.post(`/api/employees/${employee._id}/invite/resend`);

      if (response.data.invite?.token) {
        // Create deep link URL for mobile app
        const inviteLink = `tmbc://register?token=${response.data.invite.token}`;
        await navigator.clipboard.writeText(inviteLink);
        alert('Invite link copied to clipboard! Share this link with the employee.');
      } else {
        alert('Failed to get invite token');
      }
      } catch (error: unknown) {
        console.error('Error copying invite link:', error);
        const errorMessage = error instanceof Error && 'response' in error 
          ? (error as { response: { data: { message: string } } }).response.data.message 
          : 'Failed to copy invite link';
        alert(errorMessage);
      }
  };

  const handleResendInvite = async (employeeId: string) => {
    if (!confirm('Are you sure you want to resend the invitation?')) return;

    try {
      await api.post(`/api/employees/${employeeId}/invite/resend`);
      alert('Invitation resent successfully!');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(fetchEmployees(filters as any));
      } catch (error: unknown) {
        console.error('Error resending invite:', error);
        const errorMessage = error instanceof Error && 'response' in error 
          ? (error as { response: { data: { message: string } } }).response.data.message 
          : 'Failed to resend invitation';
        alert(errorMessage);
      }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    dispatch(openModal({ modal: 'deleteConfirm', data: employee }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your team members and their invitations.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => dispatch(openModal({ modal: 'bulkInvite' }))}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Bulk Invite
          </button>
          <button
            onClick={() => dispatch(openModal({ modal: 'addEmployee' }))}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="md:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </form>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_0.75rem_center] bg-no-repeat"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Department Filter */}
          <select
            value={
              filters.department && departments.length > 0 && departments.some((dept: { _id: string }) => dept._id === filters.department)
                ? filters.department
                : ''
            }
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_0.75rem_center] bg-no-repeat"
          >
            <option value="">All Departments</option>
            {departments
              .filter((dept: { isActive: boolean }) => dept.isActive)
              .map((department: { _id: string; name: string }) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : employees.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {employees.map((employee: Employee) => (
              <li key={employee._id}>
                <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                     onClick={() => dispatch(openModal({ modal: 'employeeDetails', data: employee }))}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {employee.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {employee.name}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-500">{employee.email}</p>
                        {employee.department && (
                          <>
                            <span className="text-sm text-gray-400">•</span>
                            <p className="text-sm text-gray-500">
                              {typeof employee.department === 'string' 
                                ? employee.department 
                                : (employee.department as { _id: string; name: string }).name}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end space-y-2">
                      {getStatusBadge(employee.status)}
                      {employee.invitation && getInviteStatusBadge(employee.invitation)}
                    </div>
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      {employee.invitation?.status === 'invited' && (
                        <>
                          <button
                            onClick={() => handleResendInvite(employee._id)}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title="Resend Invite"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCopyInviteLink(employee)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Copy Invite Link"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          dispatch(openModal({ modal: 'editEmployee', data: employee }));
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="Edit Employee"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEmployee(employee);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete Employee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No employees</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first employee.
            </p>
            <div className="mt-6">
              <button
                onClick={() => dispatch(openModal({ modal: 'addEmployee' }))}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 10 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Previous
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to{' '}
                <span className="font-medium">{Math.min(10, total)}</span> of{' '}
                <span className="font-medium">{total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  Previous
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
