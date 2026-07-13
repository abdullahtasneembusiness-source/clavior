"use client";

import { useState, useTransition } from "react";
import { updateTeamMemberRole, removeTeamMember } from "@/lib/team-actions";
import { avatarColorFor, initialsFor } from "@/lib/dashboard-utils";

export function TeamMemberRow({
  workspaceId,
  memberId,
  name,
  email,
  role,
  canManage,
}: {
  workspaceId: string;
  memberId: string;
  name: string;
  email: string;
  role: "admin" | "member";
  canManage: boolean;
}) {
  const [currentRole, setCurrentRole] = useState(role);
  const [removed, setRemoved] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (removed) return null;

  return (
    <div className="flex items-center gap-3 py-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: avatarColorFor(name) }}
      >
        {initialsFor(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>

      {canManage ? (
        <select
          value={currentRole}
          disabled={isPending}
          onChange={(e) => {
            const nextRole = e.target.value as "admin" | "member";
            setCurrentRole(nextRole);
            startTransition(() => {
              updateTeamMemberRole(workspaceId, memberId, nextRole);
            });
          }}
          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      ) : (
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: "#1E2A3B", color: "#8892A4" }}
        >
          {currentRole}
        </span>
      )}

      {canManage && (
        <button
          disabled={isPending}
          onClick={() => {
            setRemoved(true);
            startTransition(() => {
              removeTeamMember(workspaceId, memberId);
            });
          }}
          className="text-xs font-medium text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          Remove
        </button>
      )}
    </div>
  );
}
