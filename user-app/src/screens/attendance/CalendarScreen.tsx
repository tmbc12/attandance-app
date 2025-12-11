import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getMyAttendance, getMyCorrectionRequests } from '../../store/slices/attendanceSlice';
import moment from 'moment';
import { formatTime12Hour, formatWorkingHours, formatLateTime } from '../../utils/timeFormat';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CalendarScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { monthlyAttendances, monthlyStats, isLoading, correctionRequests } = useAppSelector(
    (state) => state.attendance
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'weekly' | 'requests'>('calendar');

  useEffect(() => {
    loadMonthData();
  }, [currentMonth]);

  const loadMonthData = () => {
    dispatch(
      getMyAttendance({
        month: currentMonth.month() + 1,
        year: currentMonth.year(),
      })
    );
    // Load correction requests to check for pending ones
    dispatch(getMyCorrectionRequests('pending'));
  };

  // Determine attendance color based on new system
  const getAttendanceColor = (attendance: any) => {
    // Check if has pending correction request
    const hasPending = correctionRequests.some(
      (req) => req.attendance?._id === attendance._id && req.status === 'pending'
    );
    if (hasPending) return '#6B7280'; // Blue for correction request

    // Check if absent
    if (!attendance.checkIn || !attendance.checkIn.time) return '#EF4444'; // Red for absent

    // Check working hours against organization's standard (assume 8 hours)
    const workingHours = attendance.workingHours || 0;
    if (workingHours >= 8) return '#10B981'; // Green for full hours
    return '#F59E0B'; // Yellow for partial hours
  };

  // Prepare marked dates for calendar
  const markedDates = monthlyAttendances.reduce((acc: any, attendance) => {
    const dateKey = moment(attendance.date).format('YYYY-MM-DD');
    const currentDate = moment(new Date()).format('YYYY-MM-DD');
    const color = getAttendanceColor(attendance);

    acc[dateKey] = {
      marked: true,
      dotColor: color,
      selected: dateKey !== currentDate,
      selectedColor: color,
    };
    return acc;
  }, {});

  const selectedAttendance = monthlyAttendances.find(
    (a) => moment(a.date).format('YYYY-MM-DD') === selectedDate
  );


  // Check if selected attendance has a pending correction request
  const hasPendingCorrection = selectedAttendance 
    ? correctionRequests.some(
        (req) => req.attendance?._id === selectedAttendance._id && req.status === 'pending'
      )
    : false;

  // Group consecutive dates with full hours for gradient display
  const getConsecutiveDateGroups = () => {
    const groups: { start: string; end: string; dates: string[] }[] = [];
    const sortedDates = [...monthlyAttendances]
      .filter(a => {
        const color = getAttendanceColor(a);
        return color === '#10B981'; // Full hours (green)
      })
      .map(a => moment(a.date).format('YYYY-MM-DD'))
      .sort();

    if (sortedDates.length === 0) return groups;

    let currentGroup = [sortedDates[0]];
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = moment(sortedDates[i - 1]);
      const currDate = moment(sortedDates[i]);
      if (currDate.diff(prevDate, 'days') === 1) {
        currentGroup.push(sortedDates[i]);
      } else {
        if (currentGroup.length >= 2) {
          groups.push({
            start: currentGroup[0],
            end: currentGroup[currentGroup.length - 1],
            dates: currentGroup,
          });
        }
        currentGroup = [sortedDates[i]];
      }
    }
    if (currentGroup.length >= 2) {
      groups.push({
        start: currentGroup[0],
        end: currentGroup[currentGroup.length - 1],
        dates: currentGroup,
      });
    }
    return groups;
  };

  const consecutiveGroups = getConsecutiveDateGroups();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      

        {/* Calendar */}
        <View style={styles.calendarContainer}>
        <Calendar
          current={currentMonth.format('YYYY-MM-DD')}
          onDayPress={(day: any) => {
            const selectedMoment = moment(day.dateString);
            const today = moment().startOf('day');
            
            // Only open dialog if date is today or in the past
            if (selectedMoment.isSameOrBefore(today, 'day')) {
              setSelectedDate(day.dateString);
              setModalVisible(true);
            }
          }}
          onMonthChange={(month: any) => {
            setCurrentMonth(moment(`${month.year}-${month.month}-01`));
          }}
          markedDates={markedDates}
          theme={{
            backgroundColor: '#000000',
            calendarBackground: '#000000',
            textSectionTitleColor: '#FFFFFF',
            selectedDayBackgroundColor: '#3B82F6',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#4ADE80',
            dayTextColor: '#FFFFFF',
            textDisabledColor: '#666666',
            monthTextColor: '#FFFFFF',
            textMonthFontWeight: 'bold',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            arrowColor: '#FFFFFF',
          }}
        />
      </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Full Hours</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#A855F7' }]} />
            <Text style={styles.legendText}>Partial</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#6B7280' }]} />
            <Text style={styles.legendText}>Request</Text>
          </View>
        </View>

        {/* Monthly Statistics */}
        {monthlyStats && (
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <View style={styles.hamburgerIcon}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
              <Text style={styles.statsTitle}>Monthly Summary</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.totalDays}</Text>
                <Text style={styles.statLabel}>Total days</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.presentDays}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.lateDays || 0}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
              <View style={styles.statItem}>
                {(() => {
                  const avgHours = monthlyStats.averageHours || 0;
                  const totalMinutes = Math.floor(avgHours * 60);
                  const numberPart = totalMinutes < 60 ? `${totalMinutes}` : `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`;
                  const suffix = totalMinutes < 60 ? ' min' : 'h';
                  
                  return (
                    <View style={styles.avgHoursContainer}>
                      <Text style={styles.avgHoursNumber}>{numberPart}</Text>
                      <Text style={styles.avgHoursSuffix}>{suffix}</Text>
                    </View>
                  );
                })()}
                <Text style={styles.statLabel}>Avg Hours</Text>
              </View>
            </View>
          </View>
        )}

      {/* Day Details Modal */}
      <Modal
        visible={modalVisible && selectedDate !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={['#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalContentBorder}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedDate ? moment(selectedDate).format('DD MMMM, dddd') : ''}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.detailsCard}>
                  {/* Check in */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Check in</Text>
                    <View style={styles.detailValueContainer}>
                      <LinearGradient
                        colors={['#3B82F6', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.detailValueBorder}
                      >
                        <View style={styles.detailValueInner}>
                          <Text style={styles.detailValue}>
                            {selectedAttendance?.checkIn?.time 
                              ? formatTime12Hour(new Date(selectedAttendance.checkIn.time))
                              : '--'}
                          </Text>
                        </View>
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Check out */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Check out</Text>
                    <View style={styles.detailValueContainer}>
                      <LinearGradient
                        colors={['#3B82F6', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.detailValueBorder}
                      >
                        <View style={styles.detailValueInner}>
                          <Text style={styles.detailValue}>
                            {selectedAttendance?.checkOut?.time 
                              ? formatTime12Hour(new Date(selectedAttendance.checkOut.time))
                              : '--'}
                          </Text>
                        </View>
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Working Hours */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Working Hours</Text>
                    <View style={styles.detailValueContainer}>
                      <LinearGradient
                        colors={['#3B82F6', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.detailValueBorder}
                      >
                        <View style={styles.detailValueInner}>
                          <Text style={styles.detailValue}>
                            {selectedAttendance?.workingHours 
                              ? formatWorkingHours(selectedAttendance.workingHours)
                              : '0 min'}
                          </Text>
                        </View>
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={styles.statusText}>
                      {selectedAttendance?.isLate ? 'Late' : 
                       selectedAttendance?.checkIn?.time ? 'Present' : 'Absent'}
                    </Text>
                  </View>

                  {/* Raise Request Button */}
                  <TouchableOpacity
                    style={styles.raiseRequestButton}
                    onPress={() => {
                      setModalVisible(false);
                      if (selectedAttendance) {
                        router.push({
                          pathname: '/correction-request' as any,
                          params: { attendance: JSON.stringify(selectedAttendance) },
                        });
                      }
                    }}
                  >
                    <LinearGradient
                      colors={['#06B6D4', '#8B5CF6', '#EC4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.raiseRequestButtonGradient}
                    >
                      <Text style={styles.raiseRequestButtonText}>Raise Request</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 36,
  },
  activeTab: {
    // Gradient applied via LinearGradient
  },
  tabGradient: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeTabText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Sora_500Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  calendarContainer: {
    marginHorizontal: 16,
    marginVertical: 0,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
  },
  statsCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
  },
  statsHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  hamburgerIcon: {
    gap: 4,
    marginBottom: 8,
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '47%',
    padding: 16,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontFamily: 'Sora_700Bold',
    color: '#F97316',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    marginTop: 4,
  },
  avgHoursContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  avgHoursNumber: {
    fontSize: 32,
    fontFamily: 'Sora_700Bold',
    color: '#F97316',
  },
  avgHoursSuffix: {
    fontSize: 32,
    fontFamily: 'Sora_700Bold',
    color: '#F97316',
    marginLeft: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lateNotice: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  lateText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  correctionButton: {
    marginTop: 16,
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  correctionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingNotice: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
  },
  pendingIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  pendingText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContentBorder: {
    borderRadius: 16,
    padding: 1.5,
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 14.5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  detailsCard: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  detailValueContainer: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  detailValueBorder: {
    padding: 1,
    borderRadius: 6,
  },
  detailValueInner: {
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    minWidth: 85,
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  detailValueBorderDisabled: {
    padding: 1,
    borderRadius: 6,
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#3C3C3C',
  },
  detailValueInnerDisabled: {
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    minWidth: 85,
    alignItems: 'center',
    opacity: 0.7,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  raiseRequestButton: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  raiseRequestButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raiseRequestButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  timePickerModalContent: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  timePickerCancel: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  timePickerTitle: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  timePickerDone: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#3B82F6',
  },
  timePickerContainer: {
    backgroundColor: '#1F1F1F',
    paddingVertical: 20,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTimePicker: {
    flexDirection: 'row',
    width: '100%',
    height: 200,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pickerColumn: {
    flex: 1,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pickerItem: {
    height: 50,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 20,
    fontFamily: 'Sora_400Regular',
    color: '#6B7280',
  },
  pickerItemTextSelected: {
    fontSize: 24,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  periodButton: {
    height: 50,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 25,
  },
  periodText: {
    fontSize: 18,
    fontFamily: 'Sora_400Regular',
    color: '#6B7280',
  },
  periodTextSelected: {
    fontSize: 20,
    fontFamily: 'Sora_600SemiBold',
    color: '#3B82F6',
  },
  pickerScrollContent: {
    paddingVertical: 75,
  },
  pickerSelectionIndicator: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    height: 50,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    zIndex: 1,
    pointerEvents: 'none',
  },
});
