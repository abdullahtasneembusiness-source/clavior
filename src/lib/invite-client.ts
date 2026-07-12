import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Invites a client by email via Supabase Auth (creates the auth user and
// emails them a signup link). Uses the service-role admin client because
// auth.admin.* methods are not available on a regular session-scoped client.
export async function inviteClientByEmail(email: string, workspaceId: string) {
  const admin = createAdminClient();
  return admin.auth.admin.inviteUserByEmail(email, {
    data: { invited_to_workspace: workspaceId, invited_as: "client" },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite`,
  });
}
