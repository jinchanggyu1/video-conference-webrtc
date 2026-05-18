"use client";

// ====================================
// Main Page - Local Media & Room Join
// ====================================

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { VideoContainer } from "@/components/VideoContainer";
import { ControlPanel } from "@/components/ControlPanel";
import { useLocalMedia } from "@/hooks/useLocalMedia";
import { useSocket } from "@/hooks/useSocket";
import { useConferenceStore } from "@/hooks/useConferenceStore";
import { logger } from "@/lib/logger";

export default function HomePage() {
  const router = useRouter();
  const { localStream, isMuted, isVideoEnabled, toggleMute, toggleVideo } =
    useLocalMedia();
  const { request, isConnected } = useSocket();
  const [roomId, setRoomId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId, setRoomId: storeSetRoomId } = useConferenceStore();

  const handleJoinRoom = async () => {
    const trimmed = roomId.trim();
    if (!trimmed) {
      setError("방 ID를 입력해주세요.");
      return;
    }
    if (trimmed.length < 3) {
      setError("방 ID는 최소 3자 이상이어야 합니다.");
      return;
    }
    if (!isConnected) {
      setError("시그널링 서버에 연결 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.info(`Checking room existence: ${trimmed}`, undefined, "HomePage");
      const res = await request<{ exists: boolean; userCount: number }>(
        "check-room",
        { roomId: trimmed }
      );
      if (!res.exists) {
        setError(`'${trimmed}' 방이 존재하지 않습니다. 새 방을 만들거나 다른 ID로 시도해주세요.`);
        setIsLoading(false);
        return;
      }
      storeSetRoomId(trimmed);
      router.push(`/room/${trimmed}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "방 검증 중 오류가 발생했습니다.";
      setError(msg);
      logger.error("Failed to check room", err, "HomePage");
      setIsLoading(false);
    }
  };

  const handleScreenShare = async () => {
    try {
      logger.info("Starting screen share from home page", undefined, "HomePage");
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false,
      });
      logger.info("Screen share acquired", undefined, "HomePage");
      screenStream.getTracks().forEach((track) => {
        track.onended = () => {
          logger.info("Screen share ended", undefined, "HomePage");
        };
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        logger.info("Screen share cancelled by user", undefined, "HomePage");
      } else {
        logger.error("Screen share failed", err, "HomePage");
      }
    }
  };

  const handleEndCall = () => {
    logger.info("End call clicked on home page", undefined, "HomePage");
  };

  const handleCreateRoom = async () => {
    if (!isConnected) {
      setError("시그널링 서버에 연결 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const res = await request<{ success?: boolean; roomId?: string; error?: string }>(
        "create-room",
        {}
      );
      if (res.error || !res.roomId) {
        setError(res.error || "방 생성에 실패했습니다.");
        setIsCreating(false);
        return;
      }
      logger.info(`Room created: ${res.roomId}`, undefined, "HomePage");
      storeSetRoomId(res.roomId);
      router.push(`/room/${res.roomId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "방 생성 중 오류가 발생했습니다.";
      setError(msg);
      logger.error("Failed to create room", err, "HomePage");
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-dark to-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fadeIn">
          <h1 className="text-5xl font-bold text-white mb-2">
            🎬 화상회의 솔루션
          </h1>
          <p className="text-gray-400 text-lg">
            WebRTC 기반 완전한 화상회의 플랫폼
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Local Video Section */}
          <div className="space-y-4 animate-slideIn">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold text-white">내 카메라</h2>
            </div>

            {/* Video */}
            <div className="aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-700">
              {localStream ? (
                <VideoContainer
                  stream={localStream}
                  isLocal
                  label={`You (${userId.slice(0, 8)})`}
                  isMuted={isMuted}
                  isVideoOff={!isVideoEnabled}
                />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-400 mb-2">📹 미디어 로딩 중...</p>
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 p-4 rounded-lg">
              <p className="text-gray-300 text-sm">
                사용자 ID: <span className="font-mono text-cyan-400">{userId}</span>
              </p>
              <p className="text-gray-400 text-xs mt-2">
                이 ID는 다른 사용자와 구별하기 위해 사용됩니다.
              </p>
            </div>

            {/* Controls */}
            <div className="mt-6">
              <ControlPanel
                isMuted={isMuted}
                isVideoEnabled={isVideoEnabled}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={handleScreenShare}
                onEndCall={handleEndCall}
              />
            </div>
          </div>

          {/* Room Join Section */}
          <div className="space-y-6 animate-slideIn">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-white">방 입장</h2>
            </div>

            {/* Room ID Input */}
            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  방 ID
                </label>
                <input
                  type="text"
                  placeholder="방 ID 입력 또는 생성"
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value);
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="
                    w-full px-4 py-3 rounded-lg
                    bg-gray-900 text-white
                    border border-gray-600 focus:border-blue-500
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                  "
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/30 border border-red-600/50 rounded p-3 text-red-200 text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating || isLoading || !isConnected}
                  className="
                    px-4 py-3 rounded-lg font-semibold
                    bg-gray-700 hover:bg-gray-600
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                    flex items-center justify-center gap-2
                  "
                  title="새 방 생성 후 자동 입장"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      생성 중...
                    </>
                  ) : (
                    <>🎲 새 방 만들기</>
                  )}
                </button>

                <button
                  onClick={handleJoinRoom}
                  disabled={isLoading || isCreating || !roomId.trim() || !isConnected}
                  className="
                    px-4 py-3 rounded-lg font-semibold
                    bg-blue-600 hover:bg-blue-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                    flex items-center justify-center gap-2
                  "
                  title="기존 방 입장 (존재 여부 검증)"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      확인 중...
                    </>
                  ) : (
                    <>🚪 입장하기</>
                  )}
                </button>
              </div>

              {!isConnected && (
                <p className="text-xs text-gray-400 mt-1 text-center">
                  ⏳ 시그널링 서버 연결 중...
                </p>
              )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-blue-900/30 border border-blue-600/50 rounded p-4">
                <p className="text-blue-200 text-sm">
                  💡 <strong>팁:</strong> "생성하기" 버튼으로 새 방을 만들거나 기존 방 ID를 입력하세요.
                </p>
              </div>
              <div className="bg-green-900/30 border border-green-600/50 rounded p-4">
                <p className="text-green-200 text-sm">
                  ✅ <strong>준비 완료:</strong> 카메라와 마이크가 준비되었습니다.
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="bg-gray-800/30 border border-gray-700/50 rounded p-4 space-y-3">
              <h3 className="font-semibold text-gray-200">주요 기능</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>✨ 최대 100명 동시 참여</li>
                <li>🎥 고화질 비디오 (최대 1080p)</li>
                <li>🎤 고음질 오디오</li>
                <li>🖥️ 화면 공유</li>
                <li>💬 실시간 채팅</li>
                <li>📊 연결 통계</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
