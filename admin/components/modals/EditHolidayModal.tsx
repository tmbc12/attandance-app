'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../lib/hooks/useRedux';
import { closeModal } from '../../lib/slices/uiSlice';
import { updateHoliday, fetchHolidays } from '../../lib/slices/holidaySlice';
import toast from 'react-hot-toast';

interface HolidayFormData {
  date: string;
  description: string;
}

export default function EditHolidayModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.modals.editHoliday);
  const isLoading = useAppSelector((state) => state.holidays.isLoading);
  const selectedHoliday = useAppSelector((state) => state.ui.selectedHoliday);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<HolidayFormData>();

  // Populate form when holiday data is available
  useEffect(() => {
    if (selectedHoliday && isOpen) {
      // Format date to YYYY-MM-DD for input
      const date = new Date(selectedHoliday.date);
      const formattedDate = date.toISOString().split('T')[0];
      
      reset({
        date: formattedDate,
        description: selectedHoliday.description || '',
      });
    }
  }, [selectedHoliday, isOpen, reset]);

  const onSubmit = async (data: HolidayFormData) => {
    if (!selectedHoliday) return;

    try {
      await dispatch(updateHoliday({
        id: selectedHoliday._id,
        data: {
          date: data.date,
          description: data.description || undefined,
        },
      })).unwrap();

      toast.success('Holiday updated successfully!');
      dispatch(closeModal('editHoliday' as any));
      
      // Refresh holidays list
      await dispatch(fetchHolidays());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update holiday';
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    dispatch(closeModal('editHoliday' as any));
    reset();
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
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Edit Holiday
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
                {/* Date */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date *
                  </label>
                  <input
                    {...register('date', { required: 'Date is required' })}
                    type="date"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-gray-400"
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
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
                    placeholder="Enter holiday description (optional)"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
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
                    Updating...
                  </>
                ) : (
                  'Update Holiday'
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
