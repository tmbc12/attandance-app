"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { X, Plus, Calendar, User, Tag, AlertCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/useRedux";
import { closeModal } from "@/lib/slices/uiSlice";

/* ------------------ Types ------------------ */

type Priority = "low" | "medium" | "high" | "urgent";

interface TaskItem {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  tags: string;
  employeeId: string;
}

interface AssignTaskForm {
  tasks: TaskItem[];
}

/* ------------------ Mock Data ------------------ */

const mockEmployees = [
  { id: "1", name: "John Doe", role: "Developer" },
  { id: "2", name: "Sarah Smith", role: "Designer" },
  { id: "3", name: "Alex Johnson", role: "Manager" },
];

/* ------------------ Component ------------------ */

export default function AssignTaskModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.modals.assignTask);
  const { employees } = useAppSelector((state) => state.employees);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignTaskForm>({
    defaultValues: {
      tasks: [
        {
          title: "",
          description: "",
          priority: "medium",
          dueDate: "",
          tags: "",
          employeeId: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tasks",
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        tasks: [
          {
            title: "",
            description: "",
            priority: "medium",
            dueDate: "",
            tags: "",
            employeeId: "",
          },
        ],
      });
    }
  }, [isOpen, reset]);

  const onSubmit = (data: AssignTaskForm) => {
    console.log("Assigned Tasks:", data);
    alert("Tasks assigned successfully!");
    // setIsOpen(false);
  };

  const handleClose = () => {
    dispatch(closeModal("assignTask"));
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Assign Tasks
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Create and assign tasks to team members
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[calc(90vh-140px)]">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 shadow-sm"
                >
                  {/* Task Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs">
                        {index + 1}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Task {index + 1}
                      </h3>
                    </div>

                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Task Title & Priority */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register(`tasks.${index}.title`, {
                          required: "Title is required",
                        })}
                        placeholder="Task title"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.tasks?.[index]?.title && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.tasks[index]?.title?.message}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        {...register(`tasks.${index}.priority`)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                        <option value="urgent">🚨 Urgent</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      {...register(`tasks.${index}.description`)}
                      placeholder="Task details..."
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Due Date, Employee & Tags */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Due Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        <input
                          type="date"
                          {...register(`tasks.${index}.dueDate`, {
                            required: "Required",
                          })}
                          className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      {errors.tasks?.[index]?.dueDate && (
                        <p className="text-xs text-red-600 mt-1">Required</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Assign To <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        <select
                          {...register(`tasks.${index}.employeeId`, {
                            required: "Required",
                          })}
                          className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none"
                        >
                          <option value="">Select</option>
                          {employees.map((emp) => (
                            <option key={emp._id} value={emp._id}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.tasks?.[index]?.employeeId && (
                        <p className="text-xs text-red-600 mt-1">Required</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tags
                      </label>
                      <div className="relative">
                        <Tag className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        <input
                          {...register(`tasks.${index}.tags`)}
                          placeholder="urgent, dev..."
                          className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Task Button */}
              <button
                type="button"
                onClick={() =>
                  append({
                    title: "",
                    description: "",
                    priority: "medium",
                    dueDate: "",
                    tags: "",
                    employeeId: "",
                  })
                }
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium">Add Another Task</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              {fields.length} {fields.length === 1 ? "task" : "tasks"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isSubmitting ? "Assigning..." : "Assign Tasks"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
