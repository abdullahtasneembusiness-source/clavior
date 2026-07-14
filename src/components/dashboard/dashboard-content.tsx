"use client";

import { useState } from "react";
import { StatCard } from "./stat-card";
import { ClientCard } from "./client-card";
import { EmptyState } from "./empty-state";
import { AddClientPanel } from "./add-client-panel";
import { TrialBanner } from "./trial-banner";
import { PlusIcon } from "./icons";
import type { Client } from "@/lib/types";
import type { PlanConfig } from "@/lib/plans";

export function DashboardContent({
  workspaceId,
  clients,
  lastMessageByClientId,
  stats,
  trial,
  aiEnabled,
}: {
  workspaceId: string;
  clients: Client[];
  lastMessageByClientId: Record<string, string>;
  stats: { totalClients: number; activeThisWeek: number; messagesThisWeek: number };
  trial: { daysRemaining: number; plan: PlanConfig } | null;
  aiEnabled: boolean;
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <main className="flex flex-1 flex-col px-8 py-8">
      {trial && <TrialBanner daysRemaining={trial.daysRemaining} plan={trial.plan} />}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <PlusIcon />
          Add client
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total clients" value={stats.totalClients} />
        <StatCard label="Active this week" value={stats.activeThisWeek} />
        <StatCard label="Messages this week" value={stats.messagesThisWeek} />
      </div>

      <div className="mt-8">
        {clients.length === 0 ? (
          <EmptyState onAddClient={() => setPanelOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                lastMessagePreview={lastMessageByClientId[client.id] ?? null}
                aiEnabled={aiEnabled}
              />
            ))}
          </div>
        )}
      </div>

      <AddClientPanel workspaceId={workspaceId} open={panelOpen} onClose={() => setPanelOpen(false)} />
    </main>
  );
}
