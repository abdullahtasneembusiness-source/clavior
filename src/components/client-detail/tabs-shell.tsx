"use client";

import { useState } from "react";
import { MessagesTab } from "./messages-tab";
import { VideosTab } from "./videos-tab";
import { FilesTab } from "./files-tab";
import { NotesTab } from "./notes-tab";
import type { Message, Video, FileRow } from "@/lib/types";

const TABS = ["Messages", "Videos", "Files", "Notes"] as const;
type Tab = (typeof TABS)[number];

export function TabsShell({
  clientId,
  workspaceId,
  currentUserId,
  initialMessages,
  senderMap,
  videos,
  files,
  initialNoteContent,
  initialNoteUpdatedAt,
}: {
  clientId: string;
  workspaceId: string;
  currentUserId: string;
  initialMessages: Message[];
  senderMap: Record<string, string>;
  videos: Video[];
  files: FileRow[];
  initialNoteContent: string;
  initialNoteUpdatedAt: string | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Messages");

  return (
    <div className="card flex flex-1 flex-col overflow-hidden">
      <div className="flex gap-6 border-b border-border px-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative py-4 text-sm font-medium transition-colors"
            style={{ color: activeTab === tab ? "#ffffff" : "#8892A4" }}
          >
            {tab}
            {activeTab === tab && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "#3B6FE8" }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {activeTab === "Messages" && (
          <MessagesTab
            clientId={clientId}
            workspaceId={workspaceId}
            currentUserId={currentUserId}
            initialMessages={initialMessages}
            senderMap={senderMap}
          />
        )}
        {activeTab === "Videos" && <VideosTab videos={videos} senderMap={senderMap} />}
        {activeTab === "Files" && <FilesTab files={files} senderMap={senderMap} />}
        {activeTab === "Notes" && (
          <NotesTab
            clientId={clientId}
            workspaceId={workspaceId}
            initialContent={initialNoteContent}
            initialUpdatedAt={initialNoteUpdatedAt}
          />
        )}
      </div>
    </div>
  );
}
