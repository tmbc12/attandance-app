import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getTodayTasks, carryForwardTasks } from '../store/slices/tasksSlice';
import { TaskCard } from './TaskCard';

export const TaskList = () => {
  const dispatch = useAppDispatch();
  const { tasks, stats, isLoading, activeTaskId } = useAppSelector(state => state.tasks);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    await dispatch(getTodayTasks());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleCarryForward = async () => {
    await dispatch(carryForwardTasks());
    await loadTasks();
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return task.status !== 'cancelled';
    if (filter === 'pending') return task.status === 'pending';
    if (filter === 'in_progress') return task.status === 'in_progress';
    if (filter === 'completed') return task.status === 'completed';
    return task.status !== 'cancelled';
  });

  if (isLoading && tasks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ADE80" />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.activeTab]}
          onPress={() => setFilter('all')}
        >
          {filter === 'all' ? (
            <LinearGradient
              colors={['#EF4444', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabGradient}
            >
              <Text style={styles.activeTabText}>
                All {stats?.total ? `(${stats.total})` : ''}
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.tabText}>
              All {stats?.total ? `(${stats.total})` : ''}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, filter === 'pending' && styles.activeTab]}
          onPress={() => setFilter('pending')}
        >
          {filter === 'pending' ? (
            <LinearGradient
              colors={['#EF4444', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabGradient}
            >
              <Text style={styles.activeTabText}>
                Todo {stats?.pending ? `(${stats.pending})` : ''}
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.tabText}>
              Todo {stats?.pending ? `(${stats.pending})` : ''}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, filter === 'in_progress' && styles.activeTab]}
          onPress={() => setFilter('in_progress')}
        >
          {filter === 'in_progress' ? (
            <LinearGradient
              colors={['#EF4444', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabGradient}
            >
              <Text style={styles.activeTabText}>
                Active {stats?.inProgress ? `(${stats.inProgress})` : ''}
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.tabText}>
              Active {stats?.inProgress ? `(${stats.inProgress})` : ''}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, filter === 'completed' && styles.activeTab]}
          onPress={() => setFilter('completed')}
        >
          {filter === 'completed' ? (
            <LinearGradient
              colors={['#EF4444', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabGradient}
            >
              <Text style={styles.activeTabText}>
                Done {stats?.completed ? `(${stats.completed})` : ''}
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.tabText}>
              Done {stats?.completed ? `(${stats.completed})` : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Carry Forward Button */}
      {/* <TouchableOpacity style={styles.carryForwardButton} onPress={handleCarryForward}>
        <LinearGradient
          colors={['#F97316', '#EF4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.carryForwardGradient}
        >
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
          <Text style={styles.carryForwardText}>Carry Forward yesterday's work</Text>
        </LinearGradient>
      </TouchableOpacity> */}

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={({ item }) => (
          <TaskCard task={item} isActive={item._id === activeTaskId} />
        )}
        keyExtractor={item => item._id}
        scrollEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4ADE80"
            colors={['#4ADE80']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Add a task to get started!</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Sora_400Regular',
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 4,
    backgroundColor: '#000000',
    borderRadius: 20,
    gap: 2,
  },
  tab: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  activeTab: {
    // Gradient will be applied via LinearGradient
  },
  tabGradient: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 70,
    borderRadius: 16,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  activeTabText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  carryForwardButton: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  carryForwardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  carryForwardText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
});
