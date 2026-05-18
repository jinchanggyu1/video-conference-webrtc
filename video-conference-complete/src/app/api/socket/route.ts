// ====================================
// Socket.io API Server for Signaling
// ====================================

import { Server as SocketIOServer } from "socket.io";
import { NextRequest, NextResponse } from "next/server";

// Store active rooms
const rooms = new Map<string, Set<string>>();

// Store Socket.io server instance
let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server
 */
function initializeSocket(_response: NextResponse): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer({
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 1024 * 100, // 100KB
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Connection event
  io.on("connection", (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // ====================================
    // Room Management
    // ====================================

    socket.on("join-room", (roomId: string) => {
      if (!roomId || typeof roomId !== "string") {
        socket.emit("error", { message: "Invalid room ID" });
        return;
      }

      console.log(`[Socket] User ${socket.id} joining room: ${roomId}`);

      // Leave previous rooms
      const previousRooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      previousRooms.forEach((room) => {
        socket.leave(room);
        const roomUsers = rooms.get(room);
        if (roomUsers) {
          roomUsers.delete(socket.id);
          if (roomUsers.size === 0) {
            rooms.delete(room);
          } else {
            io?.to(room).emit("user-left", { userId: socket.id });
          }
        }
      });

      // Join new room
      socket.join(roomId);

      // Update room users
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      rooms.get(roomId)?.add(socket.id);

      // Notify existing users
      const roomUsers = Array.from(rooms.get(roomId) || []);
      io?.to(roomId).emit("user-joined", {
        userId: socket.id,
        timestamp: new Date(),
      });

      // Send room users list
      io?.to(roomId).emit("room-users", {
        users: roomUsers,
        count: roomUsers.length,
      });

      console.log(`[Socket] Room ${roomId} now has ${roomUsers.length} users`);
    });

    socket.on("leave-room", (roomId: string) => {
      console.log(`[Socket] User ${socket.id} leaving room: ${roomId}`);
      socket.leave(roomId);

      const roomUsers = rooms.get(roomId);
      if (roomUsers) {
        roomUsers.delete(socket.id);
        if (roomUsers.size === 0) {
          rooms.delete(roomId);
        } else {
          io?.to(roomId).emit("user-left", { userId: socket.id });
          io?.to(roomId).emit("room-users", {
            users: Array.from(roomUsers),
            count: roomUsers.size,
          });
        }
      }
    });

    // ====================================
    // WebRTC Signaling
    // ====================================

    socket.on("offer", (data: { to: string; offer: any }) => {
      if (!data.to || !data.offer) {
        console.warn(`[Socket] Invalid offer from ${socket.id}`);
        return;
      }

      console.log(`[Socket] Offer from ${socket.id} to ${data.to}`);
      io?.to(data.to).emit("offer", {
        from: socket.id,
        offer: data.offer,
      });
    });

    socket.on("answer", (data: { to: string; answer: any }) => {
      if (!data.to || !data.answer) {
        console.warn(`[Socket] Invalid answer from ${socket.id}`);
        return;
      }

      console.log(`[Socket] Answer from ${socket.id} to ${data.to}`);
      io?.to(data.to).emit("answer", {
        from: socket.id,
        answer: data.answer,
      });
    });

    socket.on("ice-candidate", (data: { to: string; candidate: any }) => {
      if (!data.to || !data.candidate) {
        console.warn(`[Socket] Invalid ICE candidate from ${socket.id}`);
        return;
      }

      io?.to(data.to).emit("ice-candidate", {
        from: socket.id,
        candidate: data.candidate,
      });
    });

    // ====================================
    // Media Control Events
    // ====================================

    socket.on("user-muted", (data: { roomId: string }) => {
      if (data.roomId) {
        io?.to(data.roomId).emit("user-muted", { userId: socket.id });
      }
    });

    socket.on("user-unmuted", (data: { roomId: string }) => {
      if (data.roomId) {
        io?.to(data.roomId).emit("user-unmuted", { userId: socket.id });
      }
    });

    socket.on("user-video-off", (data: { roomId: string }) => {
      if (data.roomId) {
        io?.to(data.roomId).emit("user-video-off", { userId: socket.id });
      }
    });

    socket.on("user-video-on", (data: { roomId: string }) => {
      if (data.roomId) {
        io?.to(data.roomId).emit("user-video-on", { userId: socket.id });
      }
    });

    // ====================================
    // Screen Share Events
    // ====================================

    socket.on("screen-share-start", (data: { userId: string; roomId?: string }) => {
      if (data.roomId) {
        io?.to(data.roomId).emit("screen-share-start", { userId: socket.id });
      }
    });

    socket.on("screen-share-stop", (data: { userId: string; roomId?: string }) => {
      if (data.roomId) {
        io?.to(data.roomId).emit("screen-share-stop", { userId: socket.id });
      }
    });

    // ====================================
    // Chat Events
    // ====================================

    socket.on("chat-message", (data: { roomId: string; message: any }) => {
      if (data.roomId && data.message) {
        const message = {
          ...data.message,
          senderId: socket.id,
          timestamp: new Date(),
        };

        io?.to(data.roomId).emit("chat-message", message);
        console.log(
          `[Socket] Chat message in room ${data.roomId} from ${socket.id}`
        );
      }
    });

    socket.on("request-chat-history", (data: { roomId: string }) => {
      if (data.roomId) {
        // In production, fetch from database
        io?.to(socket.id).emit("chat-history", []);
      }
    });

    // ====================================
    // Statistics Events
    // ====================================

    socket.on(
      "connection-stats",
      (data: { roomId: string; stats: any }) => {
        if (data.roomId && data.stats) {
          io?.to(data.roomId).emit("connection-stats", {
            userId: socket.id,
            stats: data.stats,
          });
        }
      }
    );

    // ====================================
    // Disconnect Event
    // ====================================

    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);

      // Remove from all rooms
      Array.from(socket.rooms).forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);

          const roomUsers = rooms.get(room);
          if (roomUsers) {
            roomUsers.delete(socket.id);

            if (roomUsers.size === 0) {
              rooms.delete(room);
            } else {
              io?.to(room).emit("user-left", { userId: socket.id });
              io?.to(room).emit("room-users", {
                users: Array.from(roomUsers),
                count: roomUsers.size,
              });
            }
          }
        }
      });
    });

    // ====================================
    // Error Handling
    // ====================================

    socket.on("error", (error) => {
      console.error(`[Socket] Error from ${socket.id}:`, error);
    });
  });

  return io;
}

/**
 * GET handler (optional health check)
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    status: "Socket.io server is running",
    timestamp: new Date(),
  });
}

/**
 * POST handler (main Socket.io handler)
 */
export async function POST(_request: NextRequest) {
  // Initialize Socket.io server
  const response = NextResponse.json({ ok: true });
  initializeSocket(response);

  // Handle Socket.io upgrade
  return response;
}

/**
 * WebSocket upgrade handler
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100kb",
    },
  },
};
