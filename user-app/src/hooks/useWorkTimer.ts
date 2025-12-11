import { useState, useEffect } from 'react';
import { calculateElapsedTime, getTotalSeconds } from '../utils/timeFormat';

export const useWorkTimer = (checkInTime?: string, checkOutTime?: string, hasCheckedOut?: boolean) => {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [totalSeconds, setTotalSeconds] = useState(0);

  useEffect(() => {
    if (!checkInTime) {
      setElapsedTime('00:00:00');
      setTotalSeconds(0);
      return;
    }

    if (checkOutTime) {
      // Use utility functions that handle time correctly
      const formatted = calculateElapsedTime(checkInTime, checkOutTime);
      const seconds = getTotalSeconds(checkInTime, checkOutTime);


      setElapsedTime(formatted);
      setTotalSeconds(seconds);
      return;
    }

    const updateTimer = () => {
      // Use utility functions that handle time correctly
      const formatted = calculateElapsedTime(checkInTime);
      const seconds = getTotalSeconds(checkInTime);

      setElapsedTime(formatted);
      setTotalSeconds(seconds);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [checkInTime, hasCheckedOut]);

  return { elapsedTime, totalSeconds };
};
