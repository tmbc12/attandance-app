'use client';

import React, { useState, useEffect, useRef } from "react";

interface TimerProps {
  isRunning: boolean;
  onTimeUpdate: (time: number) => void;
  initialTime?: number;
  isFixedTime?: number;
  visibility?: "visible" | "hidden" | "collapse";
}

const Timer: React.FC<TimerProps> = ({ 
  isRunning, 
  onTimeUpdate, 
  initialTime = 0, 
  isFixedTime = 0,
  visibility = "visible"
}) => {
  const [time, setTime] = useState(initialTime);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isFixedTime) {
      if (isRunning) {
        intervalRef.current = setInterval(() => {
          setTime((prevTime) => prevTime + 1);
        }, 1000);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      setTime(isFixedTime);
    }
  }, [isRunning, isFixedTime]);

  useEffect(() => {
    onTimeUpdate(time);
  }, [time, onTimeUpdate]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}`;
  };

  return <span style={{ visibility }}>{formatTime(time)}</span>;
};

export default Timer;