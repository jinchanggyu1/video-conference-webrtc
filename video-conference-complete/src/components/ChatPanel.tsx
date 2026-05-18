"use client";

// ====================================
// Component: Chat Panel
// ====================================

import React, { useState, useEffect, useRef } from "react";
import { Message } from "@/lib/types";

interface ChatPanelProps {
  messages: Message[];
  currentUserId: string;
  onSend: (content: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSend,
}) => {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg flex flex-col h-[500px]">
      {/* Header */}
      <div className="font-semibold text-white px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <span>💬 채팅</span>
        <span className="text-xs text-gray-400 font-normal">
          {messages.length}개 메시지
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center mt-8">
            아직 메시지가 없습니다.
            <br />
            첫 메시지를 보내보세요!
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            const ts = new Date(msg.timestamp);
            const timeLabel = ts.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-gray-400 mb-0.5 px-1">
                  {isMine ? "You" : msg.senderName} · {timeLabel}
                </span>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm break-words whitespace-pre-wrap ${
                    isMine
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-gray-700 text-gray-100 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-700 p-2 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지 입력..."
          maxLength={500}
          className="flex-1 bg-gray-900 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-semibold transition-colors"
        >
          전송
        </button>
      </form>
    </div>
  );
};
