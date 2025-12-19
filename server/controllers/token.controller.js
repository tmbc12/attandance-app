// import ExpoToken from "../models/ExpoToken.js";
const {ExpoToken} = require("../models/ExpoToken.js");

const saveExpoToken = async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        message: "userId and token are required",
      });
    }

    // Check if user already has a token saved
    const existing = await ExpoToken.findOne({ userId });

    if (existing) {
      // Update the token
      existing.token = token;
      await existing.save();

      return res.status(200).json({
        message: "Token updated successfully",
        data: existing,
      });
    }

    // Create a new token entry
    const newToken = await ExpoToken.create({ userId, token });

    return res.status(201).json({
      message: "Token created successfully",
      data: newToken,
    });

  } catch (error) {
    console.error("Error saving expo token:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { saveExpoToken };