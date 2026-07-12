import { PlusIcon } from "./icons";

export function EmptyState({ onAddClient }: { onAddClient: () => void }) {
  return (
    <div className="card flex flex-col items-center justify-center px-8 py-20 text-center">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <rect x="10" y="10" width="52" height="52" rx="14" fill="#1E2A3B" />
        <circle cx="36" cy="30" r="9" fill="#0A0F1E" />
        <path d="M20 54c0-9 7.2-16 16-16s16 7 16 16" fill="#0A0F1E" />
      </svg>

      <h2 className="mt-6 text-lg font-semibold text-white">Add your first client</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Once you add a client, their workspace, messages, and files will show up here.
      </p>

      <button
        onClick={onAddClient}
        className="mt-6 flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        <PlusIcon />
        Add client
      </button>
    </div>
  );
}
