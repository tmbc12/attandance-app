import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);

  useEffect(() => {
    // Register token
    Notifications.getExpoPushTokenAsync().then((token) => {
      console.log("Push Notification Token:", token.data);
      setExpoPushToken(token.data);
    });

    // LISTENER: app is foreground
    const receivedSubscription =
      Notifications.addNotificationReceivedListener((notif) => {
        setNotification(notif);
      });

    // LISTENER: user taps notification
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        setNotification(response.notification);
      });

    // CLEANUP
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return { expoPushToken, notification };
}
