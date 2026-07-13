"use client";

import { avatarColorFor, initialsFor, formatClockTime } from "@/lib/dashboard-utils";
import { PinIcon } from "@/components/dashboard/icons";
import type { Message } from "@/lib/types";

export function CommunityMessageRow({
  message,
  senderName,
  isFounder,
  isOwn,
  canModerate,
  isPinned,
  onPin,
}: {
  message: Message;
  senderName: string;
  isFounder: boolean;
  isOwn: boolean;
  canModerate: boolean;
  isPinned: boolean;
  onPin: () => void;
}) {
  return (
    <div className="group relative flex gap-3 px-2 py-1 hover:bg-card" style={{ marginLeft: -8, marginRight: -8, paddingLeft: 8, paddingRight: 8, borderRadius: 8 }}>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: avatarColorFor(senderName) }}
      >
        {initialsFor(senderName)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-white">{isOwn ? "You" : senderName}</span>
          {isFounder && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(59,111,232,0.15)", color: "#3B6FE8" }}
            >
              Founder
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatClockTime(message.created_at)}</span>
          {isPinned && <PinIcon size={12} className="text-accent" />}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white">
          {message.video_id ? "Sent a video message" : message.content}
        </p>
      </div>

      {canModerate && (
        <button
          onClick={onPin}
          className="absolute right-2 top-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
          style={{ background: "#0D1321" }}
          aria-label={isPinned ? "Already pinned" : "Pin message"}
          title={isPinned ? "Already pinned" : "Pin message"}
        >
          <PinIcon size={14} />
        </button>
      )}
    </div>
  );
}
