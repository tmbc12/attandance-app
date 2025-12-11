import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { registerForPushNotificationsAsync } from "@/src/utils/registerForPushNotificationsAsync";

type Subscription = {
  remove: () => void;
};

interface NotificationContextType {
  notification: Notifications.Notification | null;
  expoPushToken: string | null;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const router = useRouter();
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const notificationListener = useRef<Subscription | null>(null);
  const responseListener = useRef<Subscription | null>(null);

  useEffect(() => {
    console.log("NotificationProvider mounted");
    registerForPushNotificationsAsync()
      .then((token) => setExpoPushToken(token))
      .catch((error) => setError(error));

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const notificationData = response.notification.request.content.data;
        // switch (notificationData.type) {
        //   case "Post":
        //     router.push(/(tabs));
        //     break;
        //   default:
        //     router.push(/(tabs)/notifications);
        //     break;
        // }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notification, error, expoPushToken }}
    >
      {children}
    </NotificationContext.Provider>
  );
};