"use client";

import { useMemo, useState } from "react";
import { MessagesTab } from "./messages-tab";
import { VideosTab } from "./videos-tab";
import { FilesTab } from "./files-tab";
import { NotesTab } from "./notes-tab";
import { VideoRecorderModal } from "./video-recorder-modal";
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
  const [recorderOpen, setRecorderOpen] = useState(false);

  const videosById = useMemo(() => {
    const map: Record<string, Video> = {};
    for (const video of videos) map[video.id] = video;
    return map;
  }, [videos]);

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
            initialVideosById={videosById}
            onRecordVideo={() => setRecorderOpen(true)}
          />
        )}
        {activeTab === "Videos" && (
          <VideosTab
            clientId={clientId}
            videos={videos}
            senderMap={senderMap}
            onRecordVideo={() => setRecorderOpen(true)}
          />
        )}
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

      {recorderOpen && (
        <VideoRecorderModal
          workspaceId={workspaceId}
          clientId={clientId}
          onClose={() => setRecorderOpen(false)}
          onSent={() => setRecorderOpen(false)}
        />
      )}
    </div>
  );
}
