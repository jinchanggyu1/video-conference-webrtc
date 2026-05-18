"use client";

// ====================================
// Component: Video Display Container
// ====================================

import React, { useRef, useEffect } from "react";

interface VideoContainerProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  label?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  showStats?: boolean;
  bitrate?: number;
  frameRate?: number;
}

export const VideoContainer = React.forwardRef<
  HTMLVideoElement,
  VideoContainerProps
>(
  (
    {
      stream,
      isLocal = false,
      label,
      isMuted = false,
      isVideoOff = false,
      isScreenSharing = false,
      showStats = false,
      bitrate = 0,
      frameRate = 0,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn("Failed to play video:", err);
        });
      }

      return () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
    }, [stream]);

    useEffect(() => {
      if (ref) {
        if (typeof ref === "function") {
          ref(videoRef.current);
        } else {
          ref.current = videoRef.current;
        }
      }
    }, [ref]);

    return (
      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-lg">
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />

        {/* Video Off Overlay */}
        {isVideoOff && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📹❌</div>
              <p className="text-white text-sm">카메라가 꺼져있습니다</p>
            </div>
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-2 right-2 flex gap-2">
          {isMuted && (
            <div
              className="bg-red-600 rounded-full p-2 text-white text-sm flex items-center justify-center w-8 h-8"
              title="음소거됨"
            >
              🔇
            </div>
          )}
          {isScreenSharing && (
            <div
              className="bg-blue-600 rounded-full p-2 text-white text-sm flex items-center justify-center w-8 h-8"
              title="화면 공유 중"
            >
              🖥️
            </div>
          )}
        </div>

        {/* Label */}
        {label && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
            <p className="text-white text-sm font-semibold">{label}</p>
          </div>
        )}

        {/* Statistics */}
        {showStats && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-60 rounded p-2 text-white text-xs space-y-1">
            {frameRate > 0 && <div>📊 {frameRate} FPS</div>}
            {bitrate > 0 && <div>📈 {(bitrate / 1024).toFixed(1)} Kbps</div>}
          </div>
        )}
      </div>
    );
  }
);

VideoContainer.displayName = "VideoContainer";
