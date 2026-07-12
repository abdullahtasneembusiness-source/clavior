import { formatClockTime } from "@/lib/dashboard-utils";
import type { Message } from "@/lib/types";

export function MessageBubble({
  message,
  senderName,
  isOwn,
}: {
  message: Message;
  senderName: string;
  isOwn: boolean;
}) {
  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      <span className="mb-1 px-1 text-xs font-medium text-muted-foreground">{senderName}</span>
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
      <span className="mt-1 px-1 text-xs text-muted-foreground">{formatClockTime(message.created_at)}</span>
    </div>
  );
}
