"use client";

import { useState, useTransition } from "react";
import { assignClientToMember } from "@/lib/team-actions";
import { avatarColorFor, initialsFor } from "@/lib/dashboard-utils";

export function ClientAssignmentRow({
  workspaceId,
  clientId,
  clientName,
  assignedMemberId,
  members,
}: {
  workspaceId: string;
  clientId: string;
  clientName: string;
  assignedMemberId: string | null;
  members: { userId: string; name: string }[];
}) {
  const [assigned, setAssigned] = useState(assignedMemberId ?? "");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 py-3">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: avatarColorFor(clientName) }}
      >
        {initialsFor(clientName)}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-white">{clientName}</p>

      <select
        value={assigned}
        disabled={isPending}
        onChange={(e) => {
          const memberId = e.target.value || null;
          setAssigned(e.target.value);
          startTransition(() => {
            assignClientToMember(workspaceId, clientId, memberId);
          });
        }}
        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
