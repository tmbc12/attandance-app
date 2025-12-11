'use client';

import { useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../lib/hooks/useRedux';
import { fetchDepartments } from '../../../lib/slices/departmentSlice';
import { openModal } from '../../../lib/slices/uiSlice';

export default function DepartmentsPage() {
  const dispatch = useAppDispatch();
  const { departments, isLoading } = useAppSelector((state) => state.departments);

  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [editingDepartment, setEditingDepartment] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    dispatch(fetchDepartments());
  }, [dispatch]);

  const handleAddDepartment = () => {
    dispatch(openModal({ modal: 'addDepartment' }));
  };

  const handleEditDepartment = (dept: { _id: string; name: string; description?: string; manager?: { _id: string; name: string; email: string } }) => {
    dispatch(openModal({ modal: 'editDepartment', data: dept as any }));
  };

  const handleDeleteDepartment = (dept: { _id: string; name: string; description?: string; employeeCount?: number }) => {
    dispatch(openModal({ modal: 'deleteDepartmentConfirm', data: dept as any }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage departments and organizational structure.
          </p>
        </div>
        <button
          onClick={handleAddDepartment}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </button>
      </div>

      {/* Departments Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : departments.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div
              key={dept._id}
              className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{dept.name}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditDepartment(dept)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Edit Department"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(dept)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete Department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">{dept.description}</p>
                <div className="mt-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {dept.employeeCount} employees
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No departments found</p>
        </div>
      )}
    </div>
  );
}
