"use client";

import { useState } from "react";
import { CloseIcon, ChevronIcon } from "@/components/dashboard/icons";
import { formatDate } from "@/lib/dashboard-utils";
import type { Video } from "@/lib/types";

const STATUS_COPY: Record<Video["transcription_status"], string> = {
  pending: "Transcription hasn't started yet.",
  processing: "Transcribing this video now — check back shortly.",
  complete: "",
  failed: "Transcription failed for this video.",
};

export function VideoModal({
  video,
  senderName,
  onClose,
}: {
  video: Video;
  senderName: string;
  onClose: () => void;
}) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const summaryPoints = (video.ai_summary ?? "")
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <div onClick={onClose} className="absolute inset-0 bg-black/70" aria-hidden="true" />

      <div className="card relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">{senderName}</p>
            <p className="text-xs text-muted-foreground">{formatDate(video.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-white"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="overflow-y-auto">
          <video controls autoPlay src={video.storage_url} className="w-full bg-black" style={{ maxHeight: 360 }} />

          <div className="flex flex-col gap-4 p-5">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI Summary</p>
              {video.transcription_status === "complete" && summaryPoints.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {summaryPoints.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm text-white">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {point}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm italic text-muted-foreground">
                  {STATUS_COPY[video.transcription_status]}
                </p>
              )}
            </div>

            {video.transcript && (
              <div className="rounded-lg border border-border">
                <button
                  onClick={() => setTranscriptOpen((v) => !v)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-white"
                >
                  <ChevronIcon open={transcriptOpen} />
                  Full transcript
                </button>
                {transcriptOpen && (
                  <p className="whitespace-pre-wrap border-t border-border px-4 py-3 text-sm text-muted-foreground">
                    {video.transcript}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
