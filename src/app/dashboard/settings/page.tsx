import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/supabase/sign-out-action";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col px-8 py-8">
      <h1 className="text-xl font-semibold text-white">Settings</h1>

      <div className="card mt-6 flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-white">{user?.email}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace name, team members, and billing settings are coming soon.
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
    </main>
  );
}
