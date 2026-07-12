import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { Client, Workspace } from "@/lib/types";

const SEVEN_DAYS_AGO = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // A founder owns their workspace; a team member belongs to one via
  // workspace_members. Try owner first since that's the primary dashboard flow.
  let workspace: Pick<Workspace, "id" | "name"> | null = null;

  const { data: ownedWorkspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (ownedWorkspace) {
    workspace = ownedWorkspace;
  } else {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspaces (id, name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle<{ workspaces: Pick<Workspace, "id" | "name"> }>();

    workspace = membership?.workspaces ?? null;
  }

  if (!workspace) redirect("/onboarding");

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
    />
  );
}
