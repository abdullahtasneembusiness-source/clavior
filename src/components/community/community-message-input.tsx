"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { SendIcon, AttachIcon } from "@/components/dashboard/icons";
import { ComingSoonButton } from "@/components/dashboard/coming-soon-button";

export function CommunityMessageInput({ onSend }: { onSend: (content: string) => Promise<void> | void }) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    await onSend(trimmed);
    setSending(false);
    setValue("");
    requestAnimationFrame(autoResize);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-border py-4">
      <ComingSoonButton
        label="Attach a file"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-white"
      >
        <AttachIcon />
      </ComingSoonButton>

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Message the community…"
        className="max-h-40 flex-1 resize-none rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <button
        onClick={submit}
        disabled={!value.trim() || sending}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Send message"
      >
        <SendIcon />
      </button>
    </div>
  );
}
