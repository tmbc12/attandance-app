import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { getTasks } from "@/src/store/slices/tasksSlice";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { getTeamToday } from "@/src/store/slices/attendanceSlice";
import { User } from "@/src/store/slices/authSlice";

// Mock data for tasks
// const mockTasks = [
//   {
//     id: "1",
//     title: "Complete user authentication module",
//     description:
//       "Implement login and registration functionality with JWT tokens",
//     assignedBy: "John Doe",
//     assignedTo: "me",
//     status: "pending",
//     dueDate: "2024-01-15",
//     priority: "high",
//   },
//   {
//     id: "2",
//     title: "Design dashboard UI components",
//     description: "Create reusable UI components for the admin dashboard",
//     assignedBy: "Sarah Wilson",
//     assignedTo: "me",
//     status: "pending",
//     dueDate: "2024-01-18",
//     priority: "medium",
//   },
//   {
//     id: "3",
//     title: "Write API documentation",
//     description: "Document all REST API endpoints with examples",
//     assignedBy: "Mike Johnson",
//     assignedTo: "me",
//     status: "pending",
//     dueDate: "2024-01-20",
//     priority: "low",
//   },
//   {
//     id: "4",
//     title: "Fix mobile responsive issues",
//     description: "Resolve layout problems on mobile devices",
//     assignedBy: "Emily Chen",
//     assignedTo: "me",
//     status: "pending",
//     dueDate: "2024-01-22",
//     priority: "high",
//   },
//   {
//     id: "5",
//     title: "Implement data export feature",
//     description: "Add CSV and PDF export functionality for reports",
//     assignedBy: "David Brown",
//     assignedTo: "me",
//     status: "pending",
//     dueDate: "2024-01-25",
//     priority: "medium",
//   },
// ];

// const mockUsers = [
//   { id: "1", name: "Alice Smith", email: "alice.smith@example.com" },
//   { id: "2", name: "Bob Miller", email: "bob.miller@example.com" },
//   { id: "3", name: "Carol White", email: "carol.white@example.com" },
//   { id: "4", name: "Daniel Lee", email: "daniel.lee@example.com" },
//   { id: "5", name: "Emma Davis", email: "emma.davis@example.com" },
//   { id: "6", name: "Alice Smith", email: "alice.smith@example.com" },
//   { id: "7", name: "Bob Miller", email: "bob.miller@example.com" },
//   { id: "8", name: "Carol White", email: "carol.white@example.com" },
//   { id: "9", name: "Daniel Lee", email: "daniel.lee@example.com" },
//   { id: "10", name: "Emma Davis", email: "emma.davis@example.com" },
// ];

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { assignedTasks } = useAppSelector((state) => state.tasks);
  const { teamAttendances } = useAppSelector((state) => state.attendance);
  const { user } = useAppSelector((state) => state.auth);
  const [tasks, setTasks] = useState(assignedTasks);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userPickerValue, setUserPickerValue] = useState<string | null>(null);
  const [assignUserPickerOpen, setAssignUserPickerOpen] = useState(false);
  const [assignUserPickerValue, setAssignUserPickerValue] = useState<
    string | null
  >(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    assignedBy: "Current User", // You can replace this with actual user
    dueDate: "",
    priority: "medium",
  });
  const tabBarHeight = 60 + insets.bottom;

  const canViewMember = (att: any, user: User) => {

    if (user.role === "team_lead") {
      return att.employee.department === user.departmentId;
    }

    if (user.role === "manager") {
      return att.employee.department === user.departmentId && att.role === "team_lead";
    }

    return false;
  };

  const filteredTeamMembers = teamAttendances.filter((att) =>
    canViewMember(att, user as User)
  );

  // Convert filteredTeamMembers to dropdown items
  const userPickerItems = filteredTeamMembers.map((user) => ({
    label: user.employee.name,
    value: user.employee._id,
  }));

  const fetchData = async () => {
    try {
      await dispatch(getTasks({ isAssigned: true })).unwrap();
      await dispatch(getTeamToday()).unwrap();
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);

  const handleAccept = (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task._id === taskId ? { ...task, status: "accepted" as const } : task
      )
    );
  };

  const handleAssign = (taskId: string) => {
    setSelectedTask(taskId);
    setAssignModalVisible(true);
  };

  const handleAssignToUser = () => {
    if (selectedTask && assignUserPickerValue) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task._id === selectedTask
            ? {
                ...task,
                assignedTo: assignUserPickerValue,
                // status: "assigned" as const,
              }
            : task
        )
      );
      setAssignModalVisible(false);
      setSelectedTask(null);
      setAssignUserPickerValue(null);
      setAssignUserPickerOpen(false);
    }
  };

  const handleAddTask = () => {
    // if (
    //   formData.title.trim() &&
    //   formData.description.trim() &&
    //   formData.assignedTo &&
    //   formData.dueDate
    // ) {
    //   const newTask = {
    //     _id: String(tasks.length + 1),
    //     title: formData.title,
    //     description: formData.description,
    //     assignedBy: formData.assignedBy,
    //     assignedTo: formData.assignedTo,
    //     status: "pending" as const,
    //     dueDate: formData.dueDate,
    //     priority: formData.priority as "high" | "medium" | "low",
    //   };
    //   setTasks((prevTasks) => [newTask, ...prevTasks]);
    //   setFormData({
    //     title: "",
    //     description: "",
    //     assignedTo: "",
    //     assignedBy: "Current User",
    //     dueDate: "",
    //     priority: "medium",
    //   });
    //   setUserPickerValue(null);
    //   setUserPickerOpen(false);
    //   setAddTaskModalVisible(false);
    // }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assignedTo: "",
      assignedBy: "Current User",
      dueDate: "",
      priority: "medium",
    });
    setUserPickerValue(null);
    setUserPickerOpen(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#EF4444";
      case "medium":
        return "#F97316";
      case "low":
        return "#4ADE80";
      default:
        return "#9CA3AF";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderTaskCard = ({ item }: { item: (typeof assignedTasks)[0] }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Text style={styles.taskTitle}>
            {item.history[item.history.length - 1]?.title}
          </Text>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(item.priority) + "20" },
            ]}
          >
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: getPriorityColor(item.priority) },
              ]}
            />
            <Text
              style={[
                styles.priorityText,
                { color: getPriorityColor(item.priority) },
              ]}
            >
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.taskDescription}>
          {item.history[item.history.length - 1]?.description}
        </Text>
      </View>

      <View style={styles.taskDetails}>
        <View style={styles.taskDetailRow}>
          <Ionicons name="person-outline" size={16} color="#9CA3AF" />
          <Text style={styles.taskDetailText}>
            Assigned by: {item.assignedBy.name}
          </Text>
        </View>
        <View style={styles.taskDetailRow}>
          <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
          <Text style={styles.taskDetailText}>
            Due: {formatDate(item.dueDate as string)}
          </Text>
        </View>
      </View>

      <View style={styles.taskActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(item._id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#4ADE80", "#22C55E"]}
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
          onPress={() => handleAssign(item._id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#EF4444", "#F97316"]}
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
        colors={["#F97316", "#EF4444"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <SafeAreaView style={styles.headerSafeArea} edges={["top"]}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Task List</Text>
            <TouchableOpacity
              onPress={() => setAddTaskModalVisible(true)}
              style={styles.addButton}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Task List */}
      <FlatList
        data={tasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#2C2C2C" />
            <Text style={styles.emptyText}>No tasks assigned</Text>
            <Text style={styles.emptySubtext}>
              Tasks assigned to you will appear here
            </Text>
          </View>
        }
      />

      {/* Assign Modal */}
      <Modal
        visible={assignModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setAssignModalVisible(false);
          setAssignUserPickerValue(null);
          setAssignUserPickerOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Task</Text>
              <TouchableOpacity
                onPress={() => {
                  setAssignModalVisible(false);
                  setAssignUserPickerValue(null);
                  setAssignUserPickerOpen(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.assignModalContent}>
              <Text style={styles.modalSubtitle}>
                Select a user to assign this task to:
              </Text>

              <View style={styles.inputContainer}>
                <DropDownPicker
                  open={assignUserPickerOpen}
                  value={assignUserPickerValue}
                  items={userPickerItems}
                  setOpen={setAssignUserPickerOpen}
                  setValue={setAssignUserPickerValue}
                  placeholder="Select a user"
                  style={styles.dropdownPicker}
                  textStyle={styles.dropdownText}
                  placeholderStyle={styles.dropdownPlaceholder}
                  dropDownContainerStyle={styles.dropdownContainer}
                  selectedItemLabelStyle={styles.dropdownSelectedText}
                  listItemLabelStyle={styles.dropdownListItemText}
                  ArrowDownIconComponent={({ style }) => (
                    <View style={style}>
                      <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                    </View>
                  )}
                  ArrowUpIconComponent={({ style }) => (
                    <View style={style}>
                      <Ionicons name="chevron-up" size={20} color="#9CA3AF" />
                    </View>
                  )}
                  TickIconComponent={({ style }) => (
                    <View style={style}>
                      <Ionicons name="checkmark" size={20} color="#4ADE80" />
                    </View>
                  )}
                  showArrowIcon={true}
                  disableLocalSearch={true}
                  closeAfterSelecting={true}
                  maxHeight={200}
                  scrollViewProps={{
                    nestedScrollEnabled: true,
                    showsVerticalScrollIndicator: true,
                    bounces: false,
                  }}
                  listMode="SCROLLVIEW"
                  zIndex={3000}
                  zIndexInverse={1000}
                />
              </View>

              {/* Assign Button */}
              <TouchableOpacity
                style={styles.assignConfirmButton}
                onPress={handleAssignToUser}
                activeOpacity={0.8}
                disabled={!assignUserPickerValue}
              >
                <LinearGradient
                  colors={
                    assignUserPickerValue
                      ? ["#4ADE80", "#22C55E"]
                      : ["#2C2C2C", "#2C2C2C"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.assignButtonGradient}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={assignUserPickerValue ? "#000000" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.assignConfirmButtonText,
                      !assignUserPickerValue &&
                        styles.assignConfirmButtonTextDisabled,
                    ]}
                  >
                    Assign
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        visible={addTaskModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setAddTaskModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Task</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddTaskModalVisible(false);
                  resetForm();
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Title Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Task Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter task title"
                  placeholderTextColor="#6B7280"
                  value={formData.title}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, title: text }))
                  }
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter task description"
                  placeholderTextColor="#6B7280"
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, description: text }))
                  }
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Assign To Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Assign To</Text>
                <DropDownPicker
                  open={userPickerOpen}
                  value={userPickerValue}
                  items={userPickerItems}
                  setOpen={setUserPickerOpen}
                  setValue={setUserPickerValue}
                  onChangeValue={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      assignedTo: value || "",
                    }));
                  }}
                  placeholder="Select a user"
                  style={styles.dropdownPicker}
                  textStyle={styles.dropdownText}
                  placeholderStyle={styles.dropdownPlaceholder}
                  dropDownContainerStyle={styles.dropdownContainer}
                  selectedItemLabelStyle={styles.dropdownSelectedText}
                  listItemLabelStyle={styles.dropdownListItemText}
                  ArrowDownIconComponent={({ style }) => (
                    <View style={style}>
                      <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                    </View>
                  )}
                  ArrowUpIconComponent={({ style }) => (
                    <View style={style}>
                      <Ionicons name="chevron-up" size={20} color="#9CA3AF" />
                    </View>
                  )}
                  TickIconComponent={({ style }) => (
                    <View style={style}>
                      <Ionicons name="checkmark" size={20} color="#4ADE80" />
                    </View>
                  )}
                  showArrowIcon={true}
                  disableLocalSearch={true}
                  closeAfterSelecting={true}
                  maxHeight={200}
                  scrollViewProps={{
                    nestedScrollEnabled: true,
                    showsVerticalScrollIndicator: true,
                    bounces: false,
                  }}
                  listMode="SCROLLVIEW"
                  zIndex={3000}
                  zIndexInverse={1000}
                />
              </View>

              {/* Due Date Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Due Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6B7280"
                  value={formData.dueDate}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, dueDate: text }))
                  }
                />
              </View>

              {/* Priority Selection */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.priorityButtons}>
                  {(["high", "medium", "low"] as const).map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        formData.priority === priority && {
                          backgroundColor: getPriorityColor(priority) + "30",
                          borderColor: getPriorityColor(priority),
                        },
                      ]}
                      onPress={() =>
                        setFormData((prev) => ({ ...prev, priority }))
                      }
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.priorityDot,
                          { backgroundColor: getPriorityColor(priority) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.priorityButtonText,
                          { color: getPriorityColor(priority) },
                        ]}
                      >
                        {priority.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddTask}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#4ADE80", "#22C55E"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#000000" />
                  <Text style={styles.submitButtonText}>Create Task</Text>
                </LinearGradient>
              </TouchableOpacity>
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
    backgroundColor: "#000000",
  },
  header: {
    width: "100%",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  headerSafeArea: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Sora_700Bold",
    color: "#FFFFFF",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingTop: 16,
  },
  taskCard: {
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2C2C2C",
  },
  taskHeader: {
    marginBottom: 12,
  },
  taskTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: "Sora_600SemiBold",
    color: "#FFFFFF",
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
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
    fontFamily: "Sora_600SemiBold",
  },
  taskDescription: {
    fontSize: 14,
    fontFamily: "Sora_400Regular",
    color: "#9CA3AF",
    lineHeight: 20,
  },
  taskDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2C2C2C",
    gap: 8,
  },
  taskDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskDetailText: {
    fontSize: 13,
    fontFamily: "Sora_400Regular",
    color: "#9CA3AF",
  },
  taskActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  acceptButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  assignButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: "Sora_600SemiBold",
    color: "#000000",
  },
  assignButtonText: {
    fontSize: 14,
    fontFamily: "Sora_600SemiBold",
    color: "#FFFFFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Sora_600SemiBold",
    color: "#FFFFFF",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Sora_400Regular",
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1F1F1F",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#2C2C2C",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2C",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Sora_700Bold",
    color: "#FFFFFF",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Sora_400Regular",
    color: "#9CA3AF",
    padding: 20,
    paddingBottom: 12,
  },
  assignModalContent: {
    padding: 20,
  },
  userList: {
    maxHeight: 400,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2C",
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarText: {
    fontSize: 14,
    fontFamily: "Sora_700Bold",
    color: "#FFFFFF",
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Sora_500Medium",
    color: "#FFFFFF",
  },
  formContent: {
    padding: 20,
    maxHeight: 500,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Sora_600SemiBold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#2C2C2C",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "Sora_400Regular",
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  dropdownPicker: {
    backgroundColor: "#2C2C2C",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    minHeight: 48,
  },
  dropdownText: {
    fontSize: 14,
    fontFamily: "Sora_400Regular",
    color: "#FFFFFF",
  },
  dropdownPlaceholder: {
    fontSize: 14,
    fontFamily: "Sora_400Regular",
    color: "#6B7280",
  },
  dropdownContainer: {
    backgroundColor: "#2C2C2C",
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontFamily: "Sora_400Regular",
    color: "#FFFFFF",
  },
  dropdownListItemText: {
    fontSize: 14,
    fontFamily: "Sora_400Regular",
    color: "#FFFFFF",
  },
  priorityButtons: {
    flexDirection: "row",
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    backgroundColor: "#2C2C2C",
    gap: 6,
  },
  priorityButtonText: {
    fontSize: 12,
    fontFamily: "Sora_600SemiBold",
  },
  submitButton: {
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Sora_600SemiBold",
    color: "#000000",
  },
  assignConfirmButton: {
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 20,
  },
  assignButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  assignConfirmButtonText: {
    fontSize: 16,
    fontFamily: "Sora_600SemiBold",
    color: "#000000",
  },
  assignConfirmButtonTextDisabled: {
    color: "#6B7280",
  },
});
