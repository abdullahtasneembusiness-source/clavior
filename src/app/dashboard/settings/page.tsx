import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/supabase/sign-out-action";
import { getWorkspaceForUser } from "@/lib/get-workspace-for-user";
import { getWorkspaceSubscription } from "@/lib/get-workspace-subscription";
import { PLANS } from "@/lib/plans";
import { ManageBillingButton } from "@/components/settings/manage-billing-button";
import { InviteTeamMemberForm } from "@/components/settings/invite-team-member-form";
import { TeamMemberRow } from "@/components/settings/team-member-row";
import { ClientAssignmentRow } from "@/components/settings/client-assignment-row";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const workspace = user ? await getWorkspaceForUser(supabase, user.id) : null;
  const subscription = workspace ? await getWorkspaceSubscription(supabase, workspace.id) : null;

  let canManage = false;
  let members: { id: string; user_id: string; role: "admin" | "member" }[] = [];
  let clients: { id: string; name: string; assigned_member_id: string | null }[] = [];
  const nameById: Record<string, string> = {};
  const emailById: Record<string, string> = {};

  if (workspace) {
    const [{ data: memberRows }, { data: clientRows }] = await Promise.all([
      supabase.from("workspace_members").select("id, user_id, role").eq("workspace_id", workspace.id),
      supabase.from("clients").select("id, name, assigned_member_id").eq("workspace_id", workspace.id).order("name"),
    ]);

    members = (memberRows ?? []) as typeof members;
    clients = clientRows ?? [];

    canManage = user!.id === workspace.owner_id || members.some((m) => m.user_id === user!.id && m.role === "admin");

    const profileIds = Array.from(new Set(members.map((m) => m.user_id)));
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase.from("users").select("id, full_name").in("id", profileIds);
      for (const p of profiles ?? []) nameById[p.id] = p.full_name || "Unnamed";
    }

    // Email isn't on public.users (only auth.users has it, and RLS doesn't
    // expose auth.users to clients) — admin.listUsers is the only way to
    // resolve it for display, so this is best-effort and only attempted
    // for founders/admins who'll actually see this section.
    if (canManage && profileIds.length > 0) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { data: authUsers } = await admin.auth.admin.listUsers();
      for (const u of authUsers.users) {
        if (profileIds.includes(u.id)) emailById[u.id] = u.email ?? "";
      }
    }
  }

  const memberOptions = members.map((m) => ({ userId: m.user_id, name: nameById[m.user_id] ?? "Unnamed" }));

  return (
    <main className="flex flex-1 flex-col px-8 py-8">
      <h1 className="text-xl font-semibold text-white">Settings</h1>

      <div className="card mt-6 flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-white">{user?.email}</p>
          <p className="mt-1 text-sm text-muted-foreground">Workspace name settings are coming soon.</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="card mt-4 flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-white">Billing</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {subscription
              ? `${PLANS[subscription.plan].name} plan — ${subscription.status ?? "unknown status"}`
              : "No active subscription."}
          </p>
        </div>
        {subscription?.stripeCustomerId ? (
          <ManageBillingButton />
        ) : (
          <Link
            href="/pricing"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            View plans
          </Link>
        )}
      </div>

      {workspace && (
        <div className="card mt-4 p-5">
          <p className="text-sm font-medium text-white">Team</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Admins can manage everything. Members only see clients assigned to them.
          </p>

          {canManage && (
            <div className="mt-4">
              <InviteTeamMemberForm workspaceId={workspace.id} />
            </div>
          )}

          <div className="mt-4 flex flex-col divide-y divide-border">
            {members.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No team members yet.</p>
            ) : (
              members.map((m) => (
                <TeamMemberRow
                  key={m.id}
                  workspaceId={workspace.id}
                  memberId={m.id}
                  name={nameById[m.user_id] ?? "Unnamed"}
                  email={emailById[m.user_id] ?? ""}
                  role={m.role}
                  canManage={canManage}
                />
              ))
            )}
          </div>
        </div>
      )}

      {workspace && canManage && members.length > 0 && clients.length > 0 && (
        <div className="card mt-4 p-5">
          <p className="text-sm font-medium text-white">Client assignments</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign each client to a team member so members only see what they&apos;re responsible for.
          </p>

          <div className="mt-4 flex flex-col divide-y divide-border">
            {clients.map((c) => (
              <ClientAssignmentRow
                key={c.id}
                workspaceId={workspace.id}
                clientId={c.id}
                clientName={c.name}
                assignedMemberId={c.assigned_member_id}
                members={memberOptions}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
