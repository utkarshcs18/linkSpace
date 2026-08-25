const { Server } = require("socket.io");
const User = require("../models/user.js");
const { ENV } = require("./env.js");
const { socketAuthMiddleware } = require("../middleware/socketAuthMiddleware.js");

const userSocketMap = {};
let io = null;

function getReceiverSocketId(userId) {
  return userSocketMap[String(userId)];
}

function getOnlineUserIds() {
  return Object.keys(userSocketMap);
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ENV.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    userSocketMap[userId] = socket.id;

    await User.findByIdAndUpdate(userId, {
      status: "online",
      lastSeenAt: new Date(),
    });

    io.emit("getOnlineUsers", getOnlineUserIds());

    socket.on("disconnect", async () => {
      if (userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];
      }
      await User.findByIdAndUpdate(userId, {
        status: "offline",
        lastSeenAt: new Date(),
      });
      io.emit("getOnlineUsers", getOnlineUserIds());
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = {
  initSocket,
  getIO,
  getReceiverSocketId,
  getOnlineUserIds,
};
