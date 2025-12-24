const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.ADMIN_URL || "http://localhost:3000",
        process.env.USER_URL || "http://localhost:8081",
      ],
      credentials: true,
    },
  });

  // 🔐 Socket auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // attach user info
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    const userId = socket.user?.userId;
    if (userId) {
      socket.join(userId); // 🔥 personal room
      console.log(`User ${userId} joined socket room`);
    }

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

module.exports = { initSocket, getIO };
