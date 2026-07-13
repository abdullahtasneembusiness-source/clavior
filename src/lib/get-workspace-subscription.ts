import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type PlanId, isPlanId } from "@/lib/plans";

export type WorkspaceSubscription = {
  plan: PlanId;
  status: string | null;
  stripeCustomerId: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
} | null;

export async function getWorkspaceSubscription(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceSubscription> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, stripe_customer_id, trial_ends_at, current_period_end")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data) return null;

  return {
    plan: isPlanId(data.plan) ? data.plan : "solo",
    status: data.status,
    stripeCustomerId: data.stripe_customer_id,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
  };
}

// The plan actually in effect for feature gating. Defaults to Solo's limits
// when there's no subscription yet (never checked out) or it's
// canceled/unpaid — the safest default: neither a hard paywall nor
// unlimited access, just the most restrictive real tier.
export function effectivePlan(subscription: WorkspaceSubscription): PlanId {
  if (!subscription) return "solo";
  if (subscription.status === "canceled" || subscription.status === "unpaid") return "solo";
  return subscription.plan;
}
