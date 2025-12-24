import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: 'absolute',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            focused ? (
              <View style={styles.activeIconContainer}>
                <LinearGradient
                  colors={['#EF4444', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeIconGradient}
                >
                  <Ionicons name="home" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
            ) : (
              <Ionicons name="home-outline" size={24} color={color} />
            )
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size, focused }) => (
            focused ? (
              <View style={styles.activeIconContainer}>
                <LinearGradient
                  colors={['#EF4444', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeIconGradient}
                >
                  <Ionicons name="calendar" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
            ) : (
              <Ionicons name="calendar-outline" size={24} color={color} />
            )
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size, focused }) => (
            focused ? (
              <View style={styles.activeIconContainer}>
                <LinearGradient
                  colors={['#EF4444', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeIconGradient}
                >
                  <Ionicons name="people" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
            ) : (
              <Ionicons name="people-outline" size={24} color={color} />
            )
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size, focused }) => (
            focused ? (
              <View style={styles.activeIconContainer}>
                <LinearGradient
                  colors={['#EF4444', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeIconGradient}
                >
                  <Ionicons name="list" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
            ) : (
              <Ionicons name="list-outline" size={24} color={color} />
            )
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            focused ? (
              <View style={styles.activeIconContainer}>
                <LinearGradient
                  colors={['#EF4444', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeIconGradient}
                >
                  <Ionicons name="person" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
            ) : (
              <Ionicons name="person-outline" size={24} color={color} />
            )
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 40,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
