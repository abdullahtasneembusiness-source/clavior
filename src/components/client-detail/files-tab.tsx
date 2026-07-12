"use client";

import { useState, type DragEvent } from "react";
import { FileIcon, DownloadIcon, UploadIcon } from "@/components/dashboard/icons";
import { ComingSoonButton } from "@/components/dashboard/coming-soon-button";
import { formatFileSize, formatDate } from "@/lib/dashboard-utils";
import type { FileRow } from "@/lib/types";

function DropZone() {
  const [dragOver, setDragOver] = useState(false);
  const [showNotice, setShowNotice] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    setShowNotice(true);
    setTimeout(() => setShowNotice(false), 2000);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className="flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center transition-colors"
      style={{ borderColor: dragOver ? "#3B6FE8" : "#1E2A3B" }}
    >
      <UploadIcon size={28} className="text-muted-foreground" />
      <p className="mt-4 text-sm font-medium text-white">Drag and drop files here</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {showNotice ? "File uploads are coming soon." : "or click Upload above to browse"}
      </p>
    </div>
  );
}

export function FilesTab({
  files,
  senderMap,
}: {
  files: FileRow[];
  senderMap: Record<string, string>;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="flex items-center justify-end">
        <ComingSoonButton
          label="Upload a file"
          className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <UploadIcon size={16} />
          Upload
        </ComingSoonButton>
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        {files.length === 0 ? (
          <DropZone />
        ) : (
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                <FileIcon className="shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)} · {formatDate(file.created_at)} ·{" "}
                    {senderMap[file.uploader_id] ?? "Someone"}
                  </p>
                </div>
                <a
                  href={file.storage_url}
                  download
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-white"
                  aria-label={`Download ${file.file_name}`}
                >
                  <DownloadIcon />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
