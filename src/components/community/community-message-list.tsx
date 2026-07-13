"use client";

import { useEffect, useRef } from "react";
import { CommunityMessageRow } from "./community-message-row";
import type { Message } from "@/lib/types";

export function CommunityMessageList({
  messages,
  senderMap,
  founderId,
  currentUserId,
  canModerate,
  pinnedMessageId,
  onPin,
}: {
  messages: Message[];
  senderMap: Record<string, string>;
  founderId: string;
  currentUserId: string;
  canModerate: boolean;
  pinnedMessageId: string | null;
  onPin: (messageId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto py-5">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">No messages yet. Say hello to the community.</p>
        </div>
      ) : (
        messages.map((message) => (
          <CommunityMessageRow
            key={message.id}
            message={message}
            senderName={senderMap[message.sender_id] ?? "Someone"}
            isFounder={message.sender_id === founderId}
            isOwn={message.sender_id === currentUserId}
            canModerate={canModerate}
            isPinned={message.id === pinnedMessageId}
            onPin={() => onPin(message.id)}
          />
        ))
      )}
    </div>
  );
}
