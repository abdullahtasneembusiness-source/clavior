"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { inviteTeamMember } from "@/lib/team-actions";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";

export function InviteTeamMemberForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, isPending] = useActionState(inviteTeamMember, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state && "limitReached" in state) setUpgradeModalOpen(true);
  }

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending && state && "success" in state) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <>
      <form ref={formRef} action={formAction} className="flex items-end gap-2">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <div className="flex-1">
          <label htmlFor="team-invite-email" className="text-xs font-medium text-muted-foreground">
            Email
          </label>
          <input
            id="team-invite-email"
            name="email"
            type="email"
            placeholder="teammate@example.com"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label htmlFor="team-invite-role" className="text-xs font-medium text-muted-foreground">
            Role
          </label>
          <select
            id="team-invite-role"
            name="role"
            defaultValue="member"
            className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Inviting…" : "Invite"}
        </button>
      </form>

      {state && "error" in state && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state && "success" in state && (
        <p className="mt-2 text-sm text-success" role="status">
          Invitation sent.
        </p>
      )}

      {state && "limitReached" in state && (
        <UpgradeModal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          reason={`You've reached the ${state.teamMemberLimit}-member limit on the ${state.planName} plan.`}
          nextPlan={state.nextPlan}
        />
      )}
    </>
  );
}
