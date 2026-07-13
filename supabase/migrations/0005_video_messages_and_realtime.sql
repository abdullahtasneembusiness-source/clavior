-- Lets a sent video render inline in the Messages tab (per spec: "video
-- appears in Videos tab and as a message in Messages tab") instead of a fake
-- text stub, and puts videos on Realtime so the Videos tab updates live like
-- the Messages tab already does.

alter table public.messages
  add column video_id uuid references public.videos (id) on delete set null;

create index messages_video_id_idx on public.messages (video_id);

alter publication supabase_realtime add table public.videos;
