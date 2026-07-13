import { ClientsIcon } from "@/components/dashboard/icons";

export function CommunityTopBar({
  activeClientCount,
  membersPanelOpen,
  onToggleMembers,
}: {
  activeClientCount: number;
  membersPanelOpen: boolean;
  onToggleMembers: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-8 py-5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-white">Community</h1>
        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground" style={{ background: "#1E2A3B" }}>
          {activeClientCount} active
        </span>
      </div>

      <button
        onClick={onToggleMembers}
        className="flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors"
        style={{
          borderColor: membersPanelOpen ? "#3B6FE8" : "#1E2A3B",
          color: membersPanelOpen ? "#3B6FE8" : "#8892A4",
        }}
      >
        <ClientsIcon size={16} />
        Members
      </button>
    </div>
  );
}
