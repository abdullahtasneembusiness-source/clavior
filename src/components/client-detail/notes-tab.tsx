"use client";

import { useEffect, useRef, useState } from "react";
import { BoldIcon, ItalicIcon, ListIcon } from "@/components/dashboard/icons";
import { saveClientNotes } from "@/lib/notes-actions";
import { timeAgo } from "@/lib/dashboard-utils";

const AUTOSAVE_INTERVAL_MS = 30_000;

export function NotesTab({
  clientId,
  workspaceId,
  initialContent,
  initialUpdatedAt,
}: {
  clientId: string;
  workspaceId: string;
  initialContent: string;
  initialUpdatedAt: string | null;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastSavedContentRef = useRef(initialContent);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialContent;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveIfChanged() {
    const current = editorRef.current?.innerHTML ?? "";
    if (current === lastSavedContentRef.current) return;

    setSaving(true);
    const { error } = await saveClientNotes(clientId, workspaceId, current);
    setSaving(false);
    if (!error) {
      lastSavedContentRef.current = current;
      setLastSavedAt(new Date().toISOString());
    }
  }

  useEffect(() => {
    const interval = setInterval(saveIfChanged, AUTOSAVE_INTERVAL_MS);
    // Re-render every 30s too, so "last saved" stays roughly fresh even
    // when nothing changes and no save fires.
    const tick = setInterval(() => forceTick((n) => n + 1), AUTOSAVE_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      clearInterval(tick);
      saveIfChanged();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  function exec(command: "bold" | "italic" | "insertUnorderedList") {
    editorRef.current?.focus();
    document.execCommand(command);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => exec("bold")}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-white"
            aria-label="Bold"
            type="button"
          >
            <BoldIcon />
          </button>
          <button
            onClick={() => exec("italic")}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-white"
            aria-label="Italic"
            type="button"
          >
            <ItalicIcon />
          </button>
          <button
            onClick={() => exec("insertUnorderedList")}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-white"
            aria-label="Bulleted list"
            type="button"
          >
            <ListIcon />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {saving ? "Saving…" : lastSavedAt ? `Saved ${timeAgo(lastSavedAt)}` : "Not saved yet"}
        </p>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="notes-editor flex-1 overflow-y-auto px-6 py-5 text-sm text-white focus:outline-none"
        data-placeholder="Private notes about this client — only you and your team can see this."
      />
    </div>
  );
}
