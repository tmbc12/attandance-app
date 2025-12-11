import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';

interface CustomDatePickerProps {
  visible: boolean;
  initialDate: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export default function CustomDatePicker({
  visible,
  initialDate,
  onClose,
  onConfirm,
  minimumDate = new Date(1950, 0, 1),
  maximumDate = new Date(),
}: CustomDatePickerProps) {
  const [year, setYear] = useState(2000);
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(1);

  const yearScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);

  const minYear = minimumDate.getFullYear();
  const maxYear = maximumDate.getFullYear();
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // Initialize picker values from initialDate when modal opens
  useEffect(() => {
    if (visible && initialDate) {
      const initialYear = initialDate.getFullYear();
      const initialMonth = initialDate.getMonth();
      const initialDay = initialDate.getDate();

      setYear(initialYear);
      setMonth(initialMonth);
      setDay(initialDay);

      // Scroll to correct positions
      setTimeout(() => {
        const yearIndex = initialYear - minYear;
        yearScrollRef.current?.scrollTo({
          y: yearIndex * 50,
          animated: false,
        });
        monthScrollRef.current?.scrollTo({
          y: initialMonth * 50,
          animated: false,
        });
        dayScrollRef.current?.scrollTo({
          y: (initialDay - 1) * 50,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialDate, minYear]);

  // Adjust day when month or year changes
  useEffect(() => {
    const daysInMonth = getDaysInMonth(year, month);
    if (day > daysInMonth) {
      setDay(daysInMonth);
      dayScrollRef.current?.scrollTo({
        y: (daysInMonth - 1) * 50,
        animated: true,
      });
    }
  }, [year, month, day]);

  const getDate = (): Date => {
    return new Date(year, month, day);
  };

  const handleConfirm = () => {
    const selectedDate = getDate();
    
    // Validate date is within range
    if (selectedDate < minimumDate) {
      return;
    }
    if (selectedDate > maximumDate) {
      return;
    }

    onConfirm(selectedDate);
    onClose();
  };

  const daysInCurrentMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.datePickerModalOverlay}>
        <View style={styles.datePickerModalContent}>
          <View style={styles.datePickerHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.datePickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.datePickerTitle}>Select Date</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.datePickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.datePickerContainer}>
            <View style={styles.customDatePicker}>
              {/* Month */}
              <View style={styles.pickerColumn}>
                <View style={styles.pickerSelectionIndicator} />
                <ScrollView
                  ref={monthScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={50}
                  decelerationRate="fast"
                  contentContainerStyle={styles.pickerScrollContent}
                  onScroll={(e) => {
                    const offset = e.nativeEvent.contentOffset.y;
                    const index = Math.round(offset / 50);
                    if (index >= 0 && index < 12 && month !== index) {
                      setMonth(index);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  {MONTHS.map((monthName, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.pickerItem}
                      onPress={() => {
                        setMonth(index);
                        monthScrollRef.current?.scrollTo({
                          y: index * 50,
                          animated: true,
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          month === index && styles.pickerItemTextSelected,
                        ]}
                      >
                        {monthName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day */}
              <View style={styles.pickerColumn}>
                <View style={styles.pickerSelectionIndicator} />
                <ScrollView
                  ref={dayScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={50}
                  decelerationRate="fast"
                  contentContainerStyle={styles.pickerScrollContent}
                  onScroll={(e) => {
                    const offset = e.nativeEvent.contentOffset.y;
                    const index = Math.round(offset / 50);
                    if (index >= 0 && index < daysInCurrentMonth && day !== index + 1) {
                      setDay(index + 1);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  {days.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={styles.pickerItem}
                      onPress={() => {
                        setDay(d);
                        dayScrollRef.current?.scrollTo({
                          y: (d - 1) * 50,
                          animated: true,
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          day === d && styles.pickerItemTextSelected,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year */}
              <View style={styles.pickerColumn}>
                <View style={styles.pickerSelectionIndicator} />
                <ScrollView
                  ref={yearScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={50}
                  decelerationRate="fast"
                  contentContainerStyle={styles.pickerScrollContent}
                  onScroll={(e) => {
                    const offset = e.nativeEvent.contentOffset.y;
                    const index = Math.round(offset / 50);
                    if (index >= 0 && index < years.length && year !== years[index]) {
                      setYear(years[index]);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  {years.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={styles.pickerItem}
                      onPress={() => {
                        setYear(y);
                        const yearIndex = y - minYear;
                        yearScrollRef.current?.scrollTo({
                          y: yearIndex * 50,
                          animated: true,
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          year === y && styles.pickerItemTextSelected,
                        ]}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  datePickerCancel: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  datePickerTitle: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  datePickerDone: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#3B82F6',
  },
  datePickerContainer: {
    backgroundColor: '#1F1F1F',
    paddingVertical: 20,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customDatePicker: {
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
    width: '100%',
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

