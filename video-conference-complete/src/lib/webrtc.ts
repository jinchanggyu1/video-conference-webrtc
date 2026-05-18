// ====================================
// WebRTC Utility Functions
// ====================================

import { WEBRTC_CONFIG, VIDEO_CONSTRAINTS, AUDIO_CONSTRAINTS } from "./constants";
import { logger } from "./logger";
import { ConnectionStats } from "./types";

export const createPeerConnection = (): RTCPeerConnection => {
  const peerConnection = new RTCPeerConnection(WEBRTC_CONFIG as RTCConfiguration);

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    if (state === "failed") {
      logger.error(`Peer connection FAILED — likely NAT/TURN issue`, undefined, "WebRTC");
    } else {
      logger.info(`Peer connection state: ${state}`, undefined, "WebRTC");
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    logger.info(
      `ICE connection state: ${peerConnection.iceConnectionState}`,
      undefined,
      "WebRTC"
    );
  };

  // Log candidate types so we can see if TURN relay is being used.
  // candidate.type: "host" (local), "srflx" (STUN), "relay" (TURN), "prflx"
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      const c = event.candidate;
      logger.debug(
        `ICE candidate gathered: type=${c.type} protocol=${c.protocol} address=${c.address ?? "?"}`,
        undefined,
        "WebRTC"
      );
    }
  });

  return peerConnection;
};

export const getLocalMedia = async (): Promise<MediaStream> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: VIDEO_CONSTRAINTS,
    });

    logger.info("Local media stream acquired", undefined, "WebRTC");
    return stream;
  } catch (error) {
    logger.error("Failed to get local media", error, "WebRTC");
    throw error;
  }
};

export const getDisplayMedia = async (): Promise<MediaStream> => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" } as MediaTrackConstraints,
      audio: false,
    });

    logger.info("Display media stream acquired", undefined, "WebRTC");
    return stream;
  } catch (error) {
    logger.error("Failed to get display media", error, "WebRTC");
    throw error;
  }
};

export const stopMediaStream = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });

    logger.info("Media stream stopped", undefined, "WebRTC");
  }
};

export const closePeerConnection = (peerConnection: RTCPeerConnection | null) => {
  if (peerConnection) {
    peerConnection.close();
    logger.info("Peer connection closed", undefined, "WebRTC");
  }
};

export const getConnectionStats = async (
  peerConnection: RTCPeerConnection
): Promise<ConnectionStats> => {
  const stats = await peerConnection.getStats();
  let bandwidth = 0;
  let latency = 0;
  let packetLoss = 0;
  let videoResolution = { width: 0, height: 0 };
  let frameRate = 0;
  let audioLevel = 0;

  stats.forEach((report) => {
    if (report.type === "inbound-rtp" && report.mediaType === "video") {
      bandwidth = (report.bytesReceived * 8) / 1000000; // Mbps
    }

    if (report.type === "candidate-pair" && report.state === "succeeded") {
      latency = (report.currentRoundTripTime as number) * 1000;
    }

    if (report.type === "inbound-rtp" && report.mediaType === "video") {
      const packetsLost = report.packetsLost as number;
      const packetsReceived = report.packetsReceived as number;
      if (packetsReceived > 0) {
        packetLoss = (packetsLost / (packetsLost + packetsReceived)) * 100;
      }
      frameRate = report.framesPerSecond as number;
    }

    if (report.type === "inbound-rtp" && report.mediaType === "video") {
      videoResolution = {
        width: report.frameWidth as number,
        height: report.frameHeight as number,
      };
    }

    if (report.type === "inbound-rtp" && report.mediaType === "audio") {
      audioLevel = report.audioLevel as number;
    }
  });

  const connectionQuality: "excellent" | "good" | "poor" | "unknown" =
    latency < 50 && packetLoss < 1
      ? "excellent"
      : latency < 150 && packetLoss < 5
        ? "good"
        : latency < 300
          ? "poor"
          : "unknown";

  return {
    bandwidth,
    latency,
    packetLoss,
    connectionQuality,
    videoResolution,
    frameRate,
    audioLevel,
  };
};

export const toggleAudio = (stream: MediaStream | null, enabled: boolean) => {
  if (stream) {
    stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
};

export const toggleVideo = (stream: MediaStream | null, enabled: boolean) => {
  if (stream) {
    stream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
};

export const getMediaDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      audioDevices: devices.filter((d) => d.kind === "audioinput"),
      videoDevices: devices.filter((d) => d.kind === "videoinput"),
    };
  } catch (error) {
    logger.error("Failed to enumerate devices", error, "WebRTC");
    return { audioDevices: [], videoDevices: [] };
  }
};

export const isBrowserSupported = (): boolean => {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof RTCPeerConnection !== "undefined"
  );
};
