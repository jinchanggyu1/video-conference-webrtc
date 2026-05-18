// ====================================
// Hook: Local Media Management
// ====================================

import { useState, useEffect, useCallback } from "react";
import { getLocalMedia, toggleAudio, toggleVideo, getMediaDevices } from "@/lib/webrtc";
import { logger } from "@/lib/logger";
import { LocalMediaState } from "@/lib/types";

const initialState: LocalMediaState = {
  stream: null,
  audioEnabled: true,
  videoEnabled: true,
  audioDevices: [],
  videoDevices: [],
  selectedAudioDevice: null,
  selectedVideoDevice: null,
};

export const useLocalMedia = () => {
  const [state, setState] = useState<LocalMediaState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize media stream
  useEffect(() => {
    const initializeMedia = async () => {
      setIsLoading(true);
      try {
        const stream = await getLocalMedia();
        setState((prev) => ({ ...prev, stream }));

        // Get available devices
        const { audioDevices, videoDevices } = await getMediaDevices();
        setState((prev) => ({
          ...prev,
          audioDevices,
          videoDevices,
          selectedAudioDevice: audioDevices[0]?.deviceId ?? null,
          selectedVideoDevice: videoDevices[0]?.deviceId ?? null,
        }));

        logger.info("Local media initialized successfully", undefined, "useLocalMedia");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to initialize media";
        setError(errorMessage);
        logger.error("Failed to initialize local media", err, "useLocalMedia");
      } finally {
        setIsLoading(false);
      }
    };

    initializeMedia();

    // Cleanup
    return () => {
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleMute = useCallback(() => {
    if (state.stream) {
      toggleAudio(state.stream, !state.audioEnabled);
      setState((prev) => ({ ...prev, audioEnabled: !prev.audioEnabled }));
      logger.info(
        `Audio ${!state.audioEnabled ? "enabled" : "disabled"}`,
        undefined,
        "useLocalMedia"
      );
    }
  }, [state.stream, state.audioEnabled]);

  const toggleVideoMode = useCallback(() => {
    if (state.stream) {
      toggleVideo(state.stream, !state.videoEnabled);
      setState((prev) => ({ ...prev, videoEnabled: !prev.videoEnabled }));
      logger.info(
        `Video ${!state.videoEnabled ? "enabled" : "disabled"}`,
        undefined,
        "useLocalMedia"
      );
    }
  }, [state.stream, state.videoEnabled]);

  const switchAudioDevice = useCallback(async (deviceId: string) => {
    try {
      const constraints = {
        audio: { deviceId: { exact: deviceId } },
        video: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const audioTrack = newStream.getAudioTracks()[0];

      if (state.stream && audioTrack) {
        const oldAudioTrack = state.stream.getAudioTracks()[0];

        // Replace audio track
        const sender = state.stream
          .getTracks()
          .find((t) => t.kind === "audio") as unknown as RTCRtpSender | undefined;

        if (sender) {
          await sender.replaceTrack(audioTrack);
          oldAudioTrack.stop();
          setState((prev) => ({ ...prev, selectedAudioDevice: deviceId }));
          logger.info(`Audio device switched to ${deviceId}`, undefined, "useLocalMedia");
        }
      }
    } catch (err) {
      logger.error("Failed to switch audio device", err, "useLocalMedia");
    }
  }, [state.stream]);

  const switchVideoDevice = useCallback(async (deviceId: string) => {
    try {
      const constraints = {
        video: { deviceId: { exact: deviceId } },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoTrack = newStream.getVideoTracks()[0];

      if (state.stream && videoTrack) {
        const oldVideoTrack = state.stream.getVideoTracks()[0];

        // Replace video track
        const sender = state.stream
          .getTracks()
          .find((t) => t.kind === "video") as unknown as RTCRtpSender | undefined;

        if (sender) {
          await sender.replaceTrack(videoTrack);
          oldVideoTrack.stop();
          setState((prev) => ({ ...prev, selectedVideoDevice: deviceId }));
          logger.info(`Video device switched to ${deviceId}`, undefined, "useLocalMedia");
        }
      }
    } catch (err) {
      logger.error("Failed to switch video device", err, "useLocalMedia");
    }
  }, [state.stream]);

  return {
    ...state,
    localStream: state.stream,
    isMuted: !state.audioEnabled,
    isVideoEnabled: state.videoEnabled,
    error,
    isLoading,
    toggleMute,
    toggleVideo: toggleVideoMode,
    switchAudioDevice,
    switchVideoDevice,
  };
};
