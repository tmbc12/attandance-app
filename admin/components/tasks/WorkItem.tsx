'use client';

import { useState } from "react";
import Timer from "./Timer";
import { Task } from "@/types/task";

interface Team {
  name?: string;
  colorCode?: string;
}

interface User {
  _id: string;
  name: string;
  team?: Team | string;
}


interface WorkItemProps {
  work: Task;
  user: User;
}

export default function WorkItem({
  work,
  user,
}: WorkItemProps) {
  const [time, setTime] = useState(0);

  if (!work) {
    return null;
  }

  // Map Task properties to work-like structure
  const isPaused = work.status === 'paused' ||work.status==='pending';
  const stopTime = work.status === 'completed' ? work.completedAt : undefined;
  const pauseTime = work.pauseTime ? new Date(work.pauseTime) : undefined;
  const startTime = work.startTime 
    ? new Date(work.startTime) 
    : new Date(work.createdAt);

  // Defaul t calculateSecondsBetweenDates if not provided
  const    calculateSeconds = (start: string | Date, end: string | Date, totalPausedTime: number): number => {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    const seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000) - totalPausedTime;
    console.log(`[info] calculateSeconds: ${seconds} isPaused: ${isPaused} start: ${start} end: ${end} totalPausedTime: ${totalPausedTime}`)
    return seconds
  };

  const getEndTime = (): string | Date => {
    if (stopTime) {
      return stopTime;
    }
    if (isPaused && pauseTime) {
      return pauseTime;
    }
    return new Date();
  };

  return (
    <div className="p-4 pt-3">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          disabled
          role="switch"
          aria-checked={!isPaused}
          onClick={() => {}}
          className="relative mt-0.5 inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black"
        >
          <span
            className={`absolute inset-0 rounded-full transition-colors ${
              isPaused ? "bg-gray-200" : "bg-black"
            }`}
          ></span>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
              isPaused ? "translate-x-0.5" : "translate-x-4"
            }`}
          ></span>
        </button>
        <div className="flex-1 min-w-0">
            {work.history && work.history.length > 0 && (
              <>
                <p className="text-sm text-gray-700 leading-snug mb-1">
                  {work.history[work.history.length - 1].title}
                </p>
                <p className="text-xs text-gray-600">
                  {work.history[work.history.length - 1].description}
                </p>
              </>
             
            )}
          <p className="text-xs text-gray-400">
            <Timer
              isRunning={!isPaused}
              onTimeUpdate={setTime}
              initialTime={calculateSeconds(startTime, getEndTime(),work.pausedForInSeconds)}
            />
          </p>
        </div>

      </div>
    </div>
  );
}





