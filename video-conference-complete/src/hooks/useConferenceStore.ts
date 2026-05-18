// ====================================
// Hook: Zustand Conference Store
// ====================================

import { create } from "zustand";
import { Message, User } from "@/lib/types";

interface ConferenceState {
  // Room info
  roomId: string | null;
  userId: string;
  participants: User[];
  messages: Message[];

  // Call state
  isConnected: boolean;
  callStartTime: Date | null;
  callDuration: number;

  // Screen sharing
  isScreenSharing: boolean;
  screenShareStream: MediaStream | null;
  screenSharePresenterId: string | null;

  // UI state
  sidebarOpen: boolean;
  showChat: boolean;
  showStats: boolean;

  // Settings
  theme: "dark" | "light";
  autoGainControl: boolean;
  echoCancellation: boolean;
  noiseSuppression: boolean;

  // Actions
  setRoomId: (roomId: string) => void;
  setParticipants: (participants: User[]) => void;
  addParticipant: (user: User) => void;
  removeParticipant: (userId: string) => void;
  setConnected: (connected: boolean) => void;
  startCall: () => void;
  endCall: () => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setScreenSharing: (sharing: boolean, stream?: MediaStream) => void;
  setScreenSharePresenter: (userId: string | null) => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
  toggleStats: () => void;
  updateSettings: (settings: Partial<ConferenceState>) => void;
  reset: () => void;
}

const initialState = {
  roomId: null,
  userId: Math.random().toString(36).substr(2, 9),
  participants: [] as User[],
  messages: [] as Message[],
  isConnected: false,
  callStartTime: null,
  callDuration: 0,
  isScreenSharing: false,
  screenShareStream: null,
  screenSharePresenterId: null,
  sidebarOpen: true,
  showChat: true,
  showStats: false,
  theme: "dark" as const,
  autoGainControl: true,
  echoCancellation: true,
  noiseSuppression: true,
};

export const useConferenceStore = create<ConferenceState>((set) => ({
  ...initialState,

  setRoomId: (roomId) => set({ roomId }),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (user) =>
    set((state) => ({
      participants: [...state.participants, user],
    })),

  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== userId),
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  startCall: () => set({ callStartTime: new Date(), callDuration: 0 }),

  endCall: () => set({ callStartTime: null, callDuration: 0, roomId: null }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  setScreenSharing: (sharing, stream) =>
    set({ isScreenSharing: sharing, screenShareStream: stream || null }),

  setScreenSharePresenter: (userId) =>
    set({ screenSharePresenterId: userId }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  toggleChat: () => set((state) => ({ showChat: !state.showChat })),

  toggleStats: () => set((state) => ({ showStats: !state.showStats })),

  updateSettings: (settings) => set(settings),

  reset: () => set(initialState),
}));
