import sendPushNotification from "../utils/sendNotification.js";


export const sendNotification = async (req, res) => {
  try {
    const {token, title, body, data } = req.body;

    if ( !token) {
      return res.status(400).json({
        message: "token are required",
      });
    }
body
    await sendPushNotification(token,{title, body, data});

    return res.status(201).json({
      message: "Notification sent successfully",
    });

  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
