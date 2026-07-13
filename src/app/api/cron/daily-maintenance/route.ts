import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron Jobs send GET requests, and — when CRON_SECRET is set on the
// project — an `Authorization: Bearer <CRON_SECRET>` header automatically.
// Checking that header is Vercel's documented way to keep a cron route from
// being a public "reset every client's engagement status" endpoint.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("run_daily_client_maintenance");

  if (error) {
    console.error("daily-maintenance RPC failed:", error);
    return NextResponse.json({ error: "Maintenance run failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}
