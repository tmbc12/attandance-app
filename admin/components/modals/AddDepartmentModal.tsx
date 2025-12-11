'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../lib/hooks/useRedux';
import { closeModal } from '../../lib/slices/uiSlice';
import { createDepartment, fetchDepartments } from '../../lib/slices/departmentSlice';
import { fetchEmployees } from '../../lib/slices/employeeSlice';
import toast from 'react-hot-toast';

interface DepartmentFormData {
  name: string;
  description: string;
  colorCode: string;
  manager?: string;
}

export default function AddDepartmentModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.modals.addDepartment);
  const isLoading = useAppSelector((state) => state.departments.isLoading);
  const employees = useAppSelector((state) => state.employees.employees);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<DepartmentFormData>();
  
  const colorCodeValue = watch('colorCode');

  // Fetch employees when modal opens
  useEffect(() => {
    if (isOpen) {
      // Fetch active employees for manager dropdown
      dispatch(fetchEmployees({ status: 'active', limit: 100 }));
    }
  }, [isOpen, dispatch]);

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      await dispatch(createDepartment({
        name: data.name,
        description: data.description || '',
        colorCode: data.colorCode || '',
        manager: data.manager || undefined,
      })).unwrap();

      toast.success('Department created successfully!');
      dispatch(closeModal('addDepartment'));
      reset();

      // Refresh departments list
      await dispatch(fetchDepartments());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create department';
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    dispatch(closeModal('addDepartment'));
    reset();
  };

  if (!isOpen) return null;

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
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Add New Department
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
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Department Name *
                  </label>
                  <input
                    {...register('name', { required: 'Department name is required' })}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-gray-400"
                    placeholder="Enter department name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-gray-400"
                    placeholder="Enter department description (optional)"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                {/* color code */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="colorCode" className="text-sm font-medium text-gray-700">
                    Color
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={colorCodeValue || '#000000'}
                        onChange={(e) => {
                          setValue('colorCode', e.target.value, { shouldValidate: true });
                        }}
                        className="h-10 w-12 cursor-pointer rounded-md border border-gray-300 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                      <input
                        {...register('colorCode', {
                          pattern: {
                            value: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
                            message: 'Please enter a valid hex color code (e.g., #000000)'
                          }
                        })}
                        type="text"
                        placeholder="#000000"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-black focus:outline-none focus:ring-1 focus:ring-black disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                    </div>
                    {errors.colorCode && (
                      <p className="text-sm text-red-600">{errors.colorCode.message}</p>
                    )}
                  </div>
                </div>

                {/* Manager */}
                <div>
                  <label htmlFor="manager" className="block text-sm font-medium text-gray-700">
                    Manager
                  </label>
                  <select
                    {...register('manager')}
                    className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_0.75rem_center] bg-no-repeat"
                  >
                    <option value="">Select Manager (Optional)</option>
                    {employees
                      .filter((emp) => emp.status === 'active')
                      .map((employee) => (
                        <option key={employee._id} value={employee._id}>
                          {employee.name} ({employee.email})
                        </option>
                      ))}
                  </select>
                  {employees.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">No active employees available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Department'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

