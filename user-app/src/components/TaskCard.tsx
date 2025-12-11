import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../api/tasks';
import { useAppDispatch } from '../store/hooks';
import { startTask, pauseTask, resumeTask, completeTask, deleteTask, updateTaskTimer } from '../store/slices/tasksSlice';
import { formatSecondsToTime } from '../utils/timeFormat';
import ConfirmModal from './common/ConfirmModal';

interface TaskCardProps {
  task: Task;
  isActive: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, isActive }) => {
  const dispatch = useAppDispatch();
  const [currentTime, setCurrentTime] = useState(task.timeTracking.totalSeconds);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [baseTotalSeconds, setBaseTotalSeconds] = useState(task.timeTracking.totalSeconds);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'complete' | 'delete' | null>(null);

  // Update base total seconds when task changes
  useEffect(() => {
    setBaseTotalSeconds(task.timeTracking.totalSeconds);
  }, [task.timeTracking.totalSeconds]);

  // Timer effect
  // useEffect(() => {
  //   let interval: ReturnType<typeof setInterval> | null = null;

  //   if (task.status === 'in_progress' && task.timeTracking.currentSessionStart) {
  //     const startTime = new Date(task.timeTracking.currentSessionStart).getTime();
  //     const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
  //     const calculatedSessionStart = Date.now() - (initialElapsed * 1000);
  //     setSessionStart(calculatedSessionStart);

  //     interval = setInterval(() => {
  //       const elapsed = Math.floor((Date.now() - calculatedSessionStart) / 1000);
  //       const newTime = baseTotalSeconds + elapsed;
  //       setCurrentTime(newTime);
  //     }, 1000);
  //   } else {
  //     setCurrentTime(task.timeTracking.totalSeconds);
  //     setSessionStart(null);
  //   }

  //   return () => {
  //     if (interval) clearInterval(interval);
  //   };
  // }, [task.status, task.timeTracking.currentSessionStart, task._id, dispatch, baseTotalSeconds]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (task.status === 'in_progress' && task.timeTracking.currentSessionStart) {
      const startTime = new Date(task.timeTracking.currentSessionStart).getTime();
      const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
      const calculatedSessionStart = Date.now() - (initialElapsed * 1000) - task.pausedForInSeconds;
      setSessionStart(calculatedSessionStart);

      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - calculatedSessionStart) / 1000);
        const newTime = baseTotalSeconds + elapsed;
        setCurrentTime(newTime);
      }, 1000);
    } else {
      setCurrentTime(task.timeTracking.totalSeconds);
      setSessionStart(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [task.startTime, task.pauseTime, task.stopTime, task.pausedForInSeconds, task._id]);

  const formatTime = (seconds: number) => {
    return formatSecondsToTime(seconds);
  };

  const getStatusLabel = () => {
    switch (task.status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'Active';
      case 'paused': return 'Paused';
      case 'completed': return 'Done';
      default: return 'Pending';
    }
  };

  const handleStart = async () => {
    try {
      await dispatch(startTask(task._id)).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to start task');
    }
  };

  const handlePause = async () => {
    try {
      dispatch(updateTaskTimer({ taskId: task._id, seconds: currentTime }));
      await dispatch(pauseTask(task._id)).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to pause task');
    }
  };

  const handleResume = async () => {
    try {
      await dispatch(resumeTask(task._id)).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to resume task');
    }
  };

  const handleComplete = () => {
    setConfirmAction('complete');
    setShowConfirmModal(true);
  };

  const confirmComplete = async () => {
    setShowConfirmModal(false);
    try {
      dispatch(updateTaskTimer({ taskId: task._id, seconds: currentTime }));
      await dispatch(completeTask(task._id)).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  const handleDelete = () => {
    setConfirmAction('delete');
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    try {
      await dispatch(deleteTask(task._id)).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task');
    }
  };

  const renderActionButtons = () => {
    if (task.status === 'completed') {
      return (
        <View style={styles.actionsRow}>
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓ Completed</Text>
          </View>
          <TouchableOpacity onPress={handleDelete} style={styles.removeButton}>
            <Ionicons name="trash-outline" size={16} color="#000" />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (task.status === 'in_progress') {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={handlePause} style={styles.pauseButton}>
            <Ionicons name="pause" size={16} color="#FFFFFF" />
            <Text style={styles.pauseButtonText}>Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleComplete} style={styles.completeButton}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (task.status === 'paused') {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={handleResume} style={styles.startButton}>
            <LinearGradient
              colors={['#EF4444', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startButtonGradient}
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Start</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.removeButton}>
            <Ionicons name="trash-outline" size={16} color="#000" />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Pending status
    return (
      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={handleStart} style={styles.startButton}>
          <LinearGradient
            colors={['#EF4444', '#F97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButtonGradient}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.removeButton}>
          <Ionicons name="trash-outline" size={16} color="#000" />
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#4ADE80', '#A3E635']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.priorityDot} />
        <Text style={styles.title} numberOfLines={2}>
          {task.history[task.history.length - 1]?.title}
        </Text>
      </View>

      {/* Description */}
      {task.history[task.history.length - 1]?.description && (
        <Text style={styles.description} numberOfLines={2}>
          {task.history[task.history.length - 1]?.description}
        </Text>
      )}

      {/* Timer and Status */}
      <View style={styles.timerContainer}>
        <View style={styles.timerBox}>
          <Text style={styles.timerText}>
            {formatTime(currentTime)}
          </Text>
        </View>
        <LinearGradient
          colors={['#EF4444', '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.statusBadge}
        >
          <Text style={styles.statusText}>{getStatusLabel()}</Text>
        </LinearGradient>
      </View>

      {/* Action Buttons */}
      {renderActionButtons()}

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={showConfirmModal}
        title={confirmAction === 'complete' ? 'Complete Task' : 'Delete Task'}
        description={
          confirmAction === 'complete'
            ? 'Are you sure you want to mark this task as completed?'
            : 'Are you sure you want to delete this task?'
        }
        onCancel={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
        }}
        onOkClick={confirmAction === 'complete' ? confirmComplete : confirmDelete}
        okClickLabel={confirmAction === 'complete' ? 'submit' : 'ok'}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FBBF24',
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#000000',
  },
  description: {
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    color: '#374151',
    marginBottom: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  timerBox: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 18,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  startButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
  removeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ADE80',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  removeButtonText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
  pauseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  pauseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
  completedBadge: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
});
