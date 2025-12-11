'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Calendar, CheckSquare, User, Mail, Phone, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Search, Edit, Trash2, Download } from 'lucide-react';
import api from '../../../../lib/api';

interface AttendanceRecord {
  _id: string;
  date: string;
  checkIn?: {
    time: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  checkOut?: {
    time: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  workingHours: number;
  isLate: boolean;
  lateBy: number;
  status: 'present' | 'absent' | 'late' | 'partial';
}

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  timeTracking: {
    totalSeconds: number;
    currentSessionStart?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string | { _id: string; name: string };
  status: string;
  createdAt: string;
}

export default function EmployeeDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'tasks'>('overview');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    averageHours: 0
  });

  // Attendance filtering
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Task filtering
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskDateFilter, setTaskDateFilter] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskEndDate, setTaskEndDate] = useState('');

  const loadEmployeeData = async () => {
    setIsLoading(true);
    try {
      // Load employee details
      const employeeResponse = await api.get(`/api/employees/${employeeId}`);
      setEmployee(employeeResponse.data);

      // Load attendance records
      const attendanceResponse = await api.get(`/api/attendance/employee/${employeeId}`);
      setAttendanceRecords(attendanceResponse.data.records || []);

      // Load tasks
      const tasksResponse = await api.get(`/api/tasks/employee/${employeeId}`);
      setTasks(tasksResponse.data.tasks || []);

      if (attendanceResponse.data.statistics) {
        setAttendanceStats({
          totalDays: attendanceResponse.data.statistics.totalDays,
          presentDays: attendanceResponse.data.statistics.presentDays,
          absentDays: attendanceResponse.data.statistics.absentDays,
          lateDays: attendanceResponse.data.statistics.lateDays,
          averageHours: attendanceResponse.data.statistics.averageHours
        });
      } else {
        const stats = calculateAttendanceStats(attendanceResponse.data.records || []);
        setAttendanceStats(stats);
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, [employeeId]);

  const calculateAttendanceStats = (records: AttendanceRecord[]) => {
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const totalHours = records.reduce((sum, r) => sum + r.workingHours, 0);
    const averageHours = totalDays > 0 ? totalHours / totalDays : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      averageHours
    };
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'late':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const exportToExcel = () => {
    const filtered = getFilteredAttendance();

    if (filtered.length === 0) {
      alert('No attendance records to export');
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Day', 'Check In', 'Check Out', 'Working Hours', 'Status', 'Late By'];
    const rows = filtered.map(record => {
      const date = new Date(record.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      return [
        formatDate(record.date),
        dayName,
        record.checkIn ? formatTime(record.checkIn.time) : '-',
        record.checkOut ? formatTime(record.checkOut.time) : '-',
        record.workingHours.toFixed(2),
        record.status.toUpperCase(),
        record.isLate ? `${record.lateBy} min` : '-'
      ];
    });

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${employee?.name}_attendance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTasksToExcel = () => {
    const filtered = getFilteredTasks();

    if (filtered.length === 0) {
      alert('No tasks to export');
      return;
    }

    // Create CSV content
    const headers = ['Title', 'Description', 'Priority', 'Status', 'Time Spent', 'Created Date', 'Updated Date'];
    const rows = filtered.map(task => {
      return [
        task.title,
        task.description,
        task.priority.toUpperCase(),
        task.status.replace('_', ' ').toUpperCase(),
        formatDuration(task.timeTracking.totalSeconds),
        new Date(task.createdAt).toLocaleDateString(),
        new Date(task.updatedAt).toLocaleDateString()
      ];
    });

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${employee?.name}_tasks_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilteredAttendance = () => {
    let filtered = attendanceRecords;

    if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(r => new Date(r.date) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(r => new Date(r.date) >= monthAgo);
    } else if (dateFilter === 'custom' && startDate && endDate) {
      filtered = filtered.filter(r => {
        const date = new Date(r.date);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    }

    return filtered;
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    if (taskFilter !== 'all') {
      filtered = filtered.filter(task => task.status === taskFilter);
    }

    if (taskSearch) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        task.description.toLowerCase().includes(taskSearch.toLowerCase())
      );
    }

    // Date filtering
    if (taskDateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(t => new Date(t.createdAt) >= weekAgo);
    } else if (taskDateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(t => new Date(t.createdAt) >= monthAgo);
    } else if (taskDateFilter === 'custom' && taskStartDate && taskEndDate) {
      filtered = filtered.filter(t => {
        const date = new Date(t.createdAt);
        return date >= new Date(taskStartDate) && date <= new Date(taskEndDate);
      });
    }

    return filtered;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Employee not found</h3>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-2xl font-semibold text-white">
              {employee.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
            <p className="text-sm text-gray-500">{employee.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'attendance', label: 'Attendance', icon: Calendar },
              { id: 'tasks', label: 'Tasks', icon: CheckSquare }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'attendance' | 'tasks')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-700">{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-700">{employee.phone}</span>
                      </div>
                    )}
                    {employee.department && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-700">
                          {typeof employee.department === 'string'
                            ? employee.department
                            : employee.department.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attendance Summary */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{attendanceStats.presentDays}</div>
                      <div className="text-sm text-gray-600 mt-1">Present Days</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-3xl font-bold text-red-600">{attendanceStats.absentDays}</div>
                      <div className="text-sm text-gray-600 mt-1">Absent Days</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-3xl font-bold text-yellow-600">{attendanceStats.lateDays}</div>
                      <div className="text-sm text-gray-600 mt-1">Late Days</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{attendanceStats.averageHours.toFixed(1)}h</div>
                      <div className="text-sm text-gray-600 mt-1">Avg Hours</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {attendanceRecords.slice(0, 7).map((record) => (
                    <div key={record._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(record.status)}
                        <div>
                          <div className="font-medium text-gray-900">{formatDate(record.date)}</div>
                          <div className="text-sm text-gray-500">
                            {record.checkIn && formatTime(record.checkIn.time)}
                            {record.checkOut && ` - ${formatTime(record.checkOut.time)}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {record.workingHours.toFixed(1)}h
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as 'all' | 'week' | 'month' | 'custom')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  {dateFilter === 'custom' && (
                    <>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </>
                  )}
                </div>

                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export to Excel
                </button>
              </div>

              {/* Attendance List */}
              <div className="space-y-3">
                {getFilteredAttendance().length > 0 ? (
                  getFilteredAttendance().map((record) => (
                    <div key={record._id} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          {getStatusIcon(record.status)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-gray-900">{formatDate(record.date)}</div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                record.status === 'present' ? 'bg-green-100 text-green-800' :
                                record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {record.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                              <div>
                                <span className="text-gray-500">Check In:</span>
                                <div className="font-medium text-gray-900">
                                  {record.checkIn ? formatTime(record.checkIn.time) : '-'}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Check Out:</span>
                                <div className="font-medium text-gray-900">
                                  {record.checkOut ? formatTime(record.checkOut.time) : '-'}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Working Hours:</span>
                                <div className="font-medium text-gray-900">
                                  {record.workingHours.toFixed(1)}h
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No attendance records</h3>
                    <p className="text-gray-500 mt-1">No records found for the selected period</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={exportTasksToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export to Excel
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <select
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value as 'all' | 'pending' | 'in_progress' | 'completed')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Tasks</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <select
                    value={taskDateFilter}
                    onChange={(e) => setTaskDateFilter(e.target.value as 'all' | 'week' | 'month' | 'custom')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  {taskDateFilter === 'custom' && (
                    <>
                      <input
                        type="date"
                        value={taskStartDate}
                        onChange={(e) => setTaskStartDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="date"
                        value={taskEndDate}
                        onChange={(e) => setTaskEndDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Task Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
                  <div className="text-sm text-blue-600 mt-1">Total Tasks</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {tasks.filter(t => t.status === 'completed').length}
                  </div>
                  <div className="text-sm text-green-600 mt-1">Completed</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {tasks.filter(t => t.status === 'in_progress').length}
                  </div>
                  <div className="text-sm text-yellow-600 mt-1">In Progress</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {tasks.filter(t => t.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Pending</div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-4">
                {getFilteredTasks().length > 0 ? (
                  getFilteredTasks().map((task) => (
                    <div key={task._id} className="bg-gray-50 p-5 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{task.title}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                          <div className="flex items-center space-x-6 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatDuration(task.timeTracking.totalSeconds)}
                            </span>
                            <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                            <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
                    <p className="text-gray-500 mt-1">
                      {taskSearch ? 'Try adjusting your search criteria' : 'No tasks assigned yet'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
