"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import type { Message, Video } from "@/lib/types";

export function MessagesTab({
  clientId,
  workspaceId,
  currentUserId,
  initialMessages,
  senderMap,
  initialVideosById,
  onRecordVideo,
}: {
  clientId: string;
  workspaceId: string;
  currentUserId: string;
  initialMessages: Message[];
  senderMap: Record<string, string>;
  initialVideosById: Record<string, Video>;
  onRecordVideo: () => void;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [videosById, setVideosById] = useState(initialVideosById);
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

          // A video sent from another tab/session — fetch its details so the
          // inline chip can render (own sends already seed this via `send`).
          if (incoming.video_id) {
            setVideosById((prev) => {
              if (prev[incoming.video_id as string]) return prev;
              supabase
                .from("videos")
                .select("*")
                .eq("id", incoming.video_id as string)
                .maybeSingle()
                .then(({ data }) => {
                  if (data) setVideosById((current) => ({ ...current, [data.id]: data as Video }));
                });
              return prev;
            });
          }
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
              video={message.video_id ? videosById[message.video_id] : undefined}
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

      <MessageInput onSend={handleSend} sending={sending} onRecordVideo={onRecordVideo} />
    </div>
  );
}
