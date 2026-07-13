"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getPostInviteDestination } from "@/lib/post-invite-destination";

type SessionState = "checking" | "ready" | "missing";
type SubmitState = "idle" | "submitting" | "done";

export default function AcceptInvitePage() {
  const router = useRouter();
  // Not created via useState(() => createClient()) — that initializer runs
  // during React's render phase, which Next.js's build-time page-data
  // collection executes even for this "use client" page, crashing the
  // whole build if Supabase env vars aren't set yet. useEffect never runs
  // during that collection pass (or any SSR pass), so building the client
  // there instead guarantees it only ever happens in a real browser.
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;

    // Supabase's browser client auto-detects the session from the invite
    // link's URL hash on load — it isn't visible to the server at all
    // (hash fragments never get sent in an HTTP request), so this has to
    // be a client-side check, not something proxy.ts or a Server Component
    // could do first.
    let settled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (settled) return;
      if (data.session) {
        settled = true;
        setSessionState("ready");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;
      if (session) {
        settled = true;
        setSessionState("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setSessionState("missing");
      }
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = supabaseRef.current;
    if (!supabase) return;

    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords don't match.");

    setSubmitState("submitting");

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitState("idle");
      setError("Could not set your password. Please try again.");
      return;
    }

    setSubmitState("done");
    const destination = await getPostInviteDestination();
    if (destination === "dashboard") {
      router.push("/dashboard");
    } else {
      setHolding(true);
    }
  }

  if (holding) {
    return (
      <main className="flex min-h-screen flex-1 items-center justify-center px-4">
        <div className="card w-full max-w-sm p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">You&apos;re all set</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your account is ready. A dedicated space for clients to sign in directly isn&apos;t live yet — for now,
            your coach will keep working with you the way you&apos;ve already been set up.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Clovior</h1>
          <p className="mt-2 text-sm text-muted-foreground">Set a password to finish setting up your account.</p>
        </div>

        {sessionState === "checking" && (
          <p className="text-center text-sm text-muted-foreground">Verifying your invite…</p>
        )}

        {sessionState === "missing" && (
          <p className="text-center text-sm text-danger" role="alert">
            This invite link is invalid or has expired. Ask whoever invited you to send a new one.
          </p>
        )}

        {sessionState === "ready" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitState !== "idle"}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitState === "idle" ? "Continue" : "Setting up…"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
