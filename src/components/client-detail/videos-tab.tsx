"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlayIcon, CameraIcon } from "@/components/dashboard/icons";
import { formatDuration, timeAgo } from "@/lib/dashboard-utils";
import { VideoModal } from "./video-modal";
import type { Video } from "@/lib/types";

export function VideosTab({
  clientId,
  videos: initialVideos,
  senderMap,
  onRecordVideo,
}: {
  clientId: string;
  videos: Video[];
  senderMap: Record<string, string>;
  onRecordVideo: () => void;
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [openVideo, setOpenVideo] = useState<Video | null>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const channel = supabase
      .channel(`videos:${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "videos", filter: `client_id=eq.${clientId}` },
        (payload) => {
          const incoming = payload.new as Video;
          setVideos((prev) => (prev.some((v) => v.id === incoming.id) ? prev : [incoming, ...prev]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "videos", filter: `client_id=eq.${clientId}` },
        (payload) => {
          const updated = payload.new as Video;
          setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
          setOpenVideo((current) => (current?.id === updated.id ? updated : current));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, supabase]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="flex items-center justify-end">
        <button
          onClick={onRecordVideo}
          className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <CameraIcon size={16} />
          Record video
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">No videos yet.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4">
          {videos.map((video) => (
            <button
              key={video.id}
              onClick={() => setOpenVideo(video)}
              className="group flex flex-col overflow-hidden rounded-lg border border-border text-left transition-transform hover:-translate-y-0.5"
            >
              <div
                className="relative flex aspect-video items-center justify-center"
                style={{
                  background: video.thumbnail_url
                    ? `center / cover no-repeat url(${video.thumbnail_url})`
                    : "#1E2A3B",
                }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-transform group-hover:scale-110">
                  <PlayIcon />
                </span>
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">
                  {formatDuration(video.duration_seconds)}
                </span>
              </div>
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-medium text-white">
                  {senderMap[video.sender_id] ?? "Someone"}
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo(video.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {openVideo && (
        <VideoModal
          video={openVideo}
          senderName={senderMap[openVideo.sender_id] ?? "Someone"}
          onClose={() => setOpenVideo(null)}
        />
      )}
    </div>
  );
}
