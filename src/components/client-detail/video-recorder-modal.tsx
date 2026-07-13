"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/dashboard/icons";
import { compositeScreenAndCamera } from "@/lib/media-compositor";
import { pickSupportedMimeType, formatTimer, stopAllTracks } from "@/lib/media-recorder-utils";

type Mode = "camera" | "screen" | "both";
type Phase = "setup" | "recording" | "reviewing" | "uploading";

const MODES: { value: Mode; label: string }[] = [
  { value: "camera", label: "Camera only" },
  { value: "screen", label: "Screen only" },
  { value: "both", label: "Camera and Screen" },
];

export function VideoRecorderModal({
  workspaceId,
  clientId,
  onClose,
  onSent,
}: {
  workspaceId: string;
  clientId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [mode, setMode] = useState<Mode>("camera");
  const [phase, setPhase] = useState<Phase>("setup");
  const [streamReady, setStreamReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rawStreamsRef = useRef<MediaStream[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const compositorRef = useRef<{ stop: () => void } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function teardownStreams() {
    compositorRef.current?.stop();
    compositorRef.current = null;
    rawStreamsRef.current.forEach(stopAllTracks);
    rawStreamsRef.current = [];
    recordStreamRef.current = null;
    setStreamReady(false);
  }

  async function setupMode(nextMode: Mode) {
    teardownStreams();
    setPermissionError(null);
    setMode(nextMode);

    try {
      if (nextMode === "camera") {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        rawStreamsRef.current.push(camStream);
        recordStreamRef.current = camStream;
        if (previewVideoRef.current) previewVideoRef.current.srcObject = camStream;
      } else if (nextMode === "screen") {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        rawStreamsRef.current.push(screenStream);
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        rawStreamsRef.current.push(micStream);
        const combined = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...micStream.getAudioTracks(),
        ]);
        recordStreamRef.current = combined;
        if (previewVideoRef.current) previewVideoRef.current.srcObject = screenStream;
        screenStream.getVideoTracks()[0]?.addEventListener("ended", handleScreenShareEnded);
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        rawStreamsRef.current.push(screenStream);
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        rawStreamsRef.current.push(camStream);
        screenStream.getVideoTracks()[0]?.addEventListener("ended", handleScreenShareEnded);

        if (screenVideoRef.current) screenVideoRef.current.srcObject = screenStream;
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = camStream;

        await Promise.all([
          screenVideoRef.current?.play().catch(() => {}),
          cameraVideoRef.current?.play().catch(() => {}),
        ]);

        if (canvasRef.current && screenVideoRef.current && cameraVideoRef.current) {
          compositorRef.current = compositeScreenAndCamera(
            screenVideoRef.current,
            cameraVideoRef.current,
            canvasRef.current,
          );
          const canvasStream = canvasRef.current.captureStream(30);
          recordStreamRef.current = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...camStream.getAudioTracks(),
          ]);
        }
      }

      setStreamReady(true);
    } catch (err) {
      teardownStreams();
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setPermissionError(
          nextMode === "screen"
            ? "Screen sharing was blocked. Click Try again and choose a screen or window to share."
            : "Camera and microphone access was blocked. Allow access in your browser's site settings, then try again.",
        );
      } else if (name === "NotFoundError") {
        setPermissionError("No camera or microphone was found on this device.");
      } else {
        setPermissionError("Couldn't start recording. Please try again.");
      }
    }
  }

  function handleScreenShareEnded() {
    // User clicked the browser's own "Stop sharing" control.
    setPhase((current) => {
      if (current === "recording" && mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      return current === "recording" ? "reviewing" : current;
    });
  }

  useEffect(() => {
    // Acquiring the camera is synchronizing with an external system (the
    // canonical effect use case), not derived UI state — the setState calls
    // inside setupMode/teardownStreams happen after the getUserMedia await
    // or in this mount/unmount lifecycle, not in a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setupMode("camera");
    return () => {
      teardownStreams();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRecording() {
    if (!recordStreamRef.current) return;
    chunksRef.current = [];
    const mimeType = pickSupportedMimeType();
    const recorder = new MediaRecorder(recordStreamRef.current, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      recordedBlobRef.current = blob;
      setRecordedUrl(URL.createObjectURL(blob));
      teardownStreams();
      setPhase("reviewing");
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    setPhase("recording");
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  function reRecord() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    recordedBlobRef.current = null;
    setUploadError(null);
    setPhase("setup");
    setupMode(mode);
  }

  async function send() {
    const blob = recordedBlobRef.current;
    if (!blob) return;
    setPhase("uploading");
    setUploadProgress(0);
    setUploadError(null);

    try {
      const urlRes = await fetch("/api/videos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, clientId, contentType: blob.type.split(";")[0] }),
      });
      if (!urlRes.ok) throw new Error("Could not get an upload URL.");
      const { uploadUrl, publicUrl } = await urlRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", blob.type.split(";")[0]);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed.")));
        xhr.onerror = () => reject(new Error("Upload failed."));
        xhr.send(blob);
      });

      const createRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          clientId,
          storageUrl: publicUrl,
          durationSeconds: elapsedSeconds,
        }),
      });
      if (!createRes.ok) throw new Error("Could not save the video.");
      const { video } = await createRes.json();

      // Fire-and-forget: transcription runs server-side independently so the
      // modal doesn't block on Deepgram + Claude finishing.
      fetch(`/api/videos/${video.id}/transcribe`, { method: "POST" }).catch(() => {});

      onSent();
    } catch {
      setUploadError("Something went wrong sending your video. Please try again.");
      setPhase("reviewing");
    }
  }

  function handleClose() {
    teardownStreams();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <div
        onClick={phase === "uploading" ? undefined : handleClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="card relative flex w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Record a video</h2>
          {phase !== "uploading" && (
            <button onClick={handleClose} className="text-muted-foreground transition-colors hover:text-white" aria-label="Close">
              <CloseIcon />
            </button>
          )}
        </div>

        {phase === "setup" && (
          <div className="flex items-center justify-center gap-2 border-b border-border p-4">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setupMode(m.value)}
                className="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
                style={{
                  background: mode === m.value ? "#3B6FE8" : "transparent",
                  color: mode === m.value ? "#ffffff" : "#8892A4",
                  border: mode === m.value ? "1px solid #3B6FE8" : "1px solid #1E2A3B",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-center justify-center bg-black" style={{ aspectRatio: "16 / 9" }}>
          {/* Hidden compositing sources for "both" mode — never shown directly. */}
          <video ref={screenVideoRef} muted playsInline className="hidden" />
          <video ref={cameraVideoRef} muted playsInline className="hidden" />

          {phase === "setup" && permissionError && (
            <div className="flex max-w-sm flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm text-white">{permissionError}</p>
              <button
                onClick={() => setupMode(mode)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Try again
              </button>
            </div>
          )}

          {/* One persistent preview surface shared by setup + recording — a
              recording-phase-only element reading a setup-phase-only ref
              would read null the instant setup unmounts. */}
          <div
            className="relative h-full w-full"
            style={{ display: phase === "setup" || phase === "recording" ? undefined : "none" }}
          >
            <video
              ref={previewVideoRef}
              autoPlay
              muted
              playsInline
              className={mode === "both" ? "hidden" : "h-full w-full object-cover"}
            />
            <canvas ref={canvasRef} className={mode === "both" ? "h-full w-full object-cover" : "hidden"} />
            {phase === "setup" && !streamReady && !permissionError && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Starting camera…
              </p>
            )}
            {phase === "recording" && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: "#EF4444", animation: "pulse 1.4s ease-in-out infinite" }}
                />
                <span className="text-sm font-medium tabular-nums text-white">{formatTimer(elapsedSeconds)}</span>
              </div>
            )}
          </div>

          {phase === "reviewing" && recordedUrl && (
            <video src={recordedUrl} controls className="h-full w-full object-contain" />
          )}

          {phase === "uploading" && (
            <div className="flex w-full max-w-xs flex-col items-center gap-3 px-6">
              <p className="text-sm text-white">Sending video…</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#1E2A3B" }}>
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs tabular-nums text-muted-foreground">{uploadProgress}%</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 p-5">
          {phase === "setup" && (
            <>
              <button
                onClick={handleClose}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={startRecording}
                disabled={!streamReady}
                className="flex h-12 w-12 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
                style={{ background: "#EF4444" }}
                aria-label="Start recording"
              >
                <span className="h-4 w-4 rounded-full bg-white" />
              </button>
            </>
          )}

          {phase === "recording" && (
            <button
              onClick={stopRecording}
              className="flex h-12 w-12 items-center justify-center rounded-full transition-opacity"
              style={{ background: "#EF4444" }}
              aria-label="Stop recording"
            >
              <span className="h-4 w-4 rounded-sm bg-white" />
            </button>
          )}

          {phase === "reviewing" && (
            <>
              <button
                onClick={reRecord}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                Re-record
              </button>
              <button
                onClick={send}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Send
              </button>
            </>
          )}
        </div>

        {uploadError && (
          <p className="px-5 pb-4 text-center text-sm text-danger" role="alert">
            {uploadError}
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
