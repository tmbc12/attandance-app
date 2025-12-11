import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { submitCorrectionRequest } from '../../store/slices/attendanceSlice';
import { showToast } from '../../utils/toast';
import moment from 'moment';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CustomTimePicker from '../../components/CustomTimePicker';

export default function CorrectionRequestScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.attendance);
  const params = useLocalSearchParams();
  
  // Get attendance data from route params
  const attendance = params.attendance ? JSON.parse(params.attendance as string) : null;
  
  const [requestType, setRequestType] = useState<'check-in' | 'check-out' | 'both'>('check-in');
  const [reason, setReason] = useState('');
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  
  // Default to current check-in/out times, or current time
  const [requestedCheckInTime, setRequestedCheckInTime] = useState(
    attendance?.checkIn?.time ? new Date(attendance.checkIn.time) : new Date()
  );
  const [requestedCheckOutTime, setRequestedCheckOutTime] = useState(
    attendance?.checkOut?.time ? new Date(attendance.checkOut.time) : new Date()
  );


  // If no attendance data, show error and go back
  if (!attendance) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Request Correction</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>No Attendance Data</Text>
            <Text style={styles.errorText}>
              Please select an attendance record from the calendar or timesheet to request a correction.
            </Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <LinearGradient
                colors={['#06B6D4', '#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    // Validate reason
    if (reason.trim().length < 10) {
      showToast.error('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    // Validate attendance
    if (!attendance || !attendance._id) {
      showToast.error('Invalid attendance record');
      return;
    }

    const requestData: any = {
      attendanceId: attendance._id,
      requestType,
      reason: reason.trim(),
    };

    if (requestType === 'check-in' || requestType === 'both') {
      requestData.requestedCheckIn = {
        time: requestedCheckInTime.toISOString(),
        location: attendance.checkIn?.location,
        notes: `Correction request for check-in`,
      };
    }

    if (requestType === 'check-out' || requestType === 'both') {
      requestData.requestedCheckOut = {
        time: requestedCheckOutTime.toISOString(),
        location: attendance.checkIn?.location || attendance.checkOut?.location,
        notes: `Correction request for check-out`,
      };
    }

    try {
      await dispatch(submitCorrectionRequest(requestData)).unwrap();
      showToast.success('Correction request submitted successfully!');
      router.back();
    } catch (error: any) {
      showToast.error(error || 'Failed to submit correction request');
    }
  };

  const handleCheckInTimeConfirm = (time: Date) => {
    setRequestedCheckInTime(time);
  };

  const handleCheckOutTimeConfirm = (time: Date) => {
    setRequestedCheckOutTime(time);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Request Correction</Text>
          <Text style={styles.subtitle}>
            {moment(attendance?.date).format('MMMM DD, YYYY')}
          </Text>
        </View>

        {/* Current Attendance Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Current Record</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Check-in:</Text>
            <View style={styles.infoValueContainer}>
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.infoValueBorder}
              >
                <View style={styles.infoValueInner}>
                  <Text style={styles.infoValue}>
                    {attendance?.checkIn?.time
                      ? moment(attendance.checkIn.time).format('hh:mm A')
                      : 'Not recorded'}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Check-out:</Text>
            <View style={styles.infoValueContainer}>
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.infoValueBorder}
              >
                <View style={styles.infoValueInner}>
                  <Text style={styles.infoValue}>
                    {attendance?.checkOut?.time
                      ? moment(attendance.checkOut.time).format('hh:mm A')
                      : 'Not recorded'}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Request Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Type</Text>
          <View style={styles.optionsGrid}>
            <TouchableOpacity
              onPress={() => setRequestType('check-in')}
              activeOpacity={0.7}
            >
              {requestType === 'check-in' ? (
                <LinearGradient
                  colors={['#3B82F6', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.optionCardGradient}
                >
                  <Text style={styles.optionTextActive}>Check-in Only</Text>
                </LinearGradient>
              ) : (
                <View style={styles.optionCard}>
                  <Text style={styles.optionText}>Check-in Only</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRequestType('check-out')}
              activeOpacity={0.7}
            >
              {requestType === 'check-out' ? (
                <LinearGradient
                  colors={['#3B82F6', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.optionCardGradient}
                >
                  <Text style={styles.optionTextActive}>Check-out Only</Text>
                </LinearGradient>
              ) : (
                <View style={styles.optionCard}>
                  <Text style={styles.optionText}>Check-out Only</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRequestType('both')}
              activeOpacity={0.7}
            >
              {requestType === 'both' ? (
                <LinearGradient
                  colors={['#3B82F6', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.optionCardGradient}
                >
                  <Text style={styles.optionTextActive}>Both Times</Text>
                </LinearGradient>
              ) : (
                <View style={styles.optionCard}>
                  <Text style={styles.optionText}>Both Times</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Requested Times */}
        {(requestType === 'check-in' || requestType === 'both') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requested Check-in Time</Text>
            <TouchableOpacity
              onPress={() => setShowCheckInPicker(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.timePickerButton}
              >
                <View style={styles.timePickerButtonInner}>
                  <Text style={styles.timePickerText}>
                    {moment(requestedCheckInTime).format('hh:mm A')}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <CustomTimePicker
              visible={showCheckInPicker}
              initialTime={requestedCheckInTime}
              onClose={() => setShowCheckInPicker(false)}
              onConfirm={handleCheckInTimeConfirm}
            />
          </View>
        )}

        {(requestType === 'check-out' || requestType === 'both') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requested Check-out Time</Text>
            <TouchableOpacity
              onPress={() => setShowCheckOutPicker(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.timePickerButton}
              >
                <View style={styles.timePickerButtonInner}>
                  <Text style={styles.timePickerText}>
                    {moment(requestedCheckOutTime).format('hh:mm A')}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <CustomTimePicker
              visible={showCheckOutPicker}
              initialTime={requestedCheckOutTime}
              onClose={() => setShowCheckOutPicker(false)}
              onConfirm={handleCheckOutTimeConfirm}
            />
          </View>
        )}

        {/* Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Correction *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please provide a detailed reason for this correction request (min 10 characters)"
            placeholderTextColor="#6B7280"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{reason.length} / 10 minimum</Text>
        </View>

        {/* Submit Button */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <View style={styles.submitButtonDisabled}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <LinearGradient
                colors={['#06B6D4', '#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>📋 Note</Text>
          <Text style={styles.noteText}>
            Your correction request will be reviewed by an administrator. You will be notified
            once it's approved or rejected.
          </Text>
        </View>
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
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#1F1F1F',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  infoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  infoValueContainer: {
    alignItems: 'flex-end',
  },
  infoValueBorder: {
    padding: 1,
    borderRadius: 6,
  },
  infoValueInner: {
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    minWidth: 85,
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3C3C3C',
  },
  optionCardGradient: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  optionTextActive: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  timePickerButton: {
    padding: 1,
    borderRadius: 12,
  },
  timePickerButtonInner: {
    backgroundColor: '#1F1F1F',
    padding: 16,
    borderRadius: 11,
    alignItems: 'center',
  },
  timePickerText: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  textArea: {
    backgroundColor: '#1F1F1F',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3C3C3C',
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
  submitButtonGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#2C2C2C',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
  },
  noteCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3C3C3C',
  },
  noteTitle: {
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    color: '#F59E0B',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
});

