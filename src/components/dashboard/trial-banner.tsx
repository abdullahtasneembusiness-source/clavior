import Link from "next/link";
import { formatPrice, type PlanConfig } from "@/lib/plans";

export function TrialBanner({ daysRemaining, plan }: { daysRemaining: number; plan: PlanConfig }) {
  return (
    <div
      className="mb-6 flex items-center justify-between rounded-lg border px-4 py-3"
      style={{ borderColor: "#3B6FE8", background: "rgba(59,111,232,0.08)" }}
    >
      <p className="text-sm text-white">
        <span className="font-semibold tabular-nums">{daysRemaining}</span>{" "}
        {daysRemaining === 1 ? "day" : "days"} left in your {plan.name} trial — then{" "}
        {formatPrice(plan.priceCents)}/month.
      </p>
      <Link href="/dashboard/settings" className="shrink-0 text-sm font-medium text-accent hover:underline">
        Manage billing
      </Link>
    </div>
  );
}
