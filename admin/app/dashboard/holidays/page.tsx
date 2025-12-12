'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Calendar, Search, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../lib/hooks/useRedux';
import { fetchHolidays } from '../../../lib/slices/holidaySlice';
import { openModal } from '../../../lib/slices/uiSlice';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

const formatShortDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function HolidaysPage() {
  const dispatch = useAppDispatch();
  const { holidays, isLoading } = useAppSelector((state) => state.holidays);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    dispatch(fetchHolidays());
  }, [dispatch]);

  const handleAddHoliday = () => {
    dispatch(openModal({ modal: 'addHoliday' } as any));
  };

  const handleEditHoliday = (holiday: { _id: string; date: string; description?: string }) => {
    dispatch(openModal({ modal: 'editHoliday', data: holiday } as any));
  };

  const handleDeleteHoliday = (holiday: { _id: string; date: string; description?: string }) => {
    dispatch(openModal({ modal: 'deleteHolidayConfirm', data: holiday } as any));
  };

  const isPastHoliday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Filter and sort holidays
  const filteredAndSortedHolidays = useMemo(() => {
    let filtered = [...holidays];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((holiday) => {
        const description = (holiday.description || '').toLowerCase();
        const dateStr = formatShortDate(holiday.date).toLowerCase();
        const fullDateStr = formatDate(holiday.date).toLowerCase();
        return (
          description.includes(searchLower) ||
          dateStr.includes(searchLower) ||
          fullDateStr.includes(searchLower)
        );
      });
    }

    // Apply month filter
    if (selectedMonth) {
      filtered = filtered.filter((holiday) => {
        const date = new Date(holiday.date);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return month === selectedMonth;
      });
    }

    // Sort by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
  }, [holidays, searchTerm, selectedMonth]);

  // Get unique months from holidays for the dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    holidays.forEach((holiday) => {
      const date = new Date(holiday.date);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      months.add(month);
    });
    return Array.from(months).sort();
  }, [holidays]);

  const getMonthName = (monthNumber: string) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[parseInt(monthNumber) - 1];
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMonth('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holidays</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage organization holidays and public holidays.
          </p>
        </div>
        <button
          onClick={handleAddHoliday}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Holiday
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Filter */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by description or date..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Month Filter */}
          <div className="sm:w-48">
            <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_0.75rem_center] bg-no-repeat"
            >
              <option value="">All Months</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {getMonthName(month)}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(searchTerm || selectedMonth) && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Active Filters Info */}
        {(searchTerm || selectedMonth) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <span>Showing {filteredAndSortedHolidays.length} of {holidays.length} holidays</span>
            {searchTerm && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Search: "{searchTerm}"
              </span>
            )}
            {selectedMonth && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Month: {getMonthName(selectedMonth)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Holidays List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredAndSortedHolidays.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedHolidays.map((holiday) => {
            const isPast = isPastHoliday(holiday.date);
            return (
              <div
                key={holiday._id}
                className={`bg-white overflow-hidden shadow rounded-lg border ${
                  isPast ? 'border-gray-200 opacity-75' : 'border-gray-200 hover:shadow-md'
                } transition-shadow`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Calendar className={`h-5 w-5 ${isPast ? 'text-gray-400' : 'text-blue-600'}`} />
                        <h3 className={`text-lg font-medium ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>
                          {formatShortDate(holiday.date)}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(holiday.date)}
                      </p>
                      {holiday.description && (
                        <p className={`mt-2 text-sm ${isPast ? 'text-gray-400' : 'text-gray-600'}`}>
                          {holiday.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <button
                        onClick={() => handleEditHoliday(holiday)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit Holiday"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHoliday(holiday)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete Holiday"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {isPast && (
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Past
                      </span>
                    </div>
                  )}
                  {!isPast && (
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Upcoming
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : holidays.length > 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">No holidays match your filters</p>
          <p className="mt-1 text-sm text-gray-400">
            Try adjusting your search or month filter
          </p>
          {(searchTerm || selectedMonth) && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">No holidays found</p>
          <p className="mt-1 text-sm text-gray-400">Add a holiday to get started</p>
        </div>
      )}
    </div>
  );
}
