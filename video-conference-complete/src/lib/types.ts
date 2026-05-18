// ====================================
// WebRTC & Socket.io Types
// ====================================

export interface Peer {
  peerId: string;
  connection: RTCPeerConnection | null;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  createdAt: Date;
}

export interface RoomData {
  roomId: string;
  participants: string[];
  createdAt: Date;
  participantCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: "text" | "system" | "notification";
}

export interface CallState {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  callStartTime: Date | null;
  callDuration: number;
}

export interface ScreenShareState {
  isSharing: boolean;
  stream: MediaStream | null;
  presenterId: string | null;
  startTime: Date | null;
}

export interface LocalMediaState {
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  selectedAudioDevice: string | null;
  selectedVideoDevice: string | null;
}

export interface ConnectionStats {
  bandwidth: number;
  latency: number;
  packetLoss: number;
  connectionQuality: "excellent" | "good" | "poor" | "unknown";
  videoResolution: { width: number; height: number };
  frameRate: number;
  audioLevel: number;
}

export interface User {
  id: string;
  name: string;
  role: "host" | "participant" | "presenter";
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  joinedAt: Date;
}

export interface RoomSettings {
  maxParticipants: number;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowRecording: boolean;
  defaultAudioEnabled: boolean;
  defaultVideoEnabled: boolean;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceGatheringState: RTCIceGatheringState;
  connectionState: RTCPeerConnectionState;
}

export interface SocketEvents {
  // Connection events
  "connection": void;
  "disconnect": void;
  "error": { message: string };

  // Room events
  "join-room": { roomId: string; userId: string };
  "leave-room": { roomId: string; userId: string };
  "room-users": { users: string[]; count: number };
  "user-joined": { userId: string; timestamp: Date };
  "user-left": { userId: string; timestamp: Date };

  // WebRTC signaling
  "offer": { from: string; offer: RTCSessionDescriptionInit };
  "answer": { from: string; answer: RTCSessionDescriptionInit };
  "ice-candidate": { from: string; candidate: RTCIceCandidateInit };

  // Media control
  "user-muted": { userId: string };
  "user-unmuted": { userId: string };
  "user-video-off": { userId: string };
  "user-video-on": { userId: string };

  // Screen share
  "screen-share-start": { userId: string };
  "screen-share-stop": { userId: string };

  // Chat
  "chat-message": Message;
  "chat-history": Message[];

  // Statistics
  "connection-stats": { userId: string; stats: ConnectionStats };
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  expectedResults: string[];
  priority: "critical" | "high" | "medium" | "low";
  category: string;
}

export interface TestStep {
  action: string;
  description: string;
  expectedBehavior: string;
  timeout: number;
}

export interface TestResult {
  scenarioId: string;
  passed: boolean;
  duration: number;
  error?: string;
  timestamp: Date;
}

export interface DeviceInfo {
  deviceId: string;
  groupId: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
  label: string;
}

export interface NetworkState {
  isOnline: boolean;
  connectionType: "4g" | "3g" | "2g" | "wifi" | "ethernet" | "unknown";
  effectiveType: "4g" | "3g" | "2g" | "slow-2g";
  downlink: number;
  rtt: number;
  saveData: boolean;
}
