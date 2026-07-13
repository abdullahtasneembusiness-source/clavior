import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Workspace } from "@/lib/types";

// A founder owns their workspace; a team member belongs to one via
// workspace_members. Does not resolve a workspace for a client account —
// clients aren't owners or workspace_members, and there's no separate
// client-facing portal yet, so a client hitting a page that uses this
// helper currently has nowhere to land.
export async function getWorkspaceForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Pick<Workspace, "id" | "name" | "owner_id"> | null> {
  const { data: ownedWorkspace } = await supabase
    .from("workspaces")
    .select("id, name, owner_id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (ownedWorkspace) return ownedWorkspace;

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspaces (id, name, owner_id)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle<{ workspaces: Pick<Workspace, "id" | "name" | "owner_id"> }>();

  return membership?.workspaces ?? null;
}
