-- Daily client-maintenance job support.
--
-- engagement_status and testimonial_candidate are deliberately separate from
-- `clients.status` (active/inactive), not new values added to it. `status`
-- is an access-control field — is_active_client_of_workspace() and the
-- community-thread RLS both key off status = 'active' to decide whether a
-- client can reach the community channel at all. If "at risk" or
-- "churning" were stored in that same column, a client who goes quiet for a
-- week would silently lose community access the next time this job runs —
-- an access change nobody asked for, triggered by an engagement signal.
-- engagement_status is purely an informational/dashboard signal; it never
-- gates anything.
alter table public.clients
  add column engagement_status text not null default 'healthy'
    check (engagement_status in ('healthy', 'at_risk', 'churning')),
  add column testimonial_candidate boolean not null default false;

create index clients_engagement_status_idx on public.clients (engagement_status);

-- Run nightly by /api/cron/daily-maintenance. SECURITY DEFINER so it can
-- read/write across every workspace regardless of the caller's RLS
-- visibility — this is a backend job, not something a logged-in user runs
-- as themselves. Execute is revoked from PUBLIC below specifically so that
-- guarantee holds: without it, any authenticated (or anon) API caller could
-- invoke this function directly via PostgREST's RPC endpoint and rewrite
-- engagement status for every workspace's clients, not just their own.
create function public.run_daily_client_maintenance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 7/14-day inactivity thresholds, measured from last_active_at (or
  -- created_at for a client who has never been active at all).
  update public.clients c
  set engagement_status = case
    when coalesce(c.last_active_at, c.created_at) <= now() - interval '14 days' then 'churning'
    when coalesce(c.last_active_at, c.created_at) <= now() - interval '7 days' then 'at_risk'
    else 'healthy'
  end
  where c.status = 'active';

  -- Testimonial candidate: their first-ever file or video (whichever came
  -- first) landed within the last 24 hours. Recomputed unconditionally
  -- every run rather than set-once-and-sticky, so the flag is naturally
  -- true for exactly the one day after the milestone and false again the
  -- day after that — no separate clear step needed.
  with first_touch as (
    select
      c.id as client_id,
      least(
        (select min(f.created_at) from public.files f where f.client_id = c.id),
        (select min(v.created_at) from public.videos v where v.client_id = c.id)
      ) as first_submission_at
    from public.clients c
    where c.status = 'active'
  )
  update public.clients c
  set testimonial_candidate = (
    first_touch.first_submission_at is not null
    and first_touch.first_submission_at >= now() - interval '24 hours'
  )
  from first_touch
  where first_touch.client_id = c.id;
end;
$$;

revoke execute on function public.run_daily_client_maintenance() from public;
