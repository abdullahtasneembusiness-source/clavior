-- Clovior core schema.
-- Run in the Supabase SQL editor, or via `supabase db push`, against a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users — one row per auth.users row, holds app-facing profile fields.
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a public.users row whenever someone signs up via Supabase Auth,
-- so every other table's `references users(id)` has something to point at
-- immediately after signup. Runs as SECURITY DEFINER so it isn't blocked by RLS.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- workspaces — one per founder.
-- ---------------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create index workspaces_owner_id_idx on public.workspaces (owner_id);

-- ---------------------------------------------------------------------------
-- workspace_members — team members a founder has invited in.
-- ---------------------------------------------------------------------------
create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index workspace_members_workspace_id_idx on public.workspace_members (workspace_id);
create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- clients — the founder's clients, i.e. Clovior's paying customer's customers.
--
-- assigned_member_id is not in the original spec — it's added so the RLS rule
-- "team members with role=member can only access assigned clients" has
-- something to check against. Without it there is no way to know which
-- clients a given member is allowed to see. One member per client for now;
-- revisit as a many-to-many join table if multiple members ever need to
-- share a single client.
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  assigned_member_id uuid references public.users (id) on delete set null,
  name text not null,
  email text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  last_active_at timestamptz,
  created_at timestamptz not null default now()
);

create index clients_workspace_id_idx on public.clients (workspace_id);
create index clients_user_id_idx on public.clients (user_id);
create index clients_assigned_member_id_idx on public.clients (assigned_member_id);

-- ---------------------------------------------------------------------------
-- messages — real-time chat. client_id null = workspace-wide community message.
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete restrict,
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_workspace_id_idx on public.messages (workspace_id);
create index messages_client_id_idx on public.messages (client_id);
create index messages_created_at_idx on public.messages (created_at);

-- ---------------------------------------------------------------------------
-- videos — async video messages, transcribed and summarised by a backend job.
-- ---------------------------------------------------------------------------
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete restrict,
  storage_url text not null,
  thumbnail_url text,
  duration_seconds integer,
  transcript text,
  ai_summary text,
  transcription_status text not null default 'pending'
    check (transcription_status in ('pending', 'processing', 'complete', 'failed')),
  created_at timestamptz not null default now()
);

create index videos_workspace_id_idx on public.videos (workspace_id);
create index videos_client_id_idx on public.videos (client_id);

-- ---------------------------------------------------------------------------
-- files — shared files.
-- ---------------------------------------------------------------------------
create table public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  uploader_id uuid not null references public.users (id) on delete restrict,
  file_name text not null,
  file_size bigint not null,
  file_type text not null,
  storage_url text not null,
  created_at timestamptz not null default now()
);

create index files_workspace_id_idx on public.files (workspace_id);
create index files_client_id_idx on public.files (client_id);

-- ---------------------------------------------------------------------------
-- subscriptions — one row per workspace, written only by the Stripe webhook
-- handler using the service role key (see RLS migration — no user-facing
-- write policies exist for this table on purpose).
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text check (plan in ('solo', 'team', 'studio')),
  status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz
);
