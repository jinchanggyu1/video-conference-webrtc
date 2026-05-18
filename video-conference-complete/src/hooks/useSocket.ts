// ====================================
// Hook: Socket.io Connection
// ====================================

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { createSocketInstance, disconnectSocket } from "@/lib/socket";
import { logger } from "@/lib/logger";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      socketRef.current = createSocketInstance();

      socketRef.current.on("connect", () => {
        setIsConnected(true);
        setError(null);
        logger.info("Socket connected", { socketId: socketRef.current?.id }, "useSocket");
      });

      socketRef.current.on("disconnect", () => {
        setIsConnected(false);
        logger.warn("Socket disconnected", undefined, "useSocket");
      });

      socketRef.current.on("error", (err) => {
        const errorMessage = typeof err === "string" ? err : JSON.stringify(err);
        setError(errorMessage);
        logger.error("Socket error", err, "useSocket");
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Socket initialization failed";
      setError(errorMessage);
      logger.error("Failed to initialize socket", err, "useSocket");
    }

    return () => {
      // Don't disconnect on unmount, socket should persist
    };
  }, []);

  const emit = useCallback(
    (event: string, data?: any) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data);
        logger.debug(`Socket event emitted: ${event}`, data, "useSocket");
      } else {
        logger.warn(`Socket not connected, cannot emit: ${event}`, undefined, "useSocket");
      }
    },
    []
  );

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => {
        socketRef.current?.off(event, callback);
      };
    }
    return undefined;
  }, []);

  const once = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.once(event, callback);
    }
  }, []);

  // Promise-based request/response using socket.io ack callbacks.
  // Server-side handler must accept (data, ack) and call ack(response).
  const request = useCallback(
    <T = any>(event: string, data?: any, timeoutMs = 5000): Promise<T> => {
      return new Promise((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          reject(new Error("Socket not connected"));
          return;
        }
        const timer = setTimeout(
          () => reject(new Error(`Request timeout: ${event}`)),
          timeoutMs
        );
        socket.emit(event, data, (response: T) => {
          clearTimeout(timer);
          resolve(response);
        });
      });
    },
    []
  );

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
    on,
    once,
    request,
    disconnect: disconnectSocket,
  };
};
