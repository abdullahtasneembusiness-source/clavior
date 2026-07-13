-- Pinning for the community channel. Only one message pinned at a time —
-- the app clears any prior pin before setting a new one, matching the "a
-- slim banner" (singular) requirement rather than a full pin list.
alter table public.messages
  add column pinned_at timestamptz;

-- Messages were previously immutable (insert/delete only, per 0002's
-- comment "messages are immutable once sent"). Pinning needs an UPDATE
-- path. Scoped to owner/admin, same authority tier that can already
-- delete any message — this doesn't grant a new capability tier, just a
-- new verb. Note this is row-level, not column-level: RLS can't restrict
-- an UPDATE to touching only pinned_at, so an owner/admin could technically
-- edit message content too. Accepted trade-off for now given they can
-- already delete the row outright; revisit with a trigger if content
-- immutability for staff specifically ever matters.
create policy "messages update by owner or admin"
  on public.messages for update
  using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
