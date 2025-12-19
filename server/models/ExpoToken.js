// import mongoose from "mongoose";
const mongoose = require("mongoose");

const expoTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "expo-token", // optional — ensures collection name
  }
);

module.exports = mongoose.model("ExpoToken", expoTokenSchema);
