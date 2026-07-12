import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for privileged server-only operations (sending
// invites via supabase.auth.admin.*). Never import this into anything that
// runs in the browser — the service role key bypasses RLS entirely.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
