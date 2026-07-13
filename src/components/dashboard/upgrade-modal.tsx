"use client";

import { useState } from "react";
import { CloseIcon, CheckIcon } from "./icons";
import { formatPrice, type PlanConfig } from "@/lib/plans";
import { redirectTo } from "@/lib/navigate";

export function UpgradeModal({
  open,
  onClose,
  reason,
  nextPlan,
}: {
  open: boolean;
  onClose: () => void;
  reason: string;
  nextPlan: PlanConfig;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: nextPlan.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }

      redirectTo(data.url);
    } catch {
      setError("Could not start checkout. Please try again.");
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <div onClick={onClose} className="absolute inset-0 bg-black/60" aria-hidden="true" />

      <div className="card relative w-full max-w-sm p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-white">Upgrade to {nextPlan.name}</h2>
          <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-white" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">{reason}</p>

        <ul className="mt-5 flex flex-col gap-2.5">
          {nextPlan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-white">
              <CheckIcon size={16} className="mt-0.5 shrink-0 text-accent" />
              {feature}
            </li>
          ))}
        </ul>

        {error && (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Starting checkout…" : `Upgrade to ${nextPlan.name} — ${formatPrice(nextPlan.priceCents)}/month`}
        </button>
      </div>
    </div>
  );
}
