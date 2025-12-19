'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { X, Plus, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../lib/hooks/useRedux';
import { closeModal } from '../../lib/slices/uiSlice';
import toast from 'react-hot-toast';

/* ------------------ Types ------------------ */

interface TaskItem {
  task: string;
  employeeId: string;
}

interface AssignTaskForm {
  tasks: TaskItem[];
}

/* ------------------ Mock Data ------------------ */

const mockEmployees = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Sarah Smith' },
  { id: '3', name: 'Alex Johnson' },
];

/* ------------------ Component ------------------ */

export default function AssignTaskModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.modals.assignTask);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignTaskForm>({
    defaultValues: {
      tasks: [{ task: '', employeeId: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tasks',
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        tasks: [{ task: '', employeeId: '' }],
      });
    }
  }, [isOpen, reset]);

  const onSubmit = (data: AssignTaskForm) => {
    console.log('Assigned Tasks:', data);
    toast.success('Tasks assigned successfully (mock)');
    dispatch(closeModal('assignTask'));
  };

  const handleClose = () => {
    dispatch(closeModal('assignTask'));
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Assign Tasks</h2>
            <button type="button" onClick={handleClose}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-2 gap-4 items-start">
                {/* Task Input */}
                <div>
                  <input
                    {...register(`tasks.${index}.task`, {
                      required: 'Task is required',
                    })}
                    placeholder="Enter task"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.tasks?.[index]?.task && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.tasks[index]?.task?.message}
                    </p>
                  )}
                </div>

                {/* Employee Select */}
                <div>
                  <select
                    {...register(`tasks.${index}.employeeId`, {
                      required: 'Employee is required',
                    })}
                    className="w-full px-3 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select employee</option>
                    {mockEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                  {errors.tasks?.[index]?.employeeId && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.tasks[index]?.employeeId?.message}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Add More Button */}
            <button
              type="button"
              onClick={() => append({ task: '', employeeId: '' })}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Assign more task
            </button>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Assign Tasks
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
