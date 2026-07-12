-- Slot for the founder-dashboard AI relationship summary shown on the client
-- info panel. Nullable, populated by a future backend job (Claude API, per
-- the "AI intelligence layer" session) — same pattern as videos.ai_summary:
-- the column exists so the UI reads real data, but nothing writes to it yet.
alter table public.clients
  add column ai_relationship_summary text,
  add column ai_relationship_summary_generated_at timestamptz;
