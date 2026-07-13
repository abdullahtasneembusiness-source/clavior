"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inviteUserByEmail } from "@/lib/invite-client";
import { getWorkspaceSubscription, effectivePlan } from "@/lib/get-workspace-subscription";
import { PLANS, nextPlan as getNextPlan, type PlanConfig } from "@/lib/plans";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteTeamMemberState =
  | { error: string }
  | { success: true }
  | { limitReached: true; planName: string; teamMemberLimit: number; nextPlan: PlanConfig }
  | null;

export async function inviteTeamMember(
  _prevState: InviteTeamMemberState,
  formData: FormData,
): Promise<InviteTeamMemberState> {
  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "member").trim();

  if (!workspaceId) return { error: "Missing workspace." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (role !== "admin" && role !== "member") return { error: "Invalid role." };

  const supabase = await createClient();

  const subscription = await getWorkspaceSubscription(supabase, workspaceId);
  const plan = effectivePlan(subscription);
  const planConfig = PLANS[plan];

  if (planConfig.teamMemberLimit !== null) {
    const { count } = await supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if ((count ?? 0) >= planConfig.teamMemberLimit) {
      const next = getNextPlan(plan);
      if (next) {
        return {
          limitReached: true,
          planName: planConfig.name,
          teamMemberLimit: planConfig.teamMemberLimit,
          nextPlan: next,
        };
      }
      return { error: `You've reached the ${planConfig.teamMemberLimit}-member limit on the ${planConfig.name} plan.` };
    }
  }

  const { userId, error: inviteError } = await inviteUserByEmail(email, workspaceId, "team_member");
  if (inviteError) return { error: inviteError };
  if (!userId) return { error: "Could not create an account for that email. Please try again." };

  const { error } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role,
  });

  if (error) {
    if (error.code === "23505") return { error: "That person is already on your team." };
    return { error: "Could not add team member. Please try again." };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateTeamMemberRole(workspaceId: string, memberId: string, role: "admin" | "member") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  revalidatePath("/dashboard/settings");
  return { error: error ? "Could not update role." : null };
}

export async function removeTeamMember(workspaceId: string, memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  revalidatePath("/dashboard/settings");
  return { error: error ? "Could not remove team member." : null };
}

export async function assignClientToMember(workspaceId: string, clientId: string, memberId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ assigned_member_id: memberId })
    .eq("id", clientId)
    .eq("workspace_id", workspaceId);

  revalidatePath("/dashboard/settings");
  return { error: error ? "Could not update assignment." : null };
}
