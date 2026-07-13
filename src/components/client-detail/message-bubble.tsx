"use client";

import { useState } from "react";
import { formatClockTime, formatDuration } from "@/lib/dashboard-utils";
import { PlayIcon } from "@/components/dashboard/icons";
import { VideoModal } from "./video-modal";
import type { Message, Video } from "@/lib/types";

export function MessageBubble({
  message,
  video,
  senderName,
  isOwn,
}: {
  message: Message;
  video: Video | undefined;
  senderName: string;
  isOwn: boolean;
}) {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      <span className="mb-1 px-1 text-xs font-medium text-muted-foreground">{senderName}</span>

      {message.video_id ? (
        <button
          onClick={() => video && setVideoOpen(true)}
          disabled={!video}
          className="flex w-56 items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-card disabled:cursor-wait"
          style={{ borderBottomRightRadius: isOwn ? 4 : undefined, borderBottomLeftRadius: isOwn ? undefined : 4 }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: "#1E2A3B" }}>
            <PlayIcon size={18} className="text-white" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">Video message</span>
            <span className="block text-xs text-muted-foreground">
              {video ? formatDuration(video.duration_seconds) : "Loading…"}
            </span>
          </span>
        </button>
      ) : (
        <div
          className="max-w-[75%] whitespace-pre-wrap break-words rounded-xl px-3.5 py-2.5 text-sm"
          style={{
            background: isOwn ? "#3B6FE8" : "#1E2A3B",
            color: "#ffffff",
            borderBottomRightRadius: isOwn ? 4 : undefined,
            borderBottomLeftRadius: isOwn ? undefined : 4,
          }}
        >
          {message.content}
        </div>
      )}

      <span className="mt-1 px-1 text-xs text-muted-foreground">{formatClockTime(message.created_at)}</span>

      {videoOpen && video && (
        <VideoModal video={video} senderName={senderName} onClose={() => setVideoOpen(false)} />
      )}
    </div>
  );
}
