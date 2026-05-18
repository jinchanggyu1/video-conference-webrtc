"use client";

// ====================================
// Room Page - Video Conference
// ====================================

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ControlPanel } from "@/components/ControlPanel";
import { ParticipantCard } from "@/components/ParticipantCard";
import { RoomStats } from "@/components/RoomStats";
import { useLocalMedia } from "@/hooks/useLocalMedia";
import { useSocket } from "@/hooks/useSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useConferenceStore } from "@/hooks/useConferenceStore";
import { useLocationWeather, type WeatherInfo } from "@/hooks/useLocationWeather";
import { logger } from "@/lib/logger";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const { localStream, isMuted, isVideoEnabled, toggleMute, toggleVideo } =
    useLocalMedia();
  const { emit, on, isConnected } = useSocket();
  const { peers, stats, replaceVideoTrack } = useWebRTC({
    roomId: isConnected ? roomId : null,
    localStream,
  });
  const { weather: myWeather } = useLocationWeather();
  const [peerWeathers, setPeerWeathers] = useState<Map<string, WeatherInfo>>(
    new Map()
  );

  const {
    userId,
    setConnected,
    startCall,
    endCall,
    toggleSidebar,
    sidebarOpen,
    showStats,
    toggleStats,
  } = useConferenceStore();

  const [error, setError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  // Broadcast our weather once we have it and are in a room
  useEffect(() => {
    if (myWeather && isConnected && roomId) {
      emit("weather", { roomId, weather: myWeather });
    }
  }, [myWeather, isConnected, roomId, emit]);

  // Receive others' weather updates
  useEffect(() => {
    if (!isConnected) return undefined;
    const cleanup = on("weather", (data: { userId: string; weather: WeatherInfo }) => {
      if (!data?.userId || !data?.weather) return;
      setPeerWeathers((prev) => new Map(prev).set(data.userId, data.weather));
    });
    return cleanup;
  }, [isConnected, on]);

  // Initialize call
  useEffect(() => {
    if (isConnected && !callStartTimeRef.current) {
      callStartTimeRef.current = new Date();
      startCall();
      setConnected(true);
      logger.info(`Call started in room: ${roomId}`, undefined, "RoomPage");
    }

    // Update duration every second
    if (callStartTimeRef.current && !durationIntervalRef.current) {
      durationIntervalRef.current = setInterval(() => {
        // Update duration logic handled by Zustand store
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [isConnected, roomId, startCall, setConnected]);

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (cameraTrackRef.current) {
      await replaceVideoTrack(cameraTrackRef.current);
      cameraTrackRef.current = null;
    }
    setDisplayStream(null);
    setIsScreenSharing(false);
    emit("screen-share-stop", { roomId, userId });
    logger.info("Screen share stopped", undefined, "RoomPage");
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) throw new Error("No video track in display stream");

      // Save current camera track so we can restore later
      cameraTrackRef.current = localStream?.getVideoTracks()[0] ?? null;
      screenStreamRef.current = screenStream;

      // Swap out the outgoing video on every peer connection
      await replaceVideoTrack(screenTrack);

      // Update local preview
      setDisplayStream(screenStream);
      setIsScreenSharing(true);
      emit("screen-share-start", { roomId, userId });
      logger.info("Screen share started", undefined, "RoomPage");

      // Handle the user clicking the browser's "Stop sharing" UI
      screenTrack.onended = () => {
        void stopScreenShare();
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        logger.info("Screen share cancelled by user", undefined, "RoomPage");
      } else {
        logger.error("Screen share failed", err, "RoomPage");
        setError("화면 공유에 실패했습니다.");
      }
    }
  };

  const handleEndCall = () => {
    logger.info("User ended call", undefined, "RoomPage");
    endCall();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-dark p-4">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">
              🎬 {roomId}
            </h1>
            <p className="text-gray-400 text-sm">
              {peers.length + 1}명 참여 중
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex gap-2">
            <button
              onClick={toggleStats}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-all"
              title="통계 토글"
            >
              {showStats ? "📊 숨기기" : "📊 보이기"}
            </button>
            <button
              onClick={toggleSidebar}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-all"
              title="사이드바 토글"
            >
              {sidebarOpen ? "👤 숨기기" : "👤 보이기"}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-600/50 rounded p-4 text-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Video Grid */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-96">
              {/* Local Video */}
              <ParticipantCard
                userId={userId}
                userName="You"
                stream={displayStream ?? localStream}
                isLocal
                isMuted={isMuted}
                isVideoOff={!isVideoEnabled && !isScreenSharing}
                isScreenSharing={isScreenSharing}
                connectionQuality="excellent"
                weather={myWeather}
              />

              {/* Remote Videos */}
              {peers.map((peer) => (
                <ParticipantCard
                  key={peer.peerId}
                  userId={peer.peerId}
                  userName={peer.peerId.slice(0, 8)}
                  stream={peer.stream}
                  isMuted={!peer.audioEnabled}
                  isVideoOff={!peer.videoEnabled}
                  connectionQuality={
                    stats.get(peer.peerId)?.connectionQuality || "unknown"
                  }
                  weather={peerWeathers.get(peer.peerId)}
                />
              ))}

              {/* Empty Slots */}
              {peers.length === 0 && (
                <div className="col-span-full flex items-center justify-center min-h-96 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div className="text-center">
                    <p className="text-gray-400 text-lg">
                      대기 중... 👥
                    </p>
                    <p className="text-gray-500 text-sm">
                      다른 사용자를 기다리는 중입니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-6 flex justify-center">
              <ControlPanel
                isMuted={isMuted}
                isVideoEnabled={isVideoEnabled}
                isScreenSharing={isScreenSharing}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={handleScreenShare}
                onEndCall={handleEndCall}
              />
            </div>
          </div>

          {/* Sidebar */}
          {sidebarOpen && (
            <div className="lg:col-span-1 space-y-4">
              {/* Stats Widget */}
              {showStats && (
                <RoomStats
                  participantCount={peers.length + 1}
                  callDuration={
                    callStartTimeRef.current
                      ? new Date().getTime() - callStartTimeRef.current.getTime()
                      : 0
                  }
                  connectionStats={stats}
                  isScreenSharing={isScreenSharing}
                />
              )}

              {/* Participants List */}
              <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3">참여자</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <div className="text-sm text-gray-300 p-2 bg-gray-900/50 rounded">
                    👤 You ({userId.slice(0, 8)})
                  </div>
                  {peers.map((peer) => (
                    <div
                      key={peer.peerId}
                      className="text-sm text-gray-300 p-2 bg-gray-900/50 rounded flex items-center gap-2"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {peer.peerId.slice(0, 8)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-900/30 border border-blue-600/50 rounded p-3 text-sm text-blue-200">
                <p className="font-semibold mb-1">💡 팁</p>
                <p>마이크와 카메라를 제어하고 화면을 공유할 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
