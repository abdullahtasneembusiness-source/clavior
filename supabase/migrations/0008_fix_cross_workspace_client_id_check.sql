-- Security fix (found via audit): can_access_client_thread() and
-- can_access_client_as_staff() checked permission on the *submitted*
-- target_workspace_id without ever verifying that target_client_id
-- actually belongs to that workspace. Since can_manage_workspace() only
-- checks whether the caller owns/admins target_workspace_id — independent
-- of target_client_id — any workspace owner/admin could pass their OWN
-- workspace_id alongside ANY OTHER workspace's real client_id and pass the
-- check.
--
-- Confirmed exploitable two ways against a local Postgres instance:
--   1. client_notes: an attacker could insert a client_notes row for a
--      victim's client (client_id = victim's, workspace_id = attacker's
--      own). Because client_id is UNIQUE, this permanently blocks the
--      real workspace from ever writing that client's notes — the
--      legitimate owner's insert conflicts on client_id, and the
--      resulting update's USING clause (evaluated against the *existing*
--      row's real workspace_id, which is now the attacker's) correctly
--      blocks them too. A real cross-tenant denial-of-service.
--   2. messages/videos/files: an attacker could insert a row with
--      workspace_id = their own and client_id = a victim's, polluting
--      their own workspace's data with an orphaned reference. The victim
--      never sees it (their SELECT re-evaluates the row's real
--      workspace_id, which isn't theirs), so this is a data-integrity
--      issue rather than a leak or DoS — still wrong, fixed by the same
--      change.
--
-- Fix: both functions now additionally require that a client row exists
-- with id = target_client_id AND workspace_id = target_workspace_id,
-- closing the gap at its root rather than patching each call site.

create or replace function public.can_access_client_thread(target_workspace_id uuid, target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where id = target_client_id and workspace_id = target_workspace_id
  )
  and (
    public.can_manage_workspace(target_workspace_id)
    or (public.workspace_member_role(target_workspace_id) = 'member'
        and public.is_assigned_to_client(target_client_id))
    or public.is_client_self(target_client_id)
  );
$$;

create or replace function public.can_access_client_as_staff(target_workspace_id uuid, target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where id = target_client_id and workspace_id = target_workspace_id
  )
  and (
    public.can_manage_workspace(target_workspace_id)
    or (public.workspace_member_role(target_workspace_id) = 'member'
        and public.is_assigned_to_client(target_client_id))
  );
$$;
