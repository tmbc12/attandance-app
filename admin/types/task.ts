export interface TimeTrackingSession {
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  _id: string;
}

export interface TimeTracking {
  totalSeconds: number;
  sessions: TimeTrackingSession[];
  currentSessionStart?: string | null;
  lastPauseTime?: string | null;
}

export interface TaskHistory {
 _id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface Task {
  _id: string;
  employee: string;
  organization: string;
  startTime: Date;
  pauseTime: Date;
  pausedForInSeconds: number;
  // title: string;
  // description: string;
  history: TaskHistory[];
  priority: "low" | "medium" | "high";
  status: "pending" | "completed" | "paused" | "in_progress" | "cancelled";
  date: string;
  dueDate: string | null;
  timeTracking: TimeTracking;
  isCarriedForward: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  completedAt?: string;
}

export interface Department {
  _id: string;
  name: string;
  colorCode: string;
}

export interface Employee {
  department: Department;
  _id: string;
  name: string;
  email: string;
  employeeId: string;
}

export interface TaskGroup {
  tasks: Task[];
  employee: Employee;
}
