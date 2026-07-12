import Link from "next/link";
import {
  avatarColorFor,
  initialsFor,
  timeAgo,
  engagementLevel,
  ENGAGEMENT_COLOR,
} from "@/lib/dashboard-utils";
import type { Client } from "@/lib/types";

export function ClientCard({
  client,
  lastMessagePreview,
}: {
  client: Client;
  lastMessagePreview: string | null;
}) {
  const level = engagementLevel(client.last_active_at);

  return (
    <Link
      href={`/dashboard/clients/${client.id}`}
      className="card group flex flex-col p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-start justify-between">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ background: avatarColorFor(client.name) }}
        >
          {initialsFor(client.name)}
        </span>
        <span
          title={`${level === "active" ? "Active" : level === "cooling" ? "Cooling off" : "At risk"} — last active ${timeAgo(client.last_active_at)}`}
          className="mt-1 inline-block h-2 w-2 rounded-full"
          style={{ background: ENGAGEMENT_COLOR[level] }}
        />
      </div>

      <p className="mt-3 truncate text-sm font-semibold text-white">{client.name}</p>

      <p className="mt-1 truncate text-sm text-muted-foreground">
        {lastMessagePreview ?? "No messages yet"}
      </p>

      <p className="mt-3 text-xs text-muted-foreground">{timeAgo(client.last_active_at)}</p>
    </Link>
  );
}
