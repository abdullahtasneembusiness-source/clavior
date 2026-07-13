"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileIcon, DownloadIcon, UploadIcon } from "@/components/dashboard/icons";
import { formatFileSize, formatDate } from "@/lib/dashboard-utils";
import type { FileRow } from "@/lib/types";

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

function uploadToR2(url: string, fields: Record<string, string>, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed.")));
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(formData);
  });
}

export function FilesTab({
  workspaceId,
  clientId,
  files: initialFiles,
  senderMap,
}: {
  workspaceId: string;
  clientId: string;
  files: FileRow[];
  senderMap: Record<string, string>;
}) {
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`${file.name} is over the 100MB limit.`);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const urlRes = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, clientId, fileName: file.name, fileType: file.type || "application/octet-stream" }),
      });
      if (!urlRes.ok) throw new Error();
      const { url, fields, publicUrl } = await urlRes.json();

      await uploadToR2(url, fields, file, setUploadProgress);

      const createRes = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          clientId,
          storageUrl: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "application/octet-stream",
        }),
      });
      if (!createRes.ok) throw new Error();
      const { file: savedFile } = await createRes.json();

      setFiles((prev) => [savedFile, ...prev]);
    } catch {
      setError("Something went wrong uploading that file. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <input ref={inputRef} type="file" className="hidden" onChange={handleFileInputChange} />

      <div className="flex items-center justify-end">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UploadIcon size={16} />
          {uploading ? `Uploading… ${uploadProgress}%` : "Upload"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-1 flex-col">
        {files.length === 0 ? (
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
            <p className="mt-1 text-sm text-muted-foreground">or click Upload above to browse — up to 100MB</p>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border-2 transition-colors"
            style={{ borderColor: dragOver ? "#3B6FE8" : "#1E2A3B", borderStyle: dragOver ? "dashed" : "solid" }}
          >
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
