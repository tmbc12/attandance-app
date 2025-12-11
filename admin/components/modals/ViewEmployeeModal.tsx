'use client';

import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../lib/hooks/useRedux';
import { closeModal } from '../../lib/slices/uiSlice';
import { Employee } from '@/types';

export default function ViewEmployeeModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.modals.employeeDetails);
  const selectedEmployee = useAppSelector((state) => state.ui.selectedEmployee);

  const handleClose = () => {
    dispatch(closeModal('employeeDetails'));
  };

  if (!isOpen || !selectedEmployee) return null;

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

  const getInviteStatusBadge = (invitation: {status:'invited' | 'accepted' | 'expired' | 'revoked'}) => {
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Employee Details
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 sm:text-sm text-gray-900">
                  {selectedEmployee.name}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Work Email
                </label>
                <div className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 sm:text-sm text-gray-900">
                  {selectedEmployee.email}
                </div>
              </div>

              {/* Phone */}
              {selectedEmployee.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <div className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 sm:text-sm text-gray-900">
                    {selectedEmployee.phone}
                  </div>
                </div>
              )}

              {/* Department */}
              {selectedEmployee.department && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <div className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 sm:text-sm text-gray-900">
                    {typeof selectedEmployee.department === 'string' 
                      ? selectedEmployee.department 
                      : selectedEmployee.department.name}
                  </div>
                </div>
              )}

              {/* Designation */}
              {(selectedEmployee as Employee).designation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Job Title
                  </label>
                  <div className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 sm:text-sm text-gray-900">
                    {(selectedEmployee as any).designation}
                  </div>
                </div>
              )}

              {/* Role */}
              {(selectedEmployee as Employee).role && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <div className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 sm:text-sm text-gray-900 capitalize">
                    {(selectedEmployee as Employee).role}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div>
                  {getStatusBadge(selectedEmployee.status)}
                </div>
              </div>

              {/* Invitation Status */}
              {selectedEmployee.invitation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invitation Status
                  </label>
                  <div>
                    {getInviteStatusBadge(selectedEmployee.invitation)}
                  </div>
                </div>
              )}

              {/* Created Date */}
              {selectedEmployee.createdAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Created At
                  </label>
                  <div className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 sm:text-sm text-gray-900">
                    {new Date(selectedEmployee.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





