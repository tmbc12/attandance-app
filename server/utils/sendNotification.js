const { Expo } = require("expo-server-sdk");

// Create a new Expo SDK client
const expo = new Expo();

async function sendPushNotification(pushToken, message) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Invalid Expo push token: ${pushToken}`);
    return;
  }

  const messages = [
    {
      to: pushToken,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data || {},
    },
  ];

  try {
    await expo.sendPushNotificationsAsync(messages);
  } catch (error) {
    console.error("Push notification error:", error);
  }
}

module.exports = sendPushNotification;