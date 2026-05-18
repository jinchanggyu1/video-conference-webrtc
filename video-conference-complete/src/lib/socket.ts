// ====================================
// Socket.io Utility
// ====================================

import { io, Socket } from "socket.io-client";
import { SOCKET_CONFIG } from "./constants";
import { logger } from "./logger";

let socketInstance: Socket | null = null;

export const createSocketInstance = (): Socket => {
  if (socketInstance) {
    return socketInstance;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

  socketInstance = io(socketUrl, {
    ...SOCKET_CONFIG,
    extraHeaders: {
      "x-client-type": "web",
      "x-client-version": "1.0.0",
    },
  });

  socketInstance.on("connect", () => {
    logger.info("Socket connected", { socketId: socketInstance?.id }, "Socket");
  });

  socketInstance.on("disconnect", (reason) => {
    logger.warn("Socket disconnected", { reason }, "Socket");
  });

  socketInstance.on("error", (error) => {
    logger.error("Socket error", error, "Socket");
  });

  return socketInstance;
};

export const getSocketInstance = (): Socket | null => {
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export const isSocketConnected = (): boolean => {
  return socketInstance?.connected ?? false;
};

export const waitForSocketConnection = (timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!socketInstance) {
      reject(new Error("Socket not initialized"));
      return;
    }

    if (socketInstance.connected) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error("Socket connection timeout"));
    }, timeout);

    socketInstance.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
  });
};
