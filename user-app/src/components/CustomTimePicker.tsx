import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';

interface CustomTimePickerProps {
  visible: boolean;
  initialTime: Date;
  onClose: () => void;
  onConfirm: (time: Date) => void;
}

export default function CustomTimePicker({
  visible,
  initialTime,
  onClose,
  onConfirm,
}: CustomTimePickerProps) {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // Initialize picker values from initialTime when modal opens
  useEffect(() => {
    if (visible && initialTime) {
      const hours = initialTime.getHours();
      const minutes = initialTime.getMinutes();
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      setHour(hour12);
      setMinute(minutes);
      setPeriod(hours >= 12 ? 'PM' : 'AM');

      // Scroll to correct positions
      setTimeout(() => {
        hourScrollRef.current?.scrollTo({
          y: (hour12 - 1) * 50,
          animated: false,
        });
        minuteScrollRef.current?.scrollTo({
          y: minutes * 50,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialTime]);

  // Convert 12-hour format to 24-hour format and create Date
  const getTime = (): Date => {
    let hour24 = hour;
    if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    } else if (period === 'AM' && hour === 12) {
      hour24 = 0;
    }
    const newTime = new Date(initialTime);
    newTime.setHours(hour24, minute, 0, 0);
    return newTime;
  };

  const handleConfirm = () => {
    const selectedTime = getTime();
    onConfirm(selectedTime);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.timePickerModalOverlay}>
        <View style={styles.timePickerModalContent}>
          <View style={styles.timePickerHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.timePickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.timePickerTitle}>Select Time</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.timePickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timePickerContainer}>
            <View style={styles.customTimePicker}>
              {/* Hours */}
              <View style={styles.pickerColumn}>
                <View style={styles.pickerSelectionIndicator} />
                <ScrollView
                  ref={hourScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={50}
                  decelerationRate="fast"
                  contentContainerStyle={styles.pickerScrollContent}
                  onScroll={(e) => {
                    const offset = e.nativeEvent.contentOffset.y;
                    const index = Math.round(offset / 50);
                    if (index >= 0 && index < 12 && hour !== index + 1) {
                      setHour(index + 1);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={styles.pickerItem}
                      onPress={() => {
                        setHour(h);
                        hourScrollRef.current?.scrollTo({
                          y: (h - 1) * 50,
                          animated: true,
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          hour === h && styles.pickerItemTextSelected,
                        ]}
                      >
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Minutes */}
              <View style={styles.pickerColumn}>
                <View style={styles.pickerSelectionIndicator} />
                <ScrollView
                  ref={minuteScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={50}
                  decelerationRate="fast"
                  contentContainerStyle={styles.pickerScrollContent}
                  onScroll={(e) => {
                    const offset = e.nativeEvent.contentOffset.y;
                    const index = Math.round(offset / 50);
                    if (index >= 0 && index < 60 && minute !== index) {
                      setMinute(index);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={styles.pickerItem}
                      onPress={() => {
                        setMinute(m);
                        minuteScrollRef.current?.scrollTo({
                          y: m * 50,
                          animated: true,
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          minute === m && styles.pickerItemTextSelected,
                        ]}
                      >
                        {m.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* AM/PM */}
              <View style={styles.pickerColumn}>
                <TouchableOpacity
                  style={styles.periodButton}
                  onPress={() => setPeriod('AM')}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === 'AM' && styles.periodTextSelected,
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.periodButton}
                  onPress={() => setPeriod('PM')}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === 'PM' && styles.periodTextSelected,
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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





