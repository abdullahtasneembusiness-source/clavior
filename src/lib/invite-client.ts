import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Invites someone by email via Supabase Auth (creates the auth user right
// away — they don't need to "finish signing up" to have a real id, just to
// set a password) and emails them a link to /accept-invite. Returns the new
// user's id so the caller can link it immediately (clients.user_id,
// workspace_members.user_id) instead of leaving the row unlinked and hoping
// something reconciles it later — there was no such reconciliation step
// anywhere in this codebase, so invited people could never actually reach
// their space. inviteType flows through to accept-invite via user metadata
// so it knows whether to route a completed signup into the founder
// dashboard or (for clients — no client portal exists yet) a holding page.
export async function inviteUserByEmail(
  email: string,
  workspaceId: string,
  inviteType: "client" | "team_member",
): Promise<{ userId: string | null; error: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { invited_to_workspace: workspaceId, invited_as: inviteType },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite`,
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { userId: null, error: "That email already has an account. Ask them to check for an earlier invite." };
    }
    return { userId: null, error: error.message };
  }

  return { userId: data.user?.id ?? null, error: null };
}
