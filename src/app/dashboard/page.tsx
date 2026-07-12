import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/supabase/sign-out-action";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-1 flex-col px-8 py-10">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Clovior</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user?.email}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="card mt-8 flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Your client workspace grid will live here.
        </p>
      </div>
    </main>
  );
}
