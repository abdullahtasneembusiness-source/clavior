import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceSubscription, effectivePlan } from "@/lib/get-workspace-subscription";
import { PLANS } from "@/lib/plans";
import { ClientInfoPanel } from "@/components/client-detail/client-info-panel";
import { TabsShell } from "@/components/client-detail/tabs-shell";
import type { Client, Message, Video, FileRow } from "@/lib/types";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle<Client>();

  if (!client) notFound();

  const subscription = await getWorkspaceSubscription(supabase, client.workspace_id);
  const aiEnabled = PLANS[effectivePlan(subscription)].aiIntelligence;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", client.workspace_id)
    .maybeSingle();

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", client.workspace_id);

  const participantIds = Array.from(
    new Set(
      [workspace?.owner_id, ...(members ?? []).map((m) => m.user_id), client.user_id].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );

  const [{ data: profiles }, { data: messages }, { data: videos }, { data: files }, { data: note }] =
    await Promise.all([
      participantIds.length > 0
        ? supabase.from("users").select("id, full_name").in("id", participantIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      supabase
        .from("messages")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true })
        .returns<Message[]>(),
      supabase
        .from("videos")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .returns<Video[]>(),
      supabase
        .from("files")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .returns<FileRow[]>(),
      supabase.from("client_notes").select("content, updated_at").eq("client_id", clientId).maybeSingle(),
    ]);

  const senderMap: Record<string, string> = {};
  for (const profile of profiles ?? []) {
    senderMap[profile.id] = profile.full_name || "Unnamed";
  }
  senderMap[client.user_id ?? ""] = senderMap[client.user_id ?? ""] ?? client.name;

  return (
    <main className="flex h-screen gap-6 px-8 py-8">
      <div className="flex h-full w-[60%] flex-col">
        <TabsShell
          clientId={client.id}
          workspaceId={client.workspace_id}
          currentUserId={user.id}
          initialMessages={messages ?? []}
          senderMap={senderMap}
          videos={videos ?? []}
          files={files ?? []}
          initialNoteContent={note?.content ?? ""}
          initialNoteUpdatedAt={note?.updated_at ?? null}
        />
      </div>

      <div className="h-full w-[40%] overflow-y-auto">
        <ClientInfoPanel client={client} aiEnabled={aiEnabled} />
      </div>
    </main>
  );
}
