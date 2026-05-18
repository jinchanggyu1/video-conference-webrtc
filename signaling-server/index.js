// ====================================
// Socket.io Signaling Server for WebRTC
// ====================================

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server: SocketIOServer } = require("socket.io");

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));

app.get("/", (_req, res) => {
  res.json({
    status: "Signaling server running",
    rooms: rooms.size,
    timestamp: new Date().toISOString(),
  });
});

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(","),
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 1024 * 100,
  pingTimeout: 60000,
  pingInterval: 25000,
});

const rooms = new Map();
const userWeathers = new Map(); // socketId -> weather info

io.on("connection", (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  // ====================================
  // Room Management
  // ====================================

  socket.on("join-room", (roomId, ack) => {
    const respond = (res) => {
      if (typeof ack === "function") ack(res);
    };

    if (!roomId || typeof roomId !== "string") {
      socket.emit("error", { message: "Invalid room ID" });
      return respond({ error: "Invalid room ID", code: "INVALID_ID" });
    }

    // Strict mode: room must already exist (created via create-room).
    // Prevents accidental ghost rooms from typos or direct URL access.
    if (!rooms.has(roomId)) {
      console.log(`[Socket] ${socket.id} tried to join non-existent room: ${roomId}`);
      socket.emit("error", { message: "Room not found" });
      return respond({ error: "Room not found", code: "ROOM_NOT_FOUND" });
    }

    console.log(`[Socket] ${socket.id} joining room: ${roomId}`);

    // Leave previous rooms (except own id room)
    Array.from(socket.rooms)
      .filter((r) => r !== socket.id)
      .forEach((room) => {
        socket.leave(room);
        const users = rooms.get(room);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) rooms.delete(room);
          else socket.to(room).emit("user-left", { userId: socket.id });
        }
      });

    socket.join(roomId);

    // Send list of existing users to the joiner (before adding themselves)
    const existing = Array.from(rooms.get(roomId));
    socket.emit("room-users", { users: existing, count: existing.length });

    rooms.get(roomId).add(socket.id);

    // Send existing users' cached weather to the new joiner
    existing.forEach((peerId) => {
      const peerWeather = userWeathers.get(peerId);
      if (peerWeather) {
        socket.emit("weather", { userId: peerId, weather: peerWeather });
      }
    });

    // Notify existing users about new joiner (excludes joiner via socket.to)
    socket.to(roomId).emit("user-joined", {
      userId: socket.id,
      timestamp: new Date(),
    });

    console.log(
      `[Socket] Room ${roomId} now has ${rooms.get(roomId).size} users`
    );
    respond({ success: true, roomId, userCount: rooms.get(roomId).size });
  });

  // ====================================
  // Room Lifecycle (Create / Check)
  // ====================================

  socket.on("create-room", (data, ack) => {
    const respond = (res) => {
      if (typeof ack === "function") ack(res);
    };

    // If client passed a desired roomId, honor it (and reject if taken).
    // Otherwise generate a fresh one.
    let roomId = data && typeof data.roomId === "string" ? data.roomId.trim() : null;
    if (roomId) {
      if (roomId.length < 3) {
        return respond({ error: "Room ID too short", code: "INVALID_ID" });
      }
      if (rooms.has(roomId)) {
        return respond({ error: "Room already exists", code: "ROOM_EXISTS" });
      }
    } else {
      do {
        roomId = Math.random().toString(36).slice(2, 11);
      } while (rooms.has(roomId));
    }

    rooms.set(roomId, new Set());
    console.log(`[Socket] Room created: ${roomId} (by ${socket.id})`);

    // If no one joins this fresh room within 60s, clean it up to prevent leaks.
    setTimeout(() => {
      const r = rooms.get(roomId);
      if (r && r.size === 0) {
        rooms.delete(roomId);
        console.log(`[Socket] Empty room ${roomId} cleaned up (timeout)`);
      }
    }, 60 * 1000);

    respond({ success: true, roomId });
  });

  socket.on("check-room", (data, ack) => {
    const respond = (res) => {
      if (typeof ack === "function") ack(res);
    };
    const roomId =
      typeof data === "string" ? data : data && typeof data.roomId === "string" ? data.roomId : null;
    if (!roomId) return respond({ exists: false });
    const exists = rooms.has(roomId);
    respond({
      exists,
      userCount: exists ? rooms.get(roomId).size : 0,
    });
  });

  socket.on("leave-room", (roomId) => {
    console.log(`[Socket] ${socket.id} leaving room: ${roomId}`);
    socket.leave(roomId);
    const users = rooms.get(roomId);
    if (users) {
      users.delete(socket.id);
      if (users.size === 0) rooms.delete(roomId);
      else socket.to(roomId).emit("user-left", { userId: socket.id });
    }
  });

  // ====================================
  // WebRTC Signaling (1:1 forwarding)
  // ====================================

  socket.on("offer", (data) => {
    if (!data || !data.to || !data.offer) return;
    io.to(data.to).emit("offer", { from: socket.id, offer: data.offer });
  });

  socket.on("answer", (data) => {
    if (!data || !data.to || !data.answer) return;
    io.to(data.to).emit("answer", { from: socket.id, answer: data.answer });
  });

  socket.on("ice-candidate", (data) => {
    if (!data || !data.to || !data.candidate) return;
    io.to(data.to).emit("ice-candidate", {
      from: socket.id,
      candidate: data.candidate,
    });
  });

  // ====================================
  // Media Control / Screen Share / Chat (room broadcast, excludes sender)
  // ====================================

  const roomBroadcast = (event) => (data) => {
    if (data && data.roomId) {
      socket.to(data.roomId).emit(event, { userId: socket.id });
    }
  };

  socket.on("user-muted", roomBroadcast("user-muted"));
  socket.on("user-unmuted", roomBroadcast("user-unmuted"));
  socket.on("user-video-off", roomBroadcast("user-video-off"));
  socket.on("user-video-on", roomBroadcast("user-video-on"));
  socket.on("screen-share-start", roomBroadcast("screen-share-start"));
  socket.on("screen-share-stop", roomBroadcast("screen-share-stop"));

  socket.on("chat-message", (data) => {
    if (data && data.roomId && data.message) {
      // io.to broadcasts to all in room INCLUDING sender — sender uses this
      // roundtrip as the canonical "message saved" signal and identifies
      // own messages by senderId === own socket.id.
      io.to(data.roomId).emit("chat-message", {
        ...data.message,
        senderId: socket.id,
        timestamp: new Date(),
      });
    }
  });

  // ====================================
  // Weather Broadcast
  // ====================================

  socket.on("weather", (data) => {
    if (!data || !data.roomId || !data.weather) return;
    userWeathers.set(socket.id, data.weather);
    socket.to(data.roomId).emit("weather", {
      userId: socket.id,
      weather: data.weather,
    });
  });

  // ====================================
  // Disconnect
  // ====================================

  socket.on("disconnect", () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
    userWeathers.delete(socket.id);
    Array.from(socket.rooms)
      .filter((r) => r !== socket.id)
      .forEach((room) => {
        const users = rooms.get(room);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) rooms.delete(room);
          else socket.to(room).emit("user-left", { userId: socket.id });
        }
      });
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});
