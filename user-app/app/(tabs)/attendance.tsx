import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CalendarScreen from '../../src/screens/attendance/CalendarScreen';
import TimesheetScreen from '../../src/screens/attendance/TimesheetScreen';
import CorrectionHistoryScreen from '../../src/screens/attendance/CorrectionHistoryScreen';

export default function AttendanceTabNavigator() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'weekly' | 'requests'>('calendar');

  const renderScreen = () => {
    switch (activeTab) {
      case 'calendar':
        return <CalendarScreen />;
      case 'weekly':
        return <TimesheetScreen />;
      case 'requests':
        return <CorrectionHistoryScreen />;
      default:
        return <CalendarScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header - extends to top with gradient background */}
      <LinearGradient
        colors={['#F97316', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <Text style={styles.title}>My Work Record</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'calendar' && styles.activeTab]}
              onPress={() => setActiveTab('calendar')}
            >
              {activeTab === 'calendar' ? (
                <LinearGradient
                  colors={['#EF4444', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabGradient}
                >
                  <Text style={styles.activeTabText}>Calender</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText}>Calender</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'weekly' && styles.activeTab]}
              onPress={() => setActiveTab('weekly')}
            >
              {activeTab === 'weekly' ? (
                <LinearGradient
                  colors={['#EF4444', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabGradient}
                >
                  <Text style={styles.activeTabText} numberOfLines={1}>Weekly View</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText} numberOfLines={1}>Weekly View</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
              onPress={() => setActiveTab('requests')}
            >
              {activeTab === 'requests' ? (
                <LinearGradient
                  colors={['#EF4444', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabGradient}
                >
                  <Text style={styles.activeTabText}>Requests</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText}>Requests</Text>
              )}
            </TouchableOpacity>
      </View>

      {/* Screen Content */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>
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
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    // marginBottom: 16,
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
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  screenContainer: {
    flex: 1,
  },
});

