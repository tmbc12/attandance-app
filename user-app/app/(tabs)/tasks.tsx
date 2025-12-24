import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Mock data for tasks
const mockTasks = [
  {
    id: '1',
    title: 'Complete user authentication module',
    description: 'Implement login and registration functionality with JWT tokens',
    assignedBy: 'John Doe',
    assignedTo: 'me',
    status: 'pending',
    dueDate: '2024-01-15',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Design dashboard UI components',
    description: 'Create reusable UI components for the admin dashboard',
    assignedBy: 'Sarah Wilson',
    assignedTo: 'me',
    status: 'pending',
    dueDate: '2024-01-18',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Write API documentation',
    description: 'Document all REST API endpoints with examples',
    assignedBy: 'Mike Johnson',
    assignedTo: 'me',
    status: 'pending',
    dueDate: '2024-01-20',
    priority: 'low',
  },
  {
    id: '4',
    title: 'Fix mobile responsive issues',
    description: 'Resolve layout problems on mobile devices',
    assignedBy: 'Emily Chen',
    assignedTo: 'me',
    status: 'pending',
    dueDate: '2024-01-22',
    priority: 'high',
  },
  {
    id: '5',
    title: 'Implement data export feature',
    description: 'Add CSV and PDF export functionality for reports',
    assignedBy: 'David Brown',
    assignedTo: 'me',
    status: 'pending',
    dueDate: '2024-01-25',
    priority: 'medium',
  },
];

const mockUsers = [
  { id: '1', name: 'Alice Smith', email: 'alice.smith@example.com' },
  { id: '2', name: 'Bob Miller', email: 'bob.miller@example.com' },
  { id: '3', name: 'Carol White', email: 'carol.white@example.com' },
  { id: '4', name: 'Daniel Lee', email: 'daniel.lee@example.com' },
  { id: '5', name: 'Emma Davis', email: 'emma.davis@example.com' },
];

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState(mockTasks);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const tabBarHeight = 60 + insets.bottom;

  const handleAccept = (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: 'accepted' as const } : task
      )
    );
  };

  const handleAssign = (taskId: string) => {
    setSelectedTask(taskId);
    setAssignModalVisible(true);
  };

  const handleAssignToUser = (userId: string, userName: string) => {
    if (selectedTask) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === selectedTask
            ? { ...task, assignedTo: userName, status: 'assigned' as const }
            : task
        )
      );
      setAssignModalVisible(false);
      setSelectedTask(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F97316';
      case 'low':
        return '#4ADE80';
      default:
        return '#9CA3AF';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderTaskCard = ({ item }: { item: typeof mockTasks[0] }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(item.priority) + '20' },
            ]}
          >
            <View
              style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]}
            />
            <Text
              style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}
            >
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.taskDescription}>{item.description}</Text>
      </View>

      <View style={styles.taskDetails}>
        <View style={styles.taskDetailRow}>
          <Ionicons name="person-outline" size={16} color="#9CA3AF" />
          <Text style={styles.taskDetailText}>Assigned by: {item.assignedBy}</Text>
        </View>
        <View style={styles.taskDetailRow}>
          <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
          <Text style={styles.taskDetailText}>Due: {formatDate(item.dueDate)}</Text>
        </View>
      </View>

      <View style={styles.taskActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(item.id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4ADE80', '#22C55E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Ionicons name="checkmark-circle" size={18} color="#000000" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => handleAssign(item.id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#EF4444', '#F97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Ionicons name="people" size={18} color="#FFFFFF" />
            <Text style={styles.assignButtonText}>Assign</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#F97316', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <Text style={styles.title}>Task List</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Task List */}
      <FlatList
        data={tasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#2C2C2C" />
            <Text style={styles.emptyText}>No tasks assigned</Text>
            <Text style={styles.emptySubtext}>Tasks assigned to you will appear here</Text>
          </View>
        }
      />

      {/* Assign Modal */}
      <Modal
        visible={assignModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Task</Text>
              <TouchableOpacity
                onPress={() => setAssignModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select a user to assign this task to:</Text>

            <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
              {mockUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userItem}
                  onPress={() => handleAssignToUser(user.id, user.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    width: '100%',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerSafeArea: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 16,
  },
  taskCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  taskHeader: {
    marginBottom: 12,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10,
    fontFamily: 'Sora_600SemiBold',
  },
  taskDescription: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    lineHeight: 20,
  },
  taskDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    gap: 8,
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskDetailText: {
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  acceptButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  assignButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#000000',
  },
  assignButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    padding: 20,
    paddingBottom: 12,
  },
  userList: {
    maxHeight: 400,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Sora_500Medium',
    color: '#FFFFFF',
  },
});

