-- Private founder/team notes per client, and Realtime wiring for messages.

-- ---------------------------------------------------------------------------
-- client_notes — one row per client. Founder/staff only; no client-self
-- access at all (unlike messages/videos/files, which the client can see).
-- ---------------------------------------------------------------------------
create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

create index client_notes_workspace_id_idx on public.client_notes (workspace_id);

alter table public.client_notes enable row level security;

-- Same staff-scoping as can_access_client_thread, minus the is_client_self
-- branch — this is the one place in the schema a client must never read.
create function public.can_access_client_as_staff(target_workspace_id uuid, target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_workspace(target_workspace_id)
    or (public.workspace_member_role(target_workspace_id) = 'member'
        and public.is_assigned_to_client(target_client_id));
$$;

create policy "client_notes read/write by staff only"
  on public.client_notes for all
  using (public.can_access_client_as_staff(workspace_id, client_id))
  with check (public.can_access_client_as_staff(workspace_id, client_id));

-- ---------------------------------------------------------------------------
-- Realtime — the Messages tab subscribes to postgres_changes on this table.
-- Supabase only streams changes for tables explicitly added to this
-- publication; RLS still applies per-subscriber on top of this.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
