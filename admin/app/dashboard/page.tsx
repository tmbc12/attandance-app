'use client';

import { useEffect } from 'react';
import { Users, UserPlus, Clock, CheckCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../lib/hooks/useRedux';
import { fetchEmployees } from '../../lib/slices/employeeSlice';
import { Employee } from '../../types';

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { employees, total, isLoading } = useAppSelector((state) => state.employees);

  // Cast employees to the correct type
  const typedEmployees = employees as Employee[];

  useEffect(() => {
    dispatch(fetchEmployees({ limit: 5 }));
  }, [dispatch]);

  const stats = [
    {
      name: 'Total Employees',
      value: total,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Pending Invites',
      value: typedEmployees.filter((emp) => emp.status === 'pending').length,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      name: 'Active Employees',
      value: typedEmployees.filter((emp) => emp.status === 'active').length,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      name: 'New This Month',
      value: typedEmployees.filter((emp) => {
        const created = new Date(emp.createdAt);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length,
      icon: UserPlus,
      color: 'bg-purple-500',
    },
  ];

  const recentEmployees = typedEmployees.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here&apos;s what&apos;s happening with your employees.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`rounded-md p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {isLoading ? '...' : stat.value}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Employees */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Employees
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : recentEmployees.length > 0 ? (
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentEmployees.map((employee) => (
                  <li key={employee._id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {employee.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {employee.email}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          employee.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : employee.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {employee.status}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No employees</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first employee.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
