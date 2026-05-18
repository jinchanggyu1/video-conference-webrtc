// ====================================
// Hook: WebRTC P2P Connection
// ====================================

import { useState, useRef, useEffect, useCallback } from "react";
import { createPeerConnection, closePeerConnection, getConnectionStats } from "@/lib/webrtc";
import { logger } from "@/lib/logger";
import { Peer, ConnectionStats } from "@/lib/types";
import { useSocket } from "./useSocket";

interface UseWebRTCProps {
  roomId: string | null;
  localStream: MediaStream | null;
}

export const useWebRTC = ({ roomId, localStream }: UseWebRTCProps) => {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [stats, setStats] = useState<Map<string, ConnectionStats>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { emit, on, isConnected } = useSocket();

  // Initialize WebRTC connection
  useEffect(() => {
    if (!roomId || !localStream || !isConnected) return undefined;

    const createPeerConn = async (peerId: string, isInitiator: boolean = false) => {
      try {
        const peerConnection = createPeerConnection();

        // Add local tracks to peer connection
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          logger.info(`Received remote track from ${peerId}`, undefined, "useWebRTC");

          setPeers((prev) => {
            const existing = prev.find((p) => p.peerId === peerId);
            if (existing) {
              return prev.map((p) =>
                p.peerId === peerId ? { ...p, stream: event.streams[0] } : p
              );
            } else {
              return [
                ...prev,
                {
                  peerId,
                  connection: peerConnection,
                  stream: event.streams[0],
                  audioEnabled: true,
                  videoEnabled: true,
                  createdAt: new Date(),
                },
              ];
            }
          });
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            emit("ice-candidate", {
              to: peerId,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        peerConnectionsRef.current.set(peerId, peerConnection);

        // Create and send offer if initiator
        if (isInitiator) {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          emit("offer", { to: peerId, offer });
        }

        return peerConnection;
      } catch (error) {
        logger.error(`Failed to create peer connection for ${peerId}`, error, "useWebRTC");
        return undefined;
      }
    };

    // Handle user joined
    const handleUserJoined = async (data: { userId: string }) => {
      logger.info(`User joined: ${data.userId}`, undefined, "useWebRTC");
      await createPeerConn(data.userId, true);
    };

    // Handle offer
    const handleOffer = async (data: { from: string; offer: any }) => {
      const peerConnection =
        peerConnectionsRef.current.get(data.from) ||
        (await createPeerConn(data.from, false));

      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        emit("answer", { to: data.from, answer });
      }
    };

    // Handle answer
    const handleAnswer = async (data: { from: string; answer: any }) => {
      const peerConnection = peerConnectionsRef.current.get(data.from);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    };

    // Handle ICE candidate
    const handleIceCandidate = async (data: { from: string; candidate: any }) => {
      const peerConnection = peerConnectionsRef.current.get(data.from);
      if (peerConnection && data.candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          logger.warn(`Failed to add ICE candidate from ${data.from}`, error, "useWebRTC");
        }
      }
    };

    // Handle user left
    const handleUserLeft = (data: { userId: string }) => {
      logger.info(`User left: ${data.userId}`, undefined, "useWebRTC");
      const peerConnection = peerConnectionsRef.current.get(data.userId);
      if (peerConnection) {
        closePeerConnection(peerConnection);
        peerConnectionsRef.current.delete(data.userId);
      }

      setPeers((prev) => prev.filter((p) => p.peerId !== data.userId));
      setStats((prev) => {
        const newStats = new Map(prev);
        newStats.delete(data.userId);
        return newStats;
      });
    };

    // Register event listeners
    on("user-joined", handleUserJoined);
    on("offer", handleOffer);
    on("answer", handleAnswer);
    on("ice-candidate", handleIceCandidate);
    on("user-left", handleUserLeft);

    // Join room
    emit("join-room", roomId);

    // Cleanup
    return () => {
      peerConnectionsRef.current.forEach((pc) => closePeerConnection(pc));
      peerConnectionsRef.current.clear();
    };
  }, [roomId, localStream, isConnected, emit, on]);

  // Get connection stats
  const getStats = useCallback(async (peerId: string) => {
    const peerConnection = peerConnectionsRef.current.get(peerId);
    if (peerConnection) {
      try {
        const peerStats = await getConnectionStats(peerConnection);
        setStats((prev) => new Map(prev).set(peerId, peerStats));
        return peerStats;
      } catch (error) {
        logger.error(`Failed to get stats for ${peerId}`, error, "useWebRTC");
        return undefined;
      }
    }
    return undefined;
  }, []);

  // Monitor stats periodically
  useEffect(() => {
    if (peers.length === 0) return undefined;

    const interval = setInterval(() => {
      peers.forEach((peer) => {
        getStats(peer.peerId);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [peers, getStats]);

  return {
    peers,
    stats,
    getStats,
    peerConnectionsRef,
  };
};
