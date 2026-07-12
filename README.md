# Clovior

Client workspace platform for info business founders — messaging, video, and files for every client, in one place.

## Stack

- Next.js 16 (App Router, TypeScript)
- Supabase (auth + database, via `@supabase/ssr`)
- Tailwind CSS v4

## Local setup

```bash
npm install
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# from your Supabase project's Settings > API page
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth flow

- `/login`, `/signup` — public
- `/check-email` — shown after signup if Supabase requires email confirmation
- `/team-onboarding`, `/dashboard` — require a session; unauthenticated
  requests are redirected to `/login` by `src/proxy.ts`

Next.js 16 renamed `middleware.ts` to `proxy.ts` — same job (runs before
each request, refreshes the Supabase session, gates protected routes).
