"use client";

import { useActionState, useEffect, useRef } from "react";
import { addClient } from "@/lib/client-actions";
import { CloseIcon } from "./icons";

export function AddClientPanel({
  workspaceId,
  open,
  onClose,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(addClient, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && state && "success" in state) {
      formRef.current?.reset();
      onClose();
    }
    wasPending.current = isPending;
  }, [isPending, state, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        aria-hidden="true"
      />

      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border p-6 shadow-2xl transition-transform duration-200"
        style={{
          background: "#0D1321",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add client</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-white"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          They&apos;ll receive an invitation email to join your workspace.
        </p>

        <form ref={formRef} action={formAction} className="mt-8 flex flex-1 flex-col gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-client-name" className="text-sm font-medium text-white">
              Name
            </label>
            <input
              id="add-client-name"
              name="name"
              type="text"
              placeholder="Sarah Johnson"
              className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-client-email" className="text-sm font-medium text-white">
              Email
            </label>
            <input
              id="add-client-email"
              name="email"
              type="email"
              placeholder="sarah@example.com"
              className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {state && "error" in state && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}

          <div className="mt-auto flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Sending…" : "Invite"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
