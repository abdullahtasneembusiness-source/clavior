import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceForUser } from "@/lib/get-workspace-for-user";
import { getWorkspaceSubscription } from "@/lib/get-workspace-subscription";
import { daysUntil } from "@/lib/dashboard-utils";
import { PLANS } from "@/lib/plans";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { Client } from "@/lib/types";

const SEVEN_DAYS_AGO = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceForUser(supabase, user.id);
  if (!workspace) redirect("/onboarding");

  const subscription = await getWorkspaceSubscription(supabase, workspace.id);
  let trialInfo: { daysRemaining: number; planName: keyof typeof PLANS } | null = null;
  if (subscription?.status === "trialing" && subscription.trialEndsAt) {
    const daysRemaining = daysUntil(subscription.trialEndsAt);
    if (daysRemaining > 0) trialInfo = { daysRemaining, planName: subscription.plan };
  }

  const [{ data: clients }, { data: recentMessages }, { count: messagesThisWeekCount }] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("last_active_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("messages")
      .select("client_id, content, created_at")
      .eq("workspace_id", workspace.id)
      .not("client_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .gte("created_at", SEVEN_DAYS_AGO()),
  ]);

  const clientList: Client[] = clients ?? [];

  const lastMessageByClientId: Record<string, string> = {};
  for (const message of recentMessages ?? []) {
    if (message.client_id && !(message.client_id in lastMessageByClientId)) {
      lastMessageByClientId[message.client_id] = message.content;
    }
  }

  const activeThisWeek = clientList.filter(
    (c) => c.last_active_at && new Date(c.last_active_at) >= new Date(SEVEN_DAYS_AGO()),
  ).length;

  return (
    <DashboardContent
      workspaceId={workspace.id}
      clients={clientList}
      lastMessageByClientId={lastMessageByClientId}
      stats={{
        totalClients: clientList.length,
        activeThisWeek,
        messagesThisWeek: messagesThisWeekCount ?? 0,
      }}
      trial={trialInfo ? { daysRemaining: trialInfo.daysRemaining, plan: PLANS[trialInfo.planName] } : null}
    />
  );
}
