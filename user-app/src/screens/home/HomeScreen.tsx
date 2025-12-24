import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated as RNAnimated,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  checkIn,
  checkOut,
  getTodayStatus,
  loadStoredAttendanceState,
} from "../../store/slices/attendanceSlice";
import * as Location from "expo-location";
import moment from "moment";
import { showToast } from "../../utils/toast";
import { LoadingOverlay } from "../../components/LoadingOverlay";
import { useWorkTimer } from "../../hooks/useWorkTimer";
import {
  formatTime12Hour,
  formatWorkingHours,
  formatLateTime,
} from "../../utils/timeFormat";
import { TaskList } from "../../components/TaskList";
import { AddTaskModal } from "../../components/AddTaskModal";
import { useNotification } from "@/context/NotificationContext";
import { ExpoTokenAPI } from "@/src/api/expo-token";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { socket } from "@/src/utils/socket";
import { addTask } from "@/src/store/slices/tasksSlice";

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAppSelector((state) => state.auth);

  const { notification, expoPushToken, error } = useNotification();

  const saveExpoToken = async () => {
    if (expoPushToken && user?._id) {
      try {
        await ExpoTokenAPI.saveToken({
          userId: user._id,
          token: expoPushToken,
        });
      } catch (error) {
        console.error("Error saving Expo token:", error);
      }
    }
  };

  useEffect(() => {
    if (expoPushToken && user?._id) {
      console.log("Expo Push Token:", expoPushToken);
      saveExpoToken();
    }
    if (error) {
      console.error("Notification Error:", error);
    }
  }, [expoPushToken, user?._id]);

  useEffect(() => {
    let isMounted = true;

    const connectSocket = async () => {
      const token = await AsyncStorage.getItem("authToken");

      if (!token || !user?._id) return;

      if (!socket.connected) {
        socket.auth = { token };
        socket.connect();
      }

      socket.on("task:assigned", (task) => {
        if (!isMounted) return;
        dispatch(addTask(task));
      });
    };

    connectSocket();

    return () => {
      isMounted = false;
      socket.off("task:assigned");
      socket.disconnect();
    };
  }, [user?._id]);

  const { todayAttendance, hasCheckedIn, hasCheckedOut, isLoading } =
    useAppSelector((state) => state.attendance);
  const [currentTime, setCurrentTime] = useState(moment().format("hh:mm:ss A"));
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedPage, setSelectedPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Calculate bottom padding for tab bar (60px height + safe area bottom)
  const tabBarHeight = 60 + insets.bottom;

  // Animations
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  // Get check-in time for timer
  const checkInTime = todayAttendance?.checkIn?.time;
  const checkOutTime = todayAttendance?.checkOut?.time;
  const { elapsedTime, totalSeconds } = useWorkTimer(
    checkInTime,
    checkOutTime,
    hasCheckedOut
  );

  // Calculate progress (9 hour workday = 32400 seconds)
  const standardWorkSeconds = 9 * 60 * 60;
  const workProgress =
    hasCheckedIn && !hasCheckedOut
      ? Math.min(totalSeconds / standardWorkSeconds, 1)
      : 0;

  // Format hours worked
  const hoursWorked = hasCheckedOut
    ? todayAttendance?.workingHours || 0
    : totalSeconds / 3600;
  const formattedHours = formatWorkingHours(hoursWorked);

  useEffect(() => {
    // Load stored state first (for offline persistence)
    dispatch(loadStoredAttendanceState());

    // Then fetch today's status from server
    dispatch(getTodayStatus())
      .unwrap()
      .catch((error) => {
        showToast.error("Failed to load attendance status", error);
      });

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(moment().format("hh:mm:ss A"));
    }, 1000);

    // Start entrance animations
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return () => {
      clearInterval(timer);
    };
  }, [dispatch, fadeAnim]);

  // Separate effect for pulsing animation
  useEffect(() => {
    const pulseAnimation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (hasCheckedIn && !hasCheckedOut) {
      pulseAnimation.start();
    } else {
      pulseAnimation.stop();
    }

    return () => {
      pulseAnimation.stop();
    };
  }, [hasCheckedIn, hasCheckedOut, pulseAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(getTodayStatus()).unwrap();
      showToast.success("Refreshed", "Attendance status updated");
    } catch (error: any) {
      showToast.error("Refresh failed", error || "Could not update status");
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const handleCheckIn = async () => {
    try {
      setIsProcessing(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        showToast.warning(
          "Location Permission",
          "Location access denied. Check-in without location."
        );
      }

      let location = undefined;
      if (status === "granted") {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          location = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        } catch (locError) {
          showToast.warning(
            "Location Error",
            "Could not get location. Continuing without it."
          );
        }
      }

      await dispatch(checkIn({ location })).unwrap();
      showToast.success("Work Started!", "Have a great day!");
    } catch (error: any) {
      showToast.error("Couldn't Start Work", error || "Please try again");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setIsProcessing(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        showToast.warning(
          "Location Permission",
          "Location access denied. Check-out without location."
        );
      }

      let location = undefined;
      if (status === "granted") {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          location = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        } catch (locError) {
          showToast.warning(
            "Location Error",
            "Could not get location. Continuing without it."
          );
        }
      }

      await dispatch(checkOut({ location })).unwrap();
      showToast.success("Work Finished!", "Great job today!");
    } catch (error: any) {
      showToast.error("Couldn't Finish Work", error || "Please try again");
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentDate = () => {
    const date = moment();
    const dayNumber = date.date();
    const dayName = date.format("dddd");
    return `${dayNumber} ${dayName}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePageChange = (pageIndex: number) => {
    setSelectedPage(pageIndex);
    // Scroll to the selected page
    const screenWidth = Dimensions.get("window").width;
    scrollViewRef.current?.scrollTo({
      x: pageIndex * screenWidth,
      animated: true,
    });
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const pageWidth = event.nativeEvent.layoutMeasurement.width;
    const currentPage = Math.round(contentOffsetX / pageWidth);
    if (currentPage !== selectedPage) {
      setSelectedPage(currentPage);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <LoadingOverlay
        visible={isProcessing}
        message={
          hasCheckedIn && !hasCheckedOut
            ? "Finishing your work day..."
            : "Starting your work day..."
        }
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4ADE80"
            colors={["#4ADE80"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              // Navigate to settings/profile screen
              router.push("/(tabs)/profile");
            }}
          >
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.profileContainer}>
            <View style={styles.profileImageBorder}>
              <Svg width={48} height={48} style={styles.progressSvg}>
                {/* Background circle */}
                <Circle
                  cx="24"
                  cy="24"
                  r="22"
                  stroke="#1F1F1F"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Progress circle */}
                <Circle
                  cx="24"
                  cy="24"
                  r="22"
                  stroke="#4ADE80"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={2 * Math.PI * 22 * (1 - workProgress)}
                  strokeLinecap="round"
                  transform={`rotate(-90 24 24)`}
                />
              </Svg>
              <View style={styles.profileImage}>
                <Text style={styles.profileImageText}>
                  {user ? getInitials(user.name) : "U"}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              // Placeholder for notifications
              showToast.info("Notifications", "No new notifications");
            }}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Start Working Section */}
        <RNAnimated.View
          style={[styles.startWorkingSection, { opacity: fadeAnim }]}
        >
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            style={styles.swipeContainer}
            contentContainerStyle={styles.swipeContent}
          >
            {/* Page 0: Start Working Button / Timer */}
            <View style={styles.swipePage}>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  (isLoading || isProcessing) && styles.buttonDisabled,
                ]}
                onPress={
                  !hasCheckedIn
                    ? handleCheckIn
                    : hasCheckedOut
                    ? undefined
                    : handleCheckOut
                }
                disabled={isLoading || isProcessing || hasCheckedOut}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    hasCheckedIn && !hasCheckedOut
                      ? ["#FF4500", "#FFD700"]
                      : ["#4ADE80", "#A3E635"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={
                    hasCheckedIn && !hasCheckedOut
                      ? { x: 1, y: 1 }
                      : { x: 1, y: 0 }
                  }
                  style={styles.startButtonGradient}
                >
                  {isLoading && !isProcessing ? (
                    <ActivityIndicator color="#000" size="large" />
                  ) : hasCheckedIn ? (
                    <>
                      <Text style={styles.timerText}>
                        {(() => {
                          const hours = Math.floor(totalSeconds / 3600);
                          const minutes = Math.floor(
                            (totalSeconds % 3600) / 60
                          );
                          if (hours === 0) {
                            return `${minutes} min`;
                          }
                          return `${hours} hr ${minutes} min`;
                        })()}
                      </Text>
                      {!hasCheckedOut && <View style={styles.separatorLine} />}
                      {!hasCheckedOut && (
                        <View style={styles.finishWorkContainer}>
                          <Ionicons name="square" size={16} color="#FFFFFF" />
                          <Text style={styles.finishWorkText}>Finish work</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <Ionicons name="play" size={32} color="#000" />
                      <Text style={styles.startButtonText}>Start working</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.dateText}>{getCurrentDate()}</Text>
            </View>

            {/* Page 1: Attendance Info Card */}
            <View style={styles.swipePage}>
              {todayAttendance?.checkIn ? (
                <View style={styles.attendanceCard}>
                  <LinearGradient
                    colors={["#F97316", "#EF4444"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.attendanceCardGradient}
                  >
                    <Text style={styles.attendanceCardTitle}>
                      Start working at{" "}
                      {todayAttendance.checkInTime ||
                        formatTime12Hour(todayAttendance.checkIn.time)}
                    </Text>
                    {todayAttendance.isLate && (
                      <View style={styles.lateWarningContainer}>
                        <Ionicons name="warning" size={18} color="#FFFFFF" />
                        <Text style={styles.lateWarningText}>
                          Arrived at work{" "}
                          {todayAttendance.lateByFormatted ||
                            formatLateTime(todayAttendance.lateBy)}{" "}
                          late
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </View>
              ) : (
                <View style={styles.attendanceCard}>
                  <LinearGradient
                    colors={["#F97316", "#EF4444"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.attendanceCardGradient}
                  >
                    <Text style={styles.attendanceCardTitle}>
                      No attendance record yet
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Pagination Indicators */}
          <View style={styles.paginationContainer}>
            {[0, 1].map((index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handlePageChange(index)}
                style={styles.paginationDotContainer}
              >
                <View
                  style={[
                    styles.paginationDot,
                    selectedPage === index && styles.paginationDotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </RNAnimated.View>

        {/* My Tasks Section */}
        <RNAnimated.View style={[styles.tasksSection, { opacity: fadeAnim }]}>
          <View style={styles.tasksSectionHeader}>
            <Text style={styles.tasksSectionTitle}>My tasks</Text>
            <TouchableOpacity onPress={() => setShowAddTask(true)}>
              <LinearGradient
                colors={["#EF4444", "#F97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addTaskButton}
              >
                <Text style={styles.addTaskButtonText}>+ Add Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          <TaskList />
        </RNAnimated.View>
      </ScrollView>

      {/* Add Task Modal */}
      <AddTaskModal
        visible={showAddTask}
        onClose={() => setShowAddTask(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1F1F1F",
    justifyContent: "center",
    alignItems: "center",
  },
  profileContainer: {
    alignItems: "center",
  },
  profileImageBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  progressSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  profileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    zIndex: 1,
  },
  profileImageText: {
    fontSize: 16,
    fontFamily: "Sora_700Bold",
    color: "#3B82F6",
  },
  profileImageInner: {
    width: "100%",
    height: "100%",
  },
  startWorkingSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  swipeContainer: {
    width: "100%",
  },
  swipeContent: {
    alignItems: "center",
  },
  swipePage: {
    width: Dimensions.get("window").width,
    alignItems: "center",
    justifyContent: "center",
  },
  startButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: "hidden",
    marginBottom: 12,
  },
  startButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  startButtonText: {
    fontSize: 14,
    fontFamily: "Sora_600SemiBold",
    color: "#000000",
    marginTop: 6,
  },
  timerText: {
    fontSize: 28,
    fontFamily: "Sora_700Bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  separatorLine: {
    width: "60%",
    height: 1,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  finishWorkContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  finishWorkText: {
    fontSize: 16,
    fontFamily: "Sora_600SemiBold",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dateText: {
    fontSize: 16,
    fontFamily: "Sora_400Regular",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  paginationContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  paginationDotContainer: {
    padding: 4,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1F1F1F",
  },
  paginationDotActive: {
    backgroundColor: "#4ADE80",
  },
  attendanceCard: {
    width: "90%",
    maxWidth: 320,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  attendanceCardGradient: {
    padding: 20,
    alignItems: "center",
  },
  attendanceCardTitle: {
    fontSize: 18,
    fontFamily: "Sora_700Bold",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  lateWarningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lateWarningText: {
    fontSize: 14,
    fontFamily: "Sora_500Medium",
    color: "#FFFFFF",
  },
  tasksSection: {
    backgroundColor: "#1F1F1F",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    marginTop: 20,
    minHeight: 400,
  },
  tasksSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tasksSectionTitle: {
    fontSize: 24,
    fontFamily: "Sora_700Bold",
    color: "#FFFFFF",
  },
  addTaskButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addTaskButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Sora_600SemiBold",
  },
  separator: {
    height: 1,
    backgroundColor: "#2F2F2F",
    marginBottom: 16,
  },
});
