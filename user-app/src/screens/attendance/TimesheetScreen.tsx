import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getMyAttendance } from '../../store/slices/attendanceSlice';
import moment from 'moment';
import { formatTime12Hour, formatLateTime } from '../../utils/timeFormat';
import { useRouter } from 'expo-router';

export default function TimesheetScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { monthlyAttendances } = useAppSelector((state) => state.attendance);
  const [currentWeekStart, setCurrentWeekStart] = useState(moment().startOf('week'));

  useEffect(() => {
    loadWeekData();
  }, [currentWeekStart]);

  const loadWeekData = () => {
    dispatch(
      getMyAttendance({
        month: currentWeekStart.month() + 1,
        year: currentWeekStart.year(),
      })
    );
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(currentWeekStart.clone().subtract(1, 'week'));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(currentWeekStart.clone().add(1, 'week'));
  };

  // Get current week's attendance
  const weekEnd = currentWeekStart.clone().endOf('week');
  const weekAttendances = monthlyAttendances.filter((attendance) => {
    const date = moment(attendance.date);
    return date.isBetween(currentWeekStart, weekEnd, 'day', '[]');
  });

  // Calculate week statistics
  const totalHours = weekAttendances.reduce((sum, att) => sum + att.workingHours, 0);
  const totalDays = weekAttendances.length;
  const presentDays = weekAttendances.filter((att) => att.checkIn && att.checkIn.time).length;
  const lateDays = weekAttendances.filter((att) => att.isLate).length;
  const avgHours = totalDays > 0 ? totalHours / totalDays : 0;

  // Generate 7 days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = currentWeekStart.clone().add(i, 'days');
    const attendance = weekAttendances.find(
      (att) => moment(att.date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    );
    return { date, attendance };
  });

  // Format working hours as "X hrs Y min"
  const formatWorkingHoursDetailed = (hours: number) => {
    const totalMinutes = Math.floor(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs === 0) {
      return `${mins} min`;
    }
    if (mins === 0) {
      return `${hrs} hrs`;
    }
    return `${hrs} hrs ${mins} min`;
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Date Navigation */}
        <View style={styles.dateNavigation}>
          <TouchableOpacity onPress={goToPreviousWeek} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.dateRangeText}>
            {currentWeekStart.format('MMM DD')} - {weekEnd.format('MMM DD, YYYY')}
          </Text>
          <TouchableOpacity onPress={goToNextWeek} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>This Week's Work Record</Text>

        {/* Week Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValueGreen}>{totalDays}</Text>
              <Text style={styles.summaryLabel}>Total days</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValueWhite}>{presentDays}</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValueGreen}>{lateDays}</Text>
              <Text style={styles.summaryLabel}>Late</Text>
            </View>
            <View style={styles.summaryItem}>
              {(() => {
                const totalMinutes = Math.floor(avgHours * 60);
                const numberPart = totalMinutes < 60 ? `${totalMinutes}` : `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`;
                const suffix = totalMinutes < 60 ? ' min' : 'h';
                
                return (
                  <View style={styles.avgHoursContainer}>
                    <Text style={styles.summaryValueGreen}>{numberPart}</Text>
                    <Text style={styles.summaryValueYellow}>{suffix}</Text>
                  </View>
                );
              })()}
              <Text style={styles.summaryLabel}>Avg Hours</Text>
            </View>
          </View>
        </View>

        {/* Daily Work Records */}
        {weekDays.map(({ date, attendance }, index) => {
          const isPresent = attendance && attendance.checkIn && attendance.checkIn.time;
          const isAbsent = !isPresent;

          return (
            <View key={index} style={styles.dayCard}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <View>
                  <Text style={styles.dayName}>{date.format('dddd')}</Text>
                  <Text style={styles.dayDate}>{date.format('MMM DD')}</Text>
                </View>
                {isPresent ? (
                  <LinearGradient
                    colors={['#A3E635', '#4ADE80']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.statusButton}
                  >
                    <Text style={styles.statusButtonText}>Present</Text>
                  </LinearGradient>
                ) : (
                  <LinearGradient
                    colors={['#F97316', '#EF4444']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.statusButton}
                  >
                    <Text style={styles.statusButtonText}>Absent</Text>
                  </LinearGradient>
                )}
              </View>

              {/* Day Content */}
              {isAbsent ? (
                <Text style={styles.noWorkText}>No Work Records</Text>
              ) : (
                <View style={styles.dayContent}>
                  {/* Work Details */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Started</Text>
                    <Text style={styles.detailValue}>
                      {attendance?.checkIn ? formatTime12Hour(attendance.checkIn.time) : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Finished</Text>
                    <Text style={styles.detailValue}>
                      {attendance?.checkOut ? formatTime12Hour(attendance.checkOut.time) : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Worked</Text>
                    <Text style={styles.detailValue}>
                      {attendance?.workingHours ? formatWorkingHoursDetailed(attendance.workingHours) : '0 min'}
                    </Text>
                  </View>

                  {/* Late Arrival Notice */}
                  {attendance?.isLate && (
                    <View style={styles.lateNoticeContainer}>
                      <LinearGradient
                        colors={['#F97316', '#EF4444']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.lateNoticeBorder}
                      >
                        <View style={styles.lateNoticeInner}>
                          <Text style={styles.lateNoticeText}>
                            Arrived {attendance.lateByFormatted || formatLateTime(attendance.lateBy)} late
                          </Text>
                        </View>
                      </LinearGradient>
                    </View>
                  )}

                  {/* Fix Time Record Button */}
                  <TouchableOpacity
                    style={styles.fixTimeButton}
                    onPress={() => {
                      router.push({
                        pathname: '/correction-request' as any,
                        params: { attendance: JSON.stringify(attendance) },
                      });
                    }}
                  >
                    <LinearGradient
                      colors={['#F97316', '#EF4444']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.fixTimeButtonGradient}
                    >
                      <Text style={styles.fixTimeButtonText}>Fix Time Record</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

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
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    gap: 16,
  },
  navArrow: {
    padding: 8,
  },
  dateRangeText: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '47%',
    padding: 16,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryValueGreen: {
    fontSize: 32,
    fontFamily: 'Sora_700Bold',
    color: '#4ADE80',
  },
  summaryValueWhite: {
    fontSize: 32,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  summaryValueYellow: {
    fontSize: 32,
    fontFamily: 'Sora_700Bold',
    color: '#FFD700',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    marginTop: 4,
  },
  avgHoursContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dayCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dayName: {
    fontSize: 18,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  noWorkText: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  dayContent: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  lateNoticeContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  lateNoticeBorder: {
    padding: 1,
    borderRadius: 8,
  },
  lateNoticeInner: {
    backgroundColor: '#2C2C2C',
    padding: 12,
    borderRadius: 7,
  },
  lateNoticeText: {
    fontSize: 14,
    fontFamily: 'Sora_500Medium',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  fixTimeButton: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fixTimeButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixTimeButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
});
