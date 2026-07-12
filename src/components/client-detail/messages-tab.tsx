"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import type { Message } from "@/lib/types";

export function MessagesTab({
  clientId,
  workspaceId,
  currentUserId,
  initialMessages,
  senderMap,
}: {
  clientId: string;
  workspaceId: string;
  currentUserId: string;
  initialMessages: Message[];
  senderMap: Record<string, string>;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, supabase]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(content: string) {
    setSending(true);
    setError(null);
    const { error } = await supabase.from("messages").insert({
      workspace_id: workspaceId,
      client_id: clientId,
      sender_id: currentUserId,
      content,
    });
    setSending(false);
    if (error) setError("Message failed to send. Please try again.");
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              senderName={senderMap[message.sender_id] ?? "Someone"}
              isOwn={message.sender_id === currentUserId}
            />
          ))
        )}
      </div>

      {error && (
        <p className="px-6 pb-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <MessageInput onSend={handleSend} sending={sending} />
    </div>
  );
}
