"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CommunityTopBar } from "./community-top-bar";
import { PinnedBanner } from "./pinned-banner";
import { CommunityMessageList } from "./community-message-list";
import { CommunityMessageInput } from "./community-message-input";
import { MembersPanel } from "./members-panel";
import type { Client, Message } from "@/lib/types";
import type { Person } from "@/app/dashboard/community/page";

export function CommunityContent({
  workspaceId,
  currentUserId,
  canModerate,
  founderId,
  staff,
  clients,
  senderMap,
  initialMessages,
  initialPinnedMessageId,
}: {
  workspaceId: string;
  currentUserId: string;
  canModerate: boolean;
  founderId: string;
  staff: Person[];
  clients: Client[];
  senderMap: Record<string, string>;
  initialMessages: Message[];
  initialPinnedMessageId: string | null;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [pinnedMessageId, setPinnedMessageId] = useState(initialPinnedMessageId);
  const [membersPanelOpen, setMembersPanelOpen] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const channel = supabase.channel(`community:${workspaceId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const incoming = payload.new as Message;
          if (incoming.client_id !== null) return; // 1:1 thread — not community
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const updated = payload.new as Message;
          if (updated.client_id !== null) return;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          setPinnedMessageId(updated.pinned_at ? updated.id : (current) => (current === updated.id ? null : current));
        },
      )
      .on("presence", { event: "sync" }, () => {
        setOnlineUserIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, currentUserId, supabase]);

  const pinnedMessage = messages.find((m) => m.id === pinnedMessageId) ?? null;

  async function pinMessage(messageId: string) {
    // Only one pin at a time — clear any existing pin first.
    if (pinnedMessageId && pinnedMessageId !== messageId) {
      await supabase.from("messages").update({ pinned_at: null }).eq("id", pinnedMessageId);
    }
    await supabase.from("messages").update({ pinned_at: new Date().toISOString() }).eq("id", messageId);
  }

  async function unpinMessage(messageId: string) {
    await supabase.from("messages").update({ pinned_at: null }).eq("id", messageId);
  }

  async function sendMessage(content: string) {
    await supabase.from("messages").insert({
      workspace_id: workspaceId,
      client_id: null,
      sender_id: currentUserId,
      content,
    });
  }

  return (
    <div className="flex h-screen flex-1 flex-col">
      <CommunityTopBar
        activeClientCount={clients.length}
        membersPanelOpen={membersPanelOpen}
        onToggleMembers={() => setMembersPanelOpen((v) => !v)}
      />

      {pinnedMessage && (
        <PinnedBanner
          message={pinnedMessage}
          senderName={senderMap[pinnedMessage.sender_id] ?? "Someone"}
          canModerate={canModerate}
          onUnpin={() => unpinMessage(pinnedMessage.id)}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden px-8">
        <CommunityMessageList
          messages={messages}
          senderMap={senderMap}
          founderId={founderId}
          currentUserId={currentUserId}
          canModerate={canModerate}
          pinnedMessageId={pinnedMessageId}
          onPin={pinMessage}
        />
        <CommunityMessageInput onSend={sendMessage} />
      </div>

      <MembersPanel
        open={membersPanelOpen}
        onClose={() => setMembersPanelOpen(false)}
        staff={staff}
        clients={clients}
        onlineUserIds={onlineUserIds}
      />
    </div>
  );
}
