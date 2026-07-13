"use client";

import { avatarColorFor, initialsFor } from "@/lib/dashboard-utils";
import { CloseIcon } from "@/components/dashboard/icons";
import type { Client } from "@/lib/types";
import type { Person, StaffRole } from "@/app/dashboard/community/page";

const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Founder",
  admin: "Admin",
  member: "Member",
};

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
      style={{ background: online ? "#10B981" : "#4B5563", borderColor: "#0D1321" }}
    />
  );
}

export function MembersPanel({
  open,
  onClose,
  staff,
  clients,
  onlineUserIds,
}: {
  open: boolean;
  onClose: () => void;
  staff: Person[];
  clients: Client[];
  onlineUserIds: Set<string>;
}) {
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        aria-hidden="true"
      />

      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col overflow-y-auto border-l border-border p-5 shadow-2xl transition-transform duration-200"
        style={{ background: "#0D1321", transform: open ? "translateX(0)" : "translateX(100%)" }}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Members</h2>
          <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-white" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-1">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Team</p>
          {staff.map((person) => (
            <div key={person.id} className="flex items-center gap-3 rounded-lg px-1 py-2">
              <span className="relative shrink-0">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: avatarColorFor(person.name) }}
                >
                  {initialsFor(person.name)}
                </span>
                <OnlineDot online={onlineUserIds.has(person.id)} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-white">{person.name}</span>
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  background: person.role === "owner" ? "rgba(59,111,232,0.15)" : "#1E2A3B",
                  color: person.role === "owner" ? "#3B6FE8" : "#8892A4",
                }}
              >
                {ROLE_LABEL[person.role]}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-1">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Clients — {clients.length} active
          </p>
          {clients.map((client) => (
            <div key={client.id} className="flex items-center gap-3 rounded-lg px-1 py-2">
              <span className="relative shrink-0">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: avatarColorFor(client.name) }}
                >
                  {initialsFor(client.name)}
                </span>
                <OnlineDot online={client.user_id ? onlineUserIds.has(client.user_id) : false} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-white">{client.name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
