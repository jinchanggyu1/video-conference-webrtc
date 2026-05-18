"use client";

// ====================================
// Component: Room Statistics
// ====================================

import React, { useEffect, useState } from "react";
import { ConnectionStats } from "@/lib/types";

interface RoomStatsProps {
  participantCount: number;
  callDuration: number;
  connectionStats?: Map<string, ConnectionStats>;
  isScreenSharing?: boolean;
  averageLatency?: number;
  averageBitrate?: number;
}

export const RoomStats: React.FC<RoomStatsProps> = ({
  participantCount,
  callDuration,
  connectionStats = new Map(),
  isScreenSharing = false,
  averageLatency = 0,
  averageBitrate = 0,
}) => {
  const [formattedDuration, setFormattedDuration] = useState("00:00:00");

  useEffect(() => {
    const hours = Math.floor(callDuration / 3600000);
    const minutes = Math.floor((callDuration % 3600000) / 60000);
    const seconds = Math.floor((callDuration % 60000) / 1000);

    setFormattedDuration(
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    );
  }, [callDuration]);

  const getQualityIndicator = (latency: number) => {
    if (latency < 50) return { text: "우수", color: "text-green-400", bg: "bg-green-900" };
    if (latency < 150) return { text: "양호", color: "text-yellow-400", bg: "bg-yellow-900" };
    return { text: "불량", color: "text-red-400", bg: "bg-red-900" };
  };

  const avgLatency = connectionStats.size > 0
    ? Array.from(connectionStats.values()).reduce((sum, stat) => sum + stat.latency, 0) /
      connectionStats.size
    : averageLatency;

  const quality = getQualityIndicator(avgLatency);

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3 text-white text-sm max-w-xs">
      {/* Header */}
      <div className="font-semibold text-base border-b border-gray-700 pb-2">
        📊 통화 통계
      </div>

      {/* Duration */}
      <div className="flex justify-between items-center">
        <span className="text-gray-300">⏱️ 통화 시간</span>
        <span className="font-mono font-semibold">{formattedDuration}</span>
      </div>

      {/* Participants */}
      <div className="flex justify-between items-center">
        <span className="text-gray-300">👥 참여자</span>
        <span className="font-semibold bg-blue-900 px-2 py-1 rounded">
          {participantCount}명
        </span>
      </div>

      {/* Connection Quality */}
      <div className="flex justify-between items-center">
        <span className="text-gray-300">📡 연결 품질</span>
        <span className={`font-semibold ${quality.color} ${quality.bg} px-2 py-1 rounded`}>
          {quality.text}
        </span>
      </div>

      {/* Latency */}
      {avgLatency > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-gray-300">🕐 지연 시간</span>
          <span className="font-mono">{avgLatency.toFixed(0)}ms</span>
        </div>
      )}

      {/* Bitrate */}
      {averageBitrate > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-gray-300">📈 대역폭</span>
          <span className="font-mono">{(averageBitrate / 1024).toFixed(1)} Kbps</span>
        </div>
      )}

      {/* Screen Share Status */}
      {isScreenSharing && (
        <div className="flex items-center gap-2 bg-blue-900 rounded p-2 text-blue-200">
          <span>🖥️</span>
          <span>화면 공유 진행 중</span>
        </div>
      )}

      {/* Connection Count */}
      {connectionStats.size > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-700 pt-2">
          <span>활성 연결</span>
          <span>{connectionStats.size}개</span>
        </div>
      )}
    </div>
  );
};
