import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceForUser } from "@/lib/get-workspace-for-user";
import { getWorkspaceSubscription, effectivePlan } from "@/lib/get-workspace-subscription";
import { PLANS, nextPlan as getNextPlan } from "@/lib/plans";
import { CommunityContent } from "@/components/community/community-content";
import { CommunityPlanGate } from "@/components/community/community-plan-gate";
import type { Client, Message } from "@/lib/types";

export type StaffRole = "owner" | "admin" | "member";
export type Person = { id: string; name: string; role: StaffRole };

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceForUser(supabase, user.id);
  if (!workspace) redirect("/onboarding");

  const subscription = await getWorkspaceSubscription(supabase, workspace.id);
  const plan = effectivePlan(subscription);
  const planConfig = PLANS[plan];

  if (!planConfig.communityChat) {
    const next = getNextPlan(plan);
    if (next) {
      return <CommunityPlanGate currentPlanName={planConfig.name} nextPlan={next} />;
    }
  }

  const [{ data: members }, { data: activeClients }, { data: messages }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspace.id),
    supabase
      .from("clients")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("status", "active")
      .order("name")
      .returns<Client[]>(),
    supabase
      .from("messages")
      .select("*")
      .eq("workspace_id", workspace.id)
      .is("client_id", null)
      .order("created_at", { ascending: true })
      .limit(300)
      .returns<Message[]>(),
  ]);

  const memberList = members ?? [];
  const clientList = activeClients ?? [];

  const staffIds = Array.from(new Set([workspace.owner_id, ...memberList.map((m) => m.user_id)]));
  const clientUserIds = clientList.map((c) => c.user_id).filter((id): id is string => Boolean(id));
  const allProfileIds = Array.from(new Set([...staffIds, ...clientUserIds]));

  const { data: profiles } =
    allProfileIds.length > 0
      ? await supabase.from("users").select("id, full_name").in("id", allProfileIds)
      : { data: [] as { id: string; full_name: string | null }[] };

  const nameById: Record<string, string> = {};
  for (const profile of profiles ?? []) nameById[profile.id] = profile.full_name || "Unnamed";

  const roleByUserId: Record<string, StaffRole> = { [workspace.owner_id]: "owner" };
  for (const m of memberList) roleByUserId[m.user_id] = m.role as StaffRole;

  const staff: Person[] = staffIds.map((id) => ({
    id,
    name: nameById[id] ?? "Unnamed",
    role: roleByUserId[id] ?? "member",
  }));

  const senderMap: Record<string, string> = { ...nameById };
  for (const client of clientList) {
    if (client.user_id) senderMap[client.user_id] = client.name;
  }

  const canModerate = user.id === workspace.owner_id || roleByUserId[user.id] === "admin";

  const messageList = messages ?? [];

  const pinnedMessage = messageList
    .filter((m) => m.pinned_at)
    .sort((a, b) => new Date(b.pinned_at!).getTime() - new Date(a.pinned_at!).getTime())[0];

  return (
    <CommunityContent
      workspaceId={workspace.id}
      currentUserId={user.id}
      canModerate={canModerate}
      founderId={workspace.owner_id}
      staff={staff}
      clients={clientList}
      senderMap={senderMap}
      initialMessages={messageList}
      initialPinnedMessageId={pinnedMessage?.id ?? null}
    />
  );
}
