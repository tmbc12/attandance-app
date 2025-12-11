import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getTeamToday } from '../../store/slices/attendanceSlice';
import moment from 'moment';
import { formatTime12Hour, formatWorkingHours, formatLateTime } from '../../utils/timeFormat';

export default function TeamScreen() {
  const dispatch = useAppDispatch();
  const { teamAttendances, isLoading } = useAppSelector((state) => state.attendance);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      await dispatch(getTeamToday()).unwrap();
    } catch (error) {
      console.error('Failed to load team data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTeamData();
    setRefreshing(false);
  };

  // Filter team members
  const filteredTeam = teamAttendances.filter((member) => {
    if (filter === 'all') return true;
    if (filter === 'present') return member.hasCheckedIn;
    if (filter === 'absent') return !member.hasCheckedIn;
    return true;
  });

  // Calculate statistics
  const totalMembers = teamAttendances.length;
  const presentMembers = teamAttendances.filter((m) => m.hasCheckedIn).length;
  const checkedOutMembers = teamAttendances.filter((m) => m.hasCheckedOut).length;
  const lateMembers = teamAttendances.filter((m) => m.isLate).length;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (member: any) => {
    if (member.hasCheckedOut) return '#6B7280'; // Gray - Done
    if (member.hasCheckedIn) return '#10B981'; // Green - Working
    return '#EF4444'; // Red - Not checked in
  };

  const getStatusText = (member: any) => {
    if (member.hasCheckedOut) return 'Finished';
    if (member.hasCheckedIn) return 'Working';
    return 'Not Started';
  };

  const renderTeamMember = ({ item }: { item: any }) => {
    const statusColor = getStatusColor(item);
    const statusText = getStatusText(item);

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberHeader}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: statusColor }]}>
              <Text style={styles.avatarText}>{getInitials(item.employee.name)}</Text>
            </View>
          </View>

          {/* Member Info */}
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.employee.name}</Text>
            <Text style={styles.memberDesignation}>
              {item.employee.designation || 'Employee'}
            </Text>
            <Text style={styles.memberDepartment}>
              {typeof item.employee.department === 'string'
                ? item.employee.department
                : item.employee.department?.name || 'No Department'}
            </Text>
          </View>

          {/* Status Badge */}
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>
        </View>

        {/* Attendance Details */}
        {item.hasCheckedIn && (
          <View style={styles.attendanceDetails}>
            {item.checkInTime && (
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Started:</Text>
                <Text style={styles.timeValue}>
                  {formatTime12Hour(item.checkInTime)}
                </Text>
              </View>
            )}
            {item.checkOutTime && (
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Finished:</Text>
                <Text style={styles.timeValue}>
                  {formatTime12Hour(item.checkOutTime)}
                </Text>
              </View>
            )}
            {item.workingHours > 0 && (
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Worked:</Text>
                <Text style={[styles.timeValue, styles.hoursValue]}>
                  {formatWorkingHours(item.workingHours)}
                </Text>
              </View>
            )}
            {item.isLate && (
              <View style={styles.lateTag}>
                <Text style={styles.lateText}>⚠️ Arrived {formatLateTime(item.lateBy)} late</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#F97316', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <Text style={styles.title}>Team Status</Text>
          <Text style={styles.subtitle}>{moment().format('dddd, MMMM DD, YYYY')}</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterTab}
          onPress={() => setFilter('all')}
        >
          {filter === 'all' ? (
            <LinearGradient
              colors={['#A3E635', '#4ADE80']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.filterTabGradient}
            >
              <Text style={styles.filterTabTextActive}>
                All ({totalMembers})
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.filterTabText}>
              All ({totalMembers})
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterTab}
          onPress={() => setFilter('present')}
        >
          {filter === 'present' ? (
            <LinearGradient
              colors={['#A3E635', '#4ADE80']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.filterTabGradient}
            >
              <Text style={styles.filterTabTextActive}>
                Present ({presentMembers})
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.filterTabText}>
              Present ({presentMembers})
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterTab}
          onPress={() => setFilter('absent')}
        >
          {filter === 'absent' ? (
            <LinearGradient
              colors={['#A3E635', '#4ADE80']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.filterTabGradient}
            >
              <Text style={styles.filterTabTextActive}>
                Absent ({totalMembers - presentMembers})
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.filterTabText}>
              Absent ({totalMembers - presentMembers})
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Team List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading team...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTeam}
          renderItem={renderTeamMember}
          keyExtractor={(item) => item.employee._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No team members found</Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerSafeArea: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 36,
  },
  filterTabGradient: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterTabTextActive: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  memberCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  memberDesignation: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  memberDepartment: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadgeContainer: {
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
  },
  attendanceDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  timeValue: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  hoursValue: {
    color: '#4ADE80',
  },
  lateTag: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F97316',
    borderRadius: 8,
  },
  lateText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
});
