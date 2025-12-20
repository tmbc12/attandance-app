'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../lib/hooks/useRedux';
import { Users, BarChart3, Settings, Briefcase, X, Home, FileEdit, Calendar, CheckSquare, CalendarCheck, TreePalm } from 'lucide-react';
import { toggleSidebar } from '../../lib/slices/uiSlice';
import { ROUTES, COMPANY_NAME } from '../../lib/constants';
import Image from 'next/image';

const navigation = [
  { name: 'Dashboard', href: ROUTES.DASHBOARD, icon: Home },
  { name: 'Attendance', href: '/dashboard/attendance', icon: Calendar },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Employees', href: ROUTES.EMPLOYEES, icon: Users },
  { name: 'Departments', href: '/dashboard/departments', icon: Briefcase },
  { name: 'Holidays', href: '/dashboard/holidays', icon:  TreePalm },
  { name: 'Corrections', href: '/dashboard/corrections', icon: FileEdit },
  { name: 'Reports', href: ROUTES.REPORTS, icon: BarChart3 },
  { name: 'Settings', href: ROUTES.SETTINGS, icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          {/* <h1 className="text-xl font-bold text-gray-900">{COMPANY_NAME} Admin</h1> */}
          <div className="flex items-center justify-center">
            <Image
              src="/text_light.png"
              alt="Logo"
              width={100}
              height={30}
              className="object-contain w-auto"
            />
            </div>
          <button
            className="lg:hidden"
            onClick={() => dispatch(toggleSidebar())}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">A</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">admin@tmbc.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
