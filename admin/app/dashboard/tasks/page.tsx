"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  Search,
  CheckSquare,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import api from "../../../lib/api";
import { formatDuration } from "../../../components/tasks/TaskCard";
import { TaskGroup } from "@/types/task";
import EmployeeCard from "@/components/tasks/employeeCard";
import { useAppDispatch } from "@/lib/hooks/useRedux";
import { openModal } from "@/lib/slices/uiSlice";
import { fetchEmployees } from "@/lib/slices/employeeSlice";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";

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
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled" | "paused";
  timeTracking: {
    totalSeconds: number;
  };
  date: string;
  createdAt: string;
  updatedAt: string;
}

export default function TasksPage() {
  const dispatch = useAppDispatch();
  const { filters } = useSelector((state: RootState) => state.employees);
  const [employeeWiseTask, setEmployeeWiseTask] = useState<TaskGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "in_progress" | "completed" | "paused"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "low" | "medium" | "high" | "urgent"
  >("all");

  const loadTasksData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/tasks/employee-wise", {
        params: {
          date: selectedDate,
          status: statusFilter,
          priority: priorityFilter,
        },
      });
      console.log("response", JSON.stringify(response.data));
      setEmployeeWiseTask(response.data.employeeWiseTasks || []);
      // setTasks(response.data.tasks || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasksData();
  }, [selectedDate, statusFilter, priorityFilter]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(fetchEmployees(filters as any));
  }, [dispatch, filters]);

  const getFilteredTasks = () => {
    // Flatten tasks from employeeWiseTask groups
    let filtered = employeeWiseTask.flatMap((group) =>
      group.tasks.map((task) => ({
        ...task,
        employee: group.employee,
      }))
    );

    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((t) => t.priority === priorityFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((t) => {
        const lastHistory =
          t.history && t.history.length > 0
            ? t.history[t.history.length - 1]
            : null;
        const title = lastHistory?.title || "";
        const description = lastHistory?.description || "";
        return (
          title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    return filtered;
  };

  const getFilteredEmployeeWiseTasks = () => {
    let filtered: TaskGroup[] = JSON.parse(JSON.stringify(employeeWiseTask));
    console.log(
      `[info] - getFilteredEmployeeWiseTasks - before filtered`,
      JSON.stringify(filtered)
    );

    if (statusFilter !== "all") {
      filtered = filtered.map((t) => ({
        ...t,
        tasks: t.tasks.filter((task) => task.status === statusFilter),
      }));
    }

    if (priorityFilter !== "all") {
      filtered = filtered.map((t) => ({
        ...t,
        tasks: t.tasks.filter((task) => task.priority === priorityFilter),
      }));
    }

    if (searchTerm) {
      filtered = filtered.map((t) => ({
        ...t,
        tasks: t.tasks.filter((task) => {
          const lastHistory =
            task.history && task.history.length > 0
              ? task.history[task.history.length - 1]
              : null;
          if (!lastHistory) return false;
          return (
            lastHistory.title
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            lastHistory.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            t.employee.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }),
      }));
    }

    // Remove groups with zero tasks after filtering
    filtered = filtered.filter((group) => group.tasks.length > 0);

    console.log(
      `[info] - getFilteredEmployeeWiseTasks - after filtered`,
      JSON.stringify(filtered)
    );

    return filtered;
  };

  const exportToExcel = () => {
    const filtered = getFilteredTasks();

    if (filtered.length === 0) {
      alert("No tasks to export");
      return;
    }

    const headers = [
      "Employee ID",
      "Employee Name",
      "Department",
      "Task Title",
      "Description",
      "Priority",
      "Status",
      "Time Spent",
      "Created Date",
    ];
    const rows = filtered.map((task) => {
      return [
        task.employee.employeeId,
        task.employee.name,
        typeof task.employee.department === "string"
          ? task.employee.department
          : task.employee.department?.name || "-",
        task.history && task.history.length > 0
          ? task.history[task.history.length - 1].title
          : "No title",
        task.history && task.history.length > 0
          ? task.history[task.history.length - 1].description
          : "No description",
        task.priority.toUpperCase(),
        task.status.replace("_", " ").toUpperCase(),
        formatDuration(task.timeTracking.totalSeconds),
        new Date(task.createdAt).toLocaleDateString(),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `tasks_${selectedDate}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = {
    total: employeeWiseTask.reduce((sum, group) => sum + group.tasks.length, 0),
    completed: employeeWiseTask.reduce(
      (sum, group) =>
        sum + group.tasks.filter((t) => t.status === "completed").length,
      0
    ),
    inProgress: employeeWiseTask.reduce(
      (sum, group) =>
        sum + group.tasks.filter((t) => t.status === "in_progress").length,
      0
    ),
    pending: employeeWiseTask.reduce(
      (sum, group) =>
        sum + group.tasks.filter((t) => t.status === "pending").length,
      0
    ),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage employee tasks
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => dispatch(openModal({ modal: "assignTask" }))}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign New Task
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.completed}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.inProgress}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks or employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as
                  | "all"
                  | "pending"
                  | "in_progress"
                  | "completed"
                  | "paused"
              )
            }
            className="px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-size-[12px_12px] bg-position-[right_0.75rem_center] bg-no-repeat"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(
                e.target.value as "all" | "low" | "medium" | "high" | "urgent"
              )
            }
            className="px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-size-[12px_12px] bg-position-[right_0.75rem_center] bg-no-repeat"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : getFilteredEmployeeWiseTasks().length > 0 ? (
          <div className="columns-1 gap-6 md:columns-3 xl:columns-4 p-4">
            {getFilteredEmployeeWiseTasks().map((task) => (
              <EmployeeCard
                key={task.employee._id}
                employee={task.employee}
                tasks={task.tasks}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No tasks found
            </h3>
            <p className="text-gray-500 mt-1">
              No tasks found for the selected date and filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
