-- Row Level Security for Clovior.
--
-- Helper functions are SECURITY DEFINER + STABLE so policies can call them
-- without re-triggering RLS on the tables they read internally (which would
-- either recurse or silently under-return rows), and Postgres can cache the
-- result once per statement instead of re-evaluating per row.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- True if auth.uid() owns this workspace.
create function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces
    where id = target_workspace_id and owner_id = auth.uid()
  );
$$;

-- auth.uid()'s role in this workspace's team ('admin' / 'member'), or null
-- if they aren't on the team at all (owners aren't in workspace_members).
create function public.workspace_member_role(target_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.workspace_members
  where workspace_id = target_workspace_id and user_id = auth.uid()
  limit 1;
$$;

-- True if auth.uid() can manage everything in the workspace: owner or admin.
create function public.can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_workspace_owner(target_workspace_id)
    or public.workspace_member_role(target_workspace_id) = 'admin';
$$;

-- True if auth.uid() is this client's assigned team member.
create function public.is_assigned_to_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where id = target_client_id and assigned_member_id = auth.uid()
  );
$$;

-- True if auth.uid() is the client's own logged-in account.
create function public.is_client_self(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where id = target_client_id and user_id = auth.uid()
  );
$$;

-- True if auth.uid() is an active client inside this workspace (used to gate
-- community messages/videos — anyone whose account is inactive loses access).
create function public.is_active_client_of_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

-- True if auth.uid() may read/write in this client's thread at all:
-- workspace owner/admin, the client's assigned member, or the client
-- themself. Used by messages/videos/files to keep the per-client rules in
-- one place instead of repeating them in every table's policies.
create function public.can_access_client_thread(target_workspace_id uuid, target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_workspace(target_workspace_id)
    or (public.workspace_member_role(target_workspace_id) = 'member'
        and public.is_assigned_to_client(target_client_id))
    or public.is_client_self(target_client_id);
$$;

-- True if auth.uid() may read/write the community (client_id is null) thread:
-- any workspace staff, or any active client in the workspace.
create function public.can_access_community_thread(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_workspace(target_workspace_id)
    or public.workspace_member_role(target_workspace_id) = 'member'
    or public.is_active_client_of_workspace(target_workspace_id);
$$;

-- True if auth.uid() shares any workspace with target_user_id, as owner,
-- team member, or client. Backs the users table's select policy so
-- profiles are visible to people who need to see a name/avatar (a message
-- sender, a client card) but nobody else.
create function public.shares_workspace_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select id as workspace_id from public.workspaces where owner_id = auth.uid()
    union
    select workspace_id from public.workspace_members where user_id = auth.uid()
    union
    select workspace_id from public.clients where user_id = auth.uid()
  ),
  theirs as (
    select id as workspace_id from public.workspaces where owner_id = target_user_id
    union
    select workspace_id from public.workspace_members where user_id = target_user_id
    union
    select workspace_id from public.clients where user_id = target_user_id
  )
  select exists (
    select 1 from mine join theirs using (workspace_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.clients enable row level security;
alter table public.messages enable row level security;
alter table public.videos enable row level security;
alter table public.files enable row level security;
alter table public.subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create policy "users read own or shared-workspace profiles"
  on public.users for select
  using (id = auth.uid() or public.shares_workspace_with(id));

create policy "users update own profile"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert policy: rows are created exclusively by the on_auth_user_created
-- trigger, which runs as SECURITY DEFINER and bypasses RLS.

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
create policy "workspaces read if participant"
  on public.workspaces for select
  using (
    owner_id = auth.uid()
    or public.workspace_member_role(id) is not null
    or public.is_active_client_of_workspace(id)
  );

create policy "workspaces insert own"
  on public.workspaces for insert
  with check (owner_id = auth.uid());

create policy "workspaces update by owner or admin"
  on public.workspaces for update
  using (public.can_manage_workspace(id))
  with check (public.can_manage_workspace(id));

create policy "workspaces delete by owner only"
  on public.workspaces for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- workspace_members
-- ---------------------------------------------------------------------------
create policy "workspace_members read by team"
  on public.workspace_members for select
  using (
    public.is_workspace_owner(workspace_id)
    or public.workspace_member_role(workspace_id) is not null
  );

create policy "workspace_members write by owner or admin"
  on public.workspace_members for all
  using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create policy "clients read by staff or self"
  on public.clients for select
  using (
    public.can_manage_workspace(workspace_id)
    or (public.workspace_member_role(workspace_id) = 'member' and assigned_member_id = auth.uid())
    or user_id = auth.uid()
  );

create policy "clients insert by owner or admin"
  on public.clients for insert
  with check (public.can_manage_workspace(workspace_id));

create policy "clients update by owner, admin, or assigned member"
  on public.clients for update
  using (
    public.can_manage_workspace(workspace_id)
    or (public.workspace_member_role(workspace_id) = 'member' and assigned_member_id = auth.uid())
  )
  with check (
    public.can_manage_workspace(workspace_id)
    or (public.workspace_member_role(workspace_id) = 'member' and assigned_member_id = auth.uid())
  );

create policy "clients delete by owner or admin"
  on public.clients for delete
  using (public.can_manage_workspace(workspace_id));

-- Clients intentionally have no self-update policy: the client's own account
-- can read its client row but edits its profile (name, avatar) through the
-- `users` table, not by rewriting `clients` fields like status or
-- assigned_member_id.

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create policy "messages read within accessible thread"
  on public.messages for select
  using (
    case
      when client_id is null then public.can_access_community_thread(workspace_id)
      else public.can_access_client_thread(workspace_id, client_id)
    end
  );

create policy "messages insert into accessible thread"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (
      case
        when client_id is null then public.can_access_community_thread(workspace_id)
        else public.can_access_client_thread(workspace_id, client_id)
      end
    )
  );

create policy "messages delete by owner or admin"
  on public.messages for delete
  using (public.can_manage_workspace(workspace_id));

-- No update policy: messages are immutable once sent (no edit-message
-- feature yet). Founders/admins can still delete via the policy above.

-- ---------------------------------------------------------------------------
-- videos (same shape as messages)
-- ---------------------------------------------------------------------------
create policy "videos read within accessible thread"
  on public.videos for select
  using (
    case
      when client_id is null then public.can_access_community_thread(workspace_id)
      else public.can_access_client_thread(workspace_id, client_id)
    end
  );

create policy "videos insert into accessible thread"
  on public.videos for insert
  with check (
    sender_id = auth.uid()
    and (
      case
        when client_id is null then public.can_access_community_thread(workspace_id)
        else public.can_access_client_thread(workspace_id, client_id)
      end
    )
  );

create policy "videos delete by owner or admin"
  on public.videos for delete
  using (public.can_manage_workspace(workspace_id));

-- No user-facing update policy. transcript / ai_summary / transcription_status
-- are written by the transcription backend job using the service role key,
-- which bypasses RLS entirely — never by a logged-in user's session.

-- ---------------------------------------------------------------------------
-- files (same shape as messages)
-- ---------------------------------------------------------------------------
create policy "files read within accessible thread"
  on public.files for select
  using (
    case
      when client_id is null then public.can_access_community_thread(workspace_id)
      else public.can_access_client_thread(workspace_id, client_id)
    end
  );

create policy "files insert into accessible thread"
  on public.files for insert
  with check (
    uploader_id = auth.uid()
    and (
      case
        when client_id is null then public.can_access_community_thread(workspace_id)
        else public.can_access_client_thread(workspace_id, client_id)
      end
    )
  );

create policy "files delete by uploader, owner, or admin"
  on public.files for delete
  using (uploader_id = auth.uid() or public.can_manage_workspace(workspace_id));

-- ---------------------------------------------------------------------------
-- subscriptions — read-only to users, on purpose.
-- ---------------------------------------------------------------------------
create policy "subscriptions read by owner or admin"
  on public.subscriptions for select
  using (public.can_manage_workspace(workspace_id));

-- No insert/update/delete policy for any authenticated user. The Stripe
-- webhook handler writes this table with the service role key, which
-- bypasses RLS — that's the only way this table should ever be written.
