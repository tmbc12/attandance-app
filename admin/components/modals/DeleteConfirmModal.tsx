'use client';

import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../lib/hooks/useRedux';
import { closeModal } from '../../lib/slices/uiSlice';
import { deleteEmployee, fetchEmployees } from '../../lib/slices/employeeSlice';
import toast from 'react-hot-toast';

export default function DeleteConfirmModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.modals.deleteConfirm);
  const isLoading = useAppSelector((state) => state.employees.isLoading);
  const selectedEmployee = useAppSelector((state) => state.ui.selectedEmployee);
  const filters = useAppSelector((state) => state.employees.filters);

  const handleClose = () => {
    dispatch(closeModal('deleteConfirm'));
  };

  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;

    try {
      await dispatch(deleteEmployee(selectedEmployee._id)).unwrap();
      toast.success('Employee deleted successfully!');
      dispatch(closeModal('deleteConfirm'));
      
      // Refresh employees list
      await dispatch(fetchEmployees(filters));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete employee';
      toast.error(errorMessage);
    }
  };

  if (!isOpen || !selectedEmployee) return null;

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
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <h3 className="ml-3 text-lg leading-6 font-medium text-gray-900">
                  Delete Employee
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete <span className="font-medium text-gray-900">{selectedEmployee.name}</span>? 
                This action cannot be undone.
              </p>
              {selectedEmployee.email && (
                <p className="mt-2 text-sm text-gray-500">
                  Email: <span className="font-medium text-gray-700">{selectedEmployee.email}</span>
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Employee'
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





