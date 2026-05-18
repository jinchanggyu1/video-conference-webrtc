"use client";

// ====================================
// Component: Control Panel
// ====================================

import React from "react";

interface ControlPanelProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  disabled?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isMuted,
  isVideoEnabled,
  isScreenSharing = false,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  disabled = false,
}) => {
  const buttonClass = (isActive: boolean, isError: boolean = false) => `
    w-14 h-14 rounded-full flex items-center justify-center
    transition-all duration-200 transform hover:scale-110
    disabled:opacity-50 disabled:cursor-not-allowed
    text-xl shadow-lg font-bold
    ${
      isError
        ? "bg-red-600 hover:bg-red-700 text-white"
        : isActive
          ? "bg-gray-700 hover:bg-gray-600 text-white"
          : "bg-red-600 hover:bg-red-700 text-white"
    }
  `;

  return (
    <div className="flex gap-4 justify-center items-center p-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-full shadow-2xl">
      {/* Mute Button */}
      <button
        onClick={onToggleMute}
        disabled={disabled}
        className={buttonClass(!isMuted)}
        title={isMuted ? "음성 켜기" : "음성 끄기"}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "🔇" : "🎤"}
      </button>

      {/* Video Button */}
      <button
        onClick={onToggleVideo}
        disabled={disabled}
        className={buttonClass(isVideoEnabled, !isVideoEnabled)}
        title={isVideoEnabled ? "카메라 끄기" : "카메라 켜기"}
        aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoEnabled ? "📹" : "📹❌"}
      </button>

      {/* Screen Share Button */}
      <button
        onClick={onToggleScreenShare}
        disabled={disabled}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-200 transform hover:scale-110
          disabled:opacity-50 disabled:cursor-not-allowed
          text-xl shadow-lg font-bold
          ${
            isScreenSharing
              ? "bg-blue-700 hover:bg-blue-800 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }
        `}
        title="화면 공유"
        aria-label="Share screen"
      >
        🖥️
      </button>

      {/* End Call Button */}
      <button
        onClick={onEndCall}
        disabled={disabled}
        className="
          w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-200 transform hover:scale-110
          disabled:opacity-50 disabled:cursor-not-allowed
          text-xl shadow-lg font-bold
          bg-red-700 hover:bg-red-800 text-white
        "
        title="통화 종료"
        aria-label="End call"
      >
        ☎️❌
      </button>
    </div>
  );
};
