"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS, PLAN_ORDER, TRIAL_DAYS, formatPrice, type PlanId } from "@/lib/plans";
import { CheckIcon } from "@/components/dashboard/icons";
import { redirectTo } from "@/lib/navigate";

export function PricingCards({
  isLoggedIn,
  currentPlan,
}: {
  isLoggedIn: boolean;
  currentPlan: PlanId | null;
}) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGetStarted(plan: PlanId) {
    if (!isLoggedIn) {
      router.push("/signup");
      return;
    }

    setError(null);
    setLoadingPlan(plan);

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setLoadingPlan(null);
        return;
      }

      redirectTo(data.url);
    } catch {
      setError("Could not start checkout. Please try again.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="mt-14 w-full max-w-5xl">
      {error && (
        <p className="mb-6 text-center text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isPopular = planId === "team";
          const isCurrent = currentPlan === planId;

          return (
            <div
              key={planId}
              className="card relative flex flex-col p-7 transition-transform duration-150 hover:-translate-y-1"
              style={{ borderColor: isPopular ? "#3B6FE8" : undefined }}
            >
              {isPopular && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ background: "#3B6FE8" }}
                >
                  Most popular
                </span>
              )}

              <h2 className="text-lg font-semibold text-white">{plan.name}</h2>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-white">{formatPrice(plan.priceCents)}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>

              <p className="mt-2 text-sm text-accent">
                $1 for {TRIAL_DAYS} days, then {formatPrice(plan.priceCents)}/month
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-white">
                    <CheckIcon size={16} className="mt-0.5 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleGetStarted(planId)}
                disabled={loadingPlan !== null || isCurrent}
                className="mt-8 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
                style={{
                  background: isCurrent ? "#1E2A3B" : "#3B6FE8",
                  color: isCurrent ? "#8892A4" : "#ffffff",
                  opacity: loadingPlan && loadingPlan !== planId ? 0.5 : 1,
                }}
              >
                {isCurrent ? "Current plan" : loadingPlan === planId ? "Starting checkout…" : "Get Started"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
