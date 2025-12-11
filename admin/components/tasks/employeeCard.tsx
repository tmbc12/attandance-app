'use client';

import { useState } from 'react';
import { Employee, Task } from "@/types/task";
import WorkItem from "./WorkItem";

interface EmployeeCardProps {
  employee: Employee;
  tasks: Task[];
}

const EmployeeCard = ({ 
  employee, 
  tasks,
}: EmployeeCardProps) => {
  // Filter unfinished tasks (not completed)
  const unfinishedTasks = Array.isArray(tasks) ? tasks.filter(
    task => task.status !== 'completed'
  ) : [];

  // Get team/department color
  const getColorCode = (): string => {
    if (employee.department.colorCode) {
      return employee.department.colorCode;
    }
    // Default color if no team color is set
    return "#000000";
  };

  // Get team/department name
  const getTeamName = (): string => {
    if (employee.department?.name) {
      return employee.department.name;
    }
    if (typeof employee.department === 'object' && employee.department?.name) {
      return employee.department.name;
    }
    return "";
  };



  return (
    <div
      className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
      style={{
        overflow: "hidden",
        height: "fit-content",
        marginBottom: "10px",
        breakInside: "avoid-column",
      }}
    >
      {/* Header with Left Color Border */}
      <div className="flex relative">
        <div
          className="w-1"
          style={{ backgroundColor: getColorCode() }}
        ></div>

        {/* Header Content */}
        <div className="flex-1 p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {employee.name}
              </h3>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">
                {getTeamName()}
              </p>
            </div>
            
          </div>
        </div>
      </div>

      {/* Horizontal Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Tasks List */}
      {unfinishedTasks.length > 0 ? (
        unfinishedTasks.map((task) => (
          <WorkItem
            key={task._id}
            work={task}
            user={{
              _id: employee._id,
              name: employee.name,
              team: employee.department || (typeof employee.department === 'object' ? employee.department : employee.department) || "",
            }}
          />
        ))
      ) : (
        <div className="p-4 pt-3">
          <p className="text-xs text-gray-400 text-center py-2">
            No active tasks
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeeCard;