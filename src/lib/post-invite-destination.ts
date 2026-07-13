"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceForUser } from "@/lib/get-workspace-for-user";

// After an invited person sets their password, where do they go? Founders
// and team members land on the real dashboard. Clients don't have anywhere
// to land yet — there's no client-facing portal built (a separate,
// substantially larger piece of work than this invite flow) — so route
// them to an honest holding message instead of silently misrouting them
// into founder onboarding, which is what happened before this existed.
export async function getPostInviteDestination(): Promise<"dashboard" | "no-portal-yet"> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "no-portal-yet";

  const workspace = await getWorkspaceForUser(supabase, user.id);
  return workspace ? "dashboard" : "no-portal-yet";
}
