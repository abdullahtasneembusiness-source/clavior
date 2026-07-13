import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/supabase/sign-out-action";
import { getWorkspaceForUser } from "@/lib/get-workspace-for-user";
import { getWorkspaceSubscription } from "@/lib/get-workspace-subscription";
import { PLANS } from "@/lib/plans";
import { ManageBillingButton } from "@/components/settings/manage-billing-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const workspace = user ? await getWorkspaceForUser(supabase, user.id) : null;
  const subscription = workspace ? await getWorkspaceSubscription(supabase, workspace.id) : null;

  return (
    <main className="flex flex-1 flex-col px-8 py-8">
      <h1 className="text-xl font-semibold text-white">Settings</h1>

      <div className="card mt-6 flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-white">{user?.email}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace name and team members are coming soon.
          </p>
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
    </main>
  );
}
