"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inviteUserByEmail } from "@/lib/invite-client";
import { getWorkspaceSubscription, effectivePlan } from "@/lib/get-workspace-subscription";
import { PLANS, nextPlan as getNextPlan, type PlanConfig } from "@/lib/plans";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AddClientState =
  | { error: string }
  | { success: true }
  | { limitReached: true; planName: string; clientLimit: number; nextPlan: PlanConfig }
  | null;

export async function addClient(
  _prevState: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!workspaceId) return { error: "Missing workspace." };
  if (!name) return { error: "Enter a client name." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();

  const subscription = await getWorkspaceSubscription(supabase, workspaceId);
  const plan = effectivePlan(subscription);
  const planConfig = PLANS[plan];

  if (planConfig.clientLimit !== null) {
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if ((count ?? 0) >= planConfig.clientLimit) {
      const next = getNextPlan(plan);
      if (next) {
        return { limitReached: true, planName: planConfig.name, clientLimit: planConfig.clientLimit, nextPlan: next };
      }
      // No next plan exists — shouldn't happen since Studio has no client
      // limit, but fall through to a plain error rather than crash.
      return { error: `You've reached the ${planConfig.clientLimit}-client limit on the ${planConfig.name} plan.` };
    }
  }

  // Invite first so we have their real auth user id to link on the way in —
  // otherwise clients.user_id stays null forever and they can never
  // actually reach their own space once they accept.
  const { userId, error: inviteError } = await inviteUserByEmail(email, workspaceId, "client");
  if (inviteError) return { error: inviteError };

  const { error } = await supabase.from("clients").insert({
    workspace_id: workspaceId,
    name,
    email,
    user_id: userId,
    status: "active",
  });

  if (error) {
    if (error.code === "23505") return { error: "This client already exists in your workspace." };
    return { error: "Could not add client. Please try again." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
