import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getMyCorrectionRequests } from '../../store/slices/attendanceSlice';
import moment from 'moment';
import { formatTime12Hour } from '../../utils/timeFormat';

export default function CorrectionHistoryScreen() {
  const dispatch = useAppDispatch();
  const { correctionRequests, isLoading } = useAppSelector((state) => state.attendance);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCorrectionRequests();
  }, [statusFilter]);

  const loadCorrectionRequests = () => {
    dispatch(getMyCorrectionRequests(statusFilter || undefined));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCorrectionRequests();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: { 
        colors: ['#D4A574', '#C19A6B'], 
        label: 'Pending' 
      },
      approved: { 
        colors: ['#A3E635', '#4ADE80'], 
        label: 'Approved' 
      },
      rejected: { 
        colors: ['#F97316', '#EF4444'], 
        label: 'Rejected' 
      },
    };

    const style = config[status] || config.pending;

    return (
      <LinearGradient
        colors={style.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.statusBadge}
      >
        <Text style={styles.statusText}>{style.label}</Text>
      </LinearGradient>
    );
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: any = {
      'check-in': 'Check-in Only',
      'check-out': 'Check-out Only',
      'both': 'Both Times',
    };
    return labels[type] || type;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
    >
        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterTab}
            onPress={() => setStatusFilter('')}
          >
            {statusFilter === '' ? (
              <LinearGradient
                colors={['#A3E635', '#4ADE80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterTabGradient}
              >
                <Text style={styles.filterTabTextActive} numberOfLines={1}>All</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.filterTabText} numberOfLines={1}>All</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterTab}
            onPress={() => setStatusFilter('pending')}
          >
            {statusFilter === 'pending' ? (
              <LinearGradient
                colors={['#A3E635', '#4ADE80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterTabGradient}
              >
                <Text style={styles.filterTabTextActive} numberOfLines={1}>Pending</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.filterTabText} numberOfLines={1}>Pending</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterTab}
            onPress={() => setStatusFilter('approved')}
          >
            {statusFilter === 'approved' ? (
              <LinearGradient
                colors={['#A3E635', '#4ADE80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterTabGradient}
              >
                <Text style={styles.filterTabTextActive} numberOfLines={1}>Approved</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.filterTabText} numberOfLines={1}>Approved</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterTab}
            onPress={() => setStatusFilter('rejected')}
          >
            {statusFilter === 'rejected' ? (
              <LinearGradient
                colors={['#A3E635', '#4ADE80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterTabGradient}
              >
                <Text style={styles.filterTabTextActive} numberOfLines={1}>Rejected</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.filterTabText} numberOfLines={1}>Rejected</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Correction Requests List */}
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : correctionRequests.length > 0 ? (
          <View style={styles.listContainer}>
            {correctionRequests.map((correction: any) => (
              <View key={correction._id} style={styles.correctionCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.dateText}>
                      {moment(correction.attendance?.date || correction.createdAt).format(
                        'MMM DD, YYYY'
                      )}
                    </Text>
                    <Text style={styles.typeText}>
                      {getRequestTypeLabel(correction.requestType)}
                    </Text>
                  </View>
                  {getStatusBadge(correction.status)}
                </View>

                {/* Current Record Section */}
                <View style={styles.timeSection}>
                  <Text style={styles.timeSectionTitle}>Current Record</Text>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Check-in</Text>
                    <Text style={styles.timeValue}>
                      {correction.originalCheckIn?.time
                        ? formatTime12Hour(correction.originalCheckIn.time)
                        : 'Not Recorded'}
                    </Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Check-out</Text>
                    <Text style={styles.timeValue}>
                      {correction.originalCheckOut?.time
                        ? formatTime12Hour(correction.originalCheckOut.time)
                        : 'Not Recorded'}
                    </Text>
                  </View>
                </View>

                {/* Requested Section */}
                <View style={styles.timeSection}>
                  <Text style={styles.timeSectionTitle}>Requested</Text>
                  {correction.requestedCheckIn?.time && (
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>Check-in</Text>
                      <Text style={styles.timeValue}>
                        {formatTime12Hour(correction.requestedCheckIn.time)}
                      </Text>
                    </View>
                  )}
                  {correction.requestedCheckOut?.time && (
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>Check-out</Text>
                      <Text style={styles.timeValue}>
                        {formatTime12Hour(correction.requestedCheckOut.time)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Reason Section */}
                <View style={styles.reasonSection}>
                  <View style={styles.reasonHeader}>
                    <Text style={styles.reasonTitle}>Reason</Text>
                    {/* <Ionicons name="open-outline" size={18} color="#9CA3AF" /> */}
                  </View>
                  <Text style={styles.reasonText}>{correction.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Correction Requests</Text>
            <Text style={styles.emptyText}>
              {statusFilter
                ? `No ${statusFilter} correction requests found`
                : 'You haven\'t submitted any correction requests yet'}
            </Text>
          </View>
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    fontSize: 11,
    fontFamily: 'Sora_500Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  filterTabTextActive: {
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    flexShrink: 0,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  correctionCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 18,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  typeText: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  timeSection: {
    marginBottom: 16,
  },
  timeSectionTitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  reasonSection: {
    marginTop: 8,
  },
  reasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasonTitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  reasonText: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});

