import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Redirect, useNavigation } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const navigation = useNavigation();
    const { expoPushToken, notification } = usePushNotifications();

  useEffect(() => {
    console.log('Expo Push Token:', expoPushToken);
    const screen = notification?.request?.content?.data?.screen;
    if (screen) {
      navigation.navigate(screen as never);
    }
  }, [notification]);

  return <Redirect href="/(auth)/login" />;
}
