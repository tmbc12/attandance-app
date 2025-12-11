// usePushNotification.tsx
import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

export interface PushNotificationState {
  notification?: Notifications.Notification;
  expoPushToken?: string;
}

export const usePushNotification = (): PushNotificationState => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async (): Promise<Notifications.NotificationBehavior> => {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (mounted && token) setExpoPushToken(token);
      } catch (err) {
        console.warn("registerForPushNotificationsAsync error:", err);
      }
    })();

    notificationListener.current = Notifications.addNotificationReceivedListener((n) => {
      setNotification(n);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification response:", response);
    });

    return () => {
      mounted = false;
      try {
        notificationListener.current?.remove();
      } catch {}
      try {
        responseListener.current?.remove();
      } catch {}
      notificationListener.current = null;
      responseListener.current = null;
    };
  }, []);

  return { expoPushToken, notification };
};

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  try {
    if (!Device.isDevice) {
      console.warn("Must use physical device for Push Notifications");
      return undefined;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Push notification permission not granted");
      return undefined;
    }

    const extras = Constants.expoConfig?.extra as any | undefined;
    const easProjectId = extras?.eas?.projectId ?? undefined;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      easProjectId ? { projectId: easProjectId } : {}
    );

    const token = tokenResp?.data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token;
  } catch (error) {
    console.warn("Error while registering for push notifications:", error);
    return undefined;
  }
}

export default usePushNotification;
