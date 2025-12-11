import moment from 'moment';

/**
 * Format time duration in minutes to HH:MM format
 * @param minutes Total minutes
 * @returns Formatted string in HH:MM format
 */
export const formatDurationToHHMM = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Format time duration in hours to HH:MM format or MM format based on duration
 * @param hours Total hours (can be decimal like 0.5, 1.25, etc)
 * @returns Formatted string like "2:30" for 2.5 hours or "45 min" for 0.75 hours
 */
export const formatHoursToReadable = (hours: number): string => {
  const totalMinutes = Math.floor(hours * 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (mins === 0) {
    return `${hrs}h`;
  }

  return `${hrs}:${String(mins).padStart(2, '0')}h`;
};

/**
 * Format working hours for display
 * Less than 60 minutes: show as "XX min"
 * 60+ minutes: show as "HH:MM"
 * @param hours Total working hours
 * @returns Formatted string
 */
export const formatWorkingHours = (hours: number): string => {
  const totalMinutes = Math.floor(hours * 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Format timestamp to 12-hour time format (HH:MM AM/PM)
 * @param time ISO string or Date object
 * @returns Formatted string like "09:30 AM"
 */
export const formatTime12Hour = (time: string | Date): string => {
  return moment(time).format('hh:mm A');
};

/**
 * Format timestamp to 24-hour time format (HH:MM)
 * @param time ISO string or Date object
 * @returns Formatted string like "09:30"
 */
export const formatTime24Hour = (time: string | Date): string => {
  return moment(time).format('HH:mm');
};

/**
 * Calculate elapsed time between two timestamps and return formatted string
 * @param startTime Start time (ISO string or Date)
 * @param endTime End time (ISO string or Date) - optional, defaults to now
 * @returns Formatted string in HH:MM:SS format
 */
export const calculateElapsedTime = (startTime: string | Date, endTime?: string | Date): string => {
  const start = moment(startTime);
  const end = endTime ? moment(endTime) : moment();
  const duration = moment.duration(end.diff(start));

  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Get total seconds between two timestamps
 * @param startTime Start time (ISO string or Date)
 * @param endTime End time (ISO string or Date) - optional, defaults to now
 * @returns Total seconds
 */
export const getTotalSeconds = (startTime: string | Date, endTime?: string | Date): number => {
  const start = moment(startTime);
  const end = endTime ? moment(endTime) : moment();
  const duration = moment.duration(end.diff(start));
  return duration.asSeconds();
};

/**
 * Format late time in minutes to readable format
 * @param minutes Late by minutes
 * @returns Formatted string
 */
export const formatLateTime = (minutes: number): string => {
  if (minutes === 0) return '0 min';

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}min`;
};

/**
 * Format seconds to HH:MM:SS format
 * @param seconds Total seconds
 * @returns Formatted string
 */
export const formatSecondsToTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
