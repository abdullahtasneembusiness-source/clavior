import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mirrors the can_manage_workspace() Postgres function used throughout RLS
// (owner or admin) — needed here too for app-level checks like "can this
// person manage billing" that happen before any RLS-guarded query runs.
export async function canManageWorkspace(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  ownerId: string,
): Promise<boolean> {
  if (userId === ownerId) return true;

  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  return data?.role === "admin";
}
