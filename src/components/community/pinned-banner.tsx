"use client";

import { useState } from "react";
import { PinIcon, CloseIcon } from "@/components/dashboard/icons";
import type { Message } from "@/lib/types";

export function PinnedBanner({
  message,
  senderName,
  canModerate,
  onUnpin,
}: {
  message: Message;
  senderName: string;
  canModerate: boolean;
  onUnpin: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="flex w-full items-start gap-3 border-b border-border px-8 py-2.5 text-left transition-colors hover:bg-card"
    >
      <PinIcon size={14} className="mt-0.5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-muted-foreground">Pinned by {senderName}</span>
        <p className={expanded ? "mt-0.5 whitespace-pre-wrap text-sm text-white" : "truncate text-sm text-white"}>
          {message.video_id ? "Video message" : message.content}
        </p>
      </div>
      {canModerate && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onUnpin();
          }}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-white"
          aria-label="Unpin message"
        >
          <CloseIcon size={14} />
        </span>
      )}
    </button>
  );
}
