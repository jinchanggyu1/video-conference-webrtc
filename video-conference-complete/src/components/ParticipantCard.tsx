"use client";

// ====================================
// Component: Participant Card
// ====================================

import React from "react";
import { VideoContainer } from "./VideoContainer";
import type { WeatherInfo } from "@/hooks/useLocationWeather";

interface ParticipantCardProps {
  userId: string;
  userName?: string;
  stream: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  isPresenting?: boolean;
  connectionQuality?: "excellent" | "good" | "poor" | "unknown";
  weather?: WeatherInfo | null;
}

export const ParticipantCard: React.FC<ParticipantCardProps> = ({
  userId,
  userName,
  stream,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  isPresenting = false,
  connectionQuality = "unknown",
  weather,
}) => {
  const qualityColor = {
    excellent: "bg-green-600",
    good: "bg-yellow-600",
    poor: "bg-red-600",
    unknown: "bg-gray-600",
  };

  return (
    <div
      className={`
        relative bg-gray-800 rounded-lg overflow-hidden shadow-lg
        hover:shadow-xl transition-all duration-200
        ${isPresenting ? "ring-2 ring-blue-500" : ""}
      `}
    >
      {/* Video Container */}
      <div className="aspect-video">
        <VideoContainer
          stream={stream}
          isLocal={isLocal}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          label={userName || (isLocal ? "You" : `User ${userId.slice(0, 8)}`)}
        />
      </div>

      {/* Weather Overlay */}
      {weather && (
        <div
          className="absolute top-2 left-2 bg-black/60 backdrop-blur rounded-md px-2 py-1.5 text-white text-xs shadow-lg flex items-center gap-1.5"
          title={`${weather.description} · ${weather.city}, ${weather.country}`}
        >
          <span className="text-base leading-none">{weather.icon}</span>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{weather.temperature}°C</span>
            <span className="text-[10px] text-gray-300 truncate max-w-[80px]">
              {weather.city}
            </span>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      <div className="absolute top-2 right-2 flex gap-1">
        {isPresenting && (
          <div
            className="bg-blue-600 rounded-full p-2 w-8 h-8 flex items-center justify-center text-white text-sm"
            title="현재 발표 중"
          >
            🎤
          </div>
        )}
        <div
          className={`${qualityColor[connectionQuality]} rounded-full p-2 w-8 h-8 flex items-center justify-center text-white text-xs font-bold`}
          title={`연결 품질: ${connectionQuality}`}
        >
          {connectionQuality === "excellent" ? "✅" : "⚠️"}
        </div>
      </div>

      {/* User Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-3">
        <p className="text-white text-sm font-semibold truncate">
          {isLocal ? "You" : userName || userId.slice(0, 8)}
        </p>
        <p className="text-gray-400 text-xs truncate">{userId}</p>
      </div>
    </div>
  );
};
