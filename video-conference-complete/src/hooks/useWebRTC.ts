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
  const [joinError, setJoinError] = useState<string | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { emit, on, request, isConnected } = useSocket();

  // Initialize WebRTC connection
  useEffect(() => {
    if (!roomId || !localStream || !isConnected) return undefined;

    // Attach common handlers (ontrack/onicecandidate/state) to a new PC.
    const wireHandlers = (peerConnection: RTCPeerConnection, peerId: string) => {
      peerConnection.ontrack = (event) => {
        logger.info(
          `Received remote track from ${peerId} (kind=${event.track.kind})`,
          undefined,
          "useWebRTC"
        );
        setPeers((prev) => {
          const existing = prev.find((p) => p.peerId === peerId);
          if (existing) {
            return prev.map((p) =>
              p.peerId === peerId ? { ...p, stream: event.streams[0] } : p
            );
          }
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
        });
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          emit("ice-candidate", {
            to: peerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Attempt ICE restart if connection goes south.
      peerConnection.addEventListener("iceconnectionstatechange", () => {
        if (
          peerConnection.iceConnectionState === "failed" ||
          peerConnection.iceConnectionState === "disconnected"
        ) {
          logger.warn(
            `ICE ${peerConnection.iceConnectionState} for ${peerId} — attempting restart`,
            undefined,
            "useWebRTC"
          );
          try {
            peerConnection.restartIce();
          } catch (e) {
            logger.warn("restartIce failed", e, "useWebRTC");
          }
        }
      });
    };

    // Add local tracks in deterministic order (audio first, then video) so
    // both sides' m-lines line up regardless of getTracks() ordering quirks.
    const addLocalTracks = (peerConnection: RTCPeerConnection) => {
      const audioTracks = localStream.getAudioTracks();
      const videoTracks = localStream.getVideoTracks();
      audioTracks.forEach((t) => peerConnection.addTrack(t, localStream));
      videoTracks.forEach((t) => peerConnection.addTrack(t, localStream));
    };

    // Initiator: build PC, add tracks, create offer, send.
    const createOffererPC = async (peerId: string) => {
      try {
        const peerConnection = createPeerConnection();
        wireHandlers(peerConnection, peerId);
        addLocalTracks(peerConnection);
        peerConnectionsRef.current.set(peerId, peerConnection);

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        emit("offer", { to: peerId, offer });
        return peerConnection;
      } catch (error) {
        logger.error(`Failed to create offerer PC for ${peerId}`, error, "useWebRTC");
        return undefined;
      }
    };

    // Answerer: build PC, setRemoteDescription FIRST (so browser creates
    // remote transceivers), THEN add local tracks (matched into existing
    // transceivers), then createAnswer. This is the correct unified-plan
    // ordering — doing addTrack first can leave senders orphaned and
    // ontrack never fires.
    const handleOffer = async (data: { from: string; offer: any }) => {
      try {
        let peerConnection = peerConnectionsRef.current.get(data.from);
        if (!peerConnection) {
          peerConnection = createPeerConnection();
          wireHandlers(peerConnection, data.from);
          peerConnectionsRef.current.set(data.from, peerConnection);
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        addLocalTracks(peerConnection);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        emit("answer", { to: data.from, answer });
      } catch (error) {
        logger.error(`Failed to handle offer from ${data.from}`, error, "useWebRTC");
      }
    };

    const handleUserJoined = async (data: { userId: string }) => {
      logger.info(`User joined: ${data.userId}`, undefined, "useWebRTC");
      await createOffererPC(data.userId);
    };

    const handleAnswer = async (data: { from: string; answer: any }) => {
      const peerConnection = peerConnectionsRef.current.get(data.from);
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        } catch (e) {
          logger.error(`setRemoteDescription(answer) failed for ${data.from}`, e, "useWebRTC");
        }
      }
    };

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

    // Register listeners and capture cleanups (prevents accumulation on
    // effect re-runs — without this, every reconnect/dep change layered
    // another handler on the same singleton socket).
    const cleanups = [
      on("user-joined", handleUserJoined),
      on("offer", handleOffer),
      on("answer", handleAnswer),
      on("ice-candidate", handleIceCandidate),
      on("user-left", handleUserLeft),
    ];

    // Join room with ack — surfaces "room not found" etc to UI
    setJoinError(null);
    request<{ success?: boolean; error?: string; code?: string }>(
      "join-room",
      roomId
    )
      .then((res) => {
        if (res.error) {
          logger.error(`join-room failed: ${res.error}`, res, "useWebRTC");
          setJoinError(res.error);
        }
      })
      .catch((err) => {
        logger.error("join-room request failed", err, "useWebRTC");
        setJoinError(err instanceof Error ? err.message : "방 입장 실패");
      });

    return () => {
      cleanups.forEach((c) => c?.());
      peerConnectionsRef.current.forEach((pc) => closePeerConnection(pc));
      peerConnectionsRef.current.clear();
    };
  }, [roomId, localStream, isConnected, emit, on, request]);

  // Replace the outgoing video track on all peer connections.
  // Used for screen sharing — swaps camera track for screen track (or back).
  const replaceVideoTrack = useCallback(async (newTrack: MediaStreamTrack | null) => {
    const pcs = Array.from(peerConnectionsRef.current.values());
    await Promise.all(
      pcs.map(async (pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          try {
            await sender.replaceTrack(newTrack);
          } catch (err) {
            logger.warn("replaceTrack failed", err, "useWebRTC");
          }
        }
      })
    );
  }, []);

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
    joinError,
    getStats,
    replaceVideoTrack,
    peerConnectionsRef,
  };
};
