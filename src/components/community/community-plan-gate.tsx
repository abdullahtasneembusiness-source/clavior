"use client";

import { useState } from "react";
import { CommunityIcon } from "@/components/dashboard/icons";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import type { PlanConfig } from "@/lib/plans";

export function CommunityPlanGate({ currentPlanName, nextPlan }: { currentPlanName: string; nextPlan: PlanConfig }) {
  const [open, setOpen] = useState(false);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-8 py-8">
      <div className="card flex max-w-sm flex-col items-center p-8 text-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "#1E2A3B" }}
        >
          <CommunityIcon size={22} className="text-muted-foreground" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-white">Community chat isn&apos;t on the {currentPlanName} plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upgrade to {nextPlan.name} to bring all your clients into one shared space.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-6 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Upgrade to {nextPlan.name}
        </button>
      </div>

      <UpgradeModal
        open={open}
        onClose={() => setOpen(false)}
        reason={`Community chat is available on the ${nextPlan.name} plan and above.`}
        nextPlan={nextPlan}
      />
    </main>
  );
}
