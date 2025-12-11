'use client';

import { Clock, User, Calendar } from 'lucide-react';

interface Task {
  _id: string;
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId: string;
    department?: string | { name: string };
  };
  history: Array<{
    title: string;
    description: string;
    createdAt: Date | string;
  }>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'paused';
  timeTracking: {
    totalSeconds: number;
  };
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskCardProps {
  task: Task;
}

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'high':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'medium':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'low':
      return 'bg-green-50 text-green-700 border-green-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'in_progress':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'paused':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
};

export default function TaskCard({ task }: TaskCardProps) {
  const lastHistory = task.history && task.history.length > 0 ? task.history[task.history.length - 1] : null;
  const title = lastHistory?.title || 'No title';
  const description = lastHistory?.description || '';

  return (
    <div className="group relative bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-3">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
          </div>
          
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${getPriorityColor(task.priority)}`}>
              <span className="text-[10px]">{getPriorityIcon(task.priority)}</span>
              {task.priority.toUpperCase()}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md border ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}

      {/* Footer Section */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Employee Info */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-sm ring-2 ring-white">
                <span className="text-sm font-bold text-white">
                  {task.employee.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{task.employee.name}</span>
              </div>
              <span className="text-xs text-gray-500 font-mono">{task.employee.employeeId}</span>
            </div>
          </div>

          {/* Time Tracking */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-md border border-blue-100">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">
              {formatDuration(task.timeTracking.totalSeconds)}
            </span>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(task.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

