'use client';

import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../lib/hooks/useRedux';
import { closeModal } from '../../lib/slices/uiSlice';
import { deleteHoliday, fetchHolidays } from '../../lib/slices/holidaySlice';
import toast from 'react-hot-toast';

const formatShortDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function DeleteHolidayConfirmModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.modals.deleteHolidayConfirm);
  const isLoading = useAppSelector((state) => state.holidays.isLoading);
  const selectedHoliday = useAppSelector((state) => state.ui.selectedHoliday);

  const handleClose = () => {
    dispatch(closeModal('deleteHolidayConfirm' as any));
  };

  const handleConfirmDelete = async () => {
    if (!selectedHoliday) return;

    try {
      await dispatch(deleteHoliday(selectedHoliday._id)).unwrap();
      toast.success('Holiday deleted successfully!');
      dispatch(closeModal('deleteHolidayConfirm' as any));
      
      // Refresh holidays list
      await dispatch(fetchHolidays());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete holiday';
      toast.error(errorMessage);
    }
  };

  if (!isOpen || !selectedHoliday) return null;

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
                  Delete Holiday
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
                Are you sure you want to delete the holiday on <span className="font-medium text-gray-900">{formatShortDate(selectedHoliday.date)}</span>? 
                This action cannot be undone.
              </p>
              {selectedHoliday.description && (
                <p className="mt-2 text-sm text-gray-500">
                  Description: <span className="font-medium text-gray-700">{selectedHoliday.description}</span>
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
                'Delete Holiday'
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
