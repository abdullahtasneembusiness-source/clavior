import Link from "next/link";
import { avatarColorFor, initialsFor, timeAgo, formatDate, engagementScore } from "@/lib/dashboard-utils";
import type { Client } from "@/lib/types";

export function ClientInfoPanel({ client, aiEnabled }: { client: Client; aiEnabled: boolean }) {
  const score = engagementScore(client.last_active_at);

  return (
    <div className="card sticky top-8 flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
          style={{ background: avatarColorFor(client.name) }}
        >
          {initialsFor(client.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{client.name}</p>
          <p className="truncate text-sm text-muted-foreground">{client.email}</p>
        </div>
      </div>

      <span
        className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{
          background: client.status === "active" ? "rgba(16,185,129,0.12)" : "rgba(136,146,164,0.12)",
          color: client.status === "active" ? "#10B981" : "#8892A4",
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: client.status === "active" ? "#10B981" : "#8892A4" }}
        />
        {client.status === "active" ? "Active" : "Inactive"}
      </span>

      <div className="flex flex-col gap-3 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Joined</span>
          <span className="text-white">{formatDate(client.created_at)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Last active</span>
          <span className="text-white">{timeAgo(client.last_active_at)}</span>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Engagement</span>
          <span className="font-medium text-white">{score}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#1E2A3B" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${score}%`,
              background: score >= 70 ? "#10B981" : score >= 35 ? "#F59E0B" : "#EF4444",
            }}
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI summary</p>
        {!aiEnabled ? (
          <>
            <p className="mt-2 text-sm italic text-muted-foreground">
              AI relationship summaries are a Studio plan feature — automatic, one-line insight into how each client
              relationship is going.
            </p>
            <Link href="/pricing" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">
              Upgrade to Studio
            </Link>
          </>
        ) : client.ai_relationship_summary ? (
          <>
            <p className="mt-2 text-sm italic text-muted-foreground">{client.ai_relationship_summary}</p>
            {client.ai_relationship_summary_generated_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                Generated {timeAgo(client.ai_relationship_summary_generated_at)}
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm italic text-muted-foreground">
            A summary of this relationship will appear here once there&apos;s enough activity to generate one.
          </p>
        )}
      </div>
    </div>
  );
}
