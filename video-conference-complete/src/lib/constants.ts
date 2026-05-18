// ====================================
// Constants & Configuration
// ====================================

// TURN credentials can be overridden via env vars for private/paid relays.
// Defaults: Metered Open Relay Project (public, free, occasional rate limits).
const TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME || "openrelayproject";
const TURN_CREDENTIAL = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "openrelayproject";

export const WEBRTC_CONFIG = {
  iceServers: [
    // STUN — used for direct P2P when NAT permits
    { urls: ["stun:stun.l.google.com:19302"] },
    { urls: ["stun:stun1.l.google.com:19302"] },
    { urls: ["stun:stun2.l.google.com:19302"] },
    // TURN — relay fallback for symmetric NAT / firewalled networks.
    // Multiple ports/protocols so at least one path usually works.
    {
      urls: "turn:openrelay.metered.ca:80",
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
    {
      urls: "turns:openrelay.metered.ca:443",
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
  ],
  iceCandidatePoolSize: 10,
};

export const VIDEO_CONSTRAINTS = {
  width: { min: 320, ideal: 1280, max: 1920 },
  height: { min: 240, ideal: 720, max: 1080 },
  frameRate: { min: 15, ideal: 30, max: 60 },
};

export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
};

export const SOCKET_CONFIG = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"],
};

export const ROOM_CONFIG = {
  maxParticipants: 100,
  maxScreenShares: 1,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes
};

export const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export const ERROR_MESSAGES = {
  MEDIA_PERMISSION_DENIED: "마이크/카메라 접근 권한이 거부되었습니다.",
  MEDIA_NOT_FOUND: "마이크/카메라를 찾을 수 없습니다.",
  MEDIA_NOT_READABLE: "마이크/카메라에 접근할 수 없습니다.",
  WEBRTC_CONNECTION_FAILED: "WebRTC 연결에 실패했습니다.",
  SOCKET_CONNECTION_FAILED: "소켓 연결에 실패했습니다.",
  ROOM_NOT_FOUND: "방을 찾을 수 없습니다.",
  INVALID_ROOM_ID: "유효하지 않은 방 ID입니다.",
  UNSUPPORTED_BROWSER: "지원하지 않는 브라우저입니다.",
};

export const SUCCESS_MESSAGES = {
  MEDIA_STREAM_ACQUIRED: "미디어 스트림을 획득했습니다.",
  CONNECTION_ESTABLISHED: "연결이 성립되었습니다.",
  SCREEN_SHARE_STARTED: "화면 공유가 시작되었습니다.",
  SCREEN_SHARE_STOPPED: "화면 공유가 중지되었습니다.",
  USER_JOINED: "사용자가 입장했습니다.",
  USER_LEFT: "사용자가 퇴장했습니다.",
};

export const DEFAULT_ROOM_SETTINGS = {
  maxParticipants: 100,
  allowScreenShare: true,
  allowChat: true,
  allowRecording: false,
  defaultAudioEnabled: true,
  defaultVideoEnabled: true,
  recordingMode: "none" as "none" | "server" | "client",
};

export const API_ENDPOINTS = {
  SOCKET: "/api/socket",
  METRICS: "/api/metrics",
  RECORDINGS: "/api/recordings",
  ROOMS: "/api/rooms",
};

export const TIMEOUT_VALUES = {
  MEDIA_TIMEOUT: 10000,
  CONNECTION_TIMEOUT: 30000,
  SCREEN_SHARE_TIMEOUT: 15000,
  ICE_GATHERING_TIMEOUT: 5000,
};

export const QUALITY_LEVELS = {
  LOW: { width: 320, height: 240, frameRate: 15 },
  MEDIUM: { width: 640, height: 480, frameRate: 24 },
  HIGH: { width: 1280, height: 720, frameRate: 30 },
  ULTRA: { width: 1920, height: 1080, frameRate: 60 },
};

export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  ERROR: "error",

  // Room
  JOIN_ROOM: "join-room",
  LEAVE_ROOM: "leave-room",
  ROOM_USERS: "room-users",
  USER_JOINED: "user-joined",
  USER_LEFT: "user-left",

  // WebRTC
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",

  // Media Control
  USER_MUTED: "user-muted",
  USER_UNMUTED: "user-unmuted",
  USER_VIDEO_OFF: "user-video-off",
  USER_VIDEO_ON: "user-video-on",

  // Screen Share
  SCREEN_SHARE_START: "screen-share-start",
  SCREEN_SHARE_STOP: "screen-share-stop",

  // Chat
  CHAT_MESSAGE: "chat-message",
  CHAT_HISTORY: "chat-history",

  // Statistics
  CONNECTION_STATS: "connection-stats",
};
