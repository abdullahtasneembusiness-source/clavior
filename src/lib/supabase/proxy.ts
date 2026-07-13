import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Called by external services with no session cookie at all (Stripe's
// servers, Vercel Cron) — each verifies its own caller (signature / bearer
// token) inside the route handler. Redirecting these to /login the way the
// auth logic below does for a normal signed-out browser would silently
// break both: Stripe would get a 307 instead of a 200, and the cron job
// would never run its handler.
const API_BYPASS_PREFIXES = ["/api/stripe/webhook", "/api/cron/"];

// Accessible whether signed in or not, and never redirected away from
// either direction — unlike /login etc. below, an already-subscribed
// founder still needs to reach this page to upgrade. /accept-invite is
// here for a different reason: an invite link's session lives in the URL
// hash, which the server never sees, so on first load the server-side
// check below sees no session yet even though the browser is about to
// establish one — this path can't require server-verified auth up front.
const ALWAYS_ACCESSIBLE_PATHS = ["/pricing", "/accept-invite"];

// Accessible only while signed out; an authenticated visitor is bounced to
// /dashboard instead.
const AUTH_ONLY_PATHS = ["/login", "/signup", "/check-email"];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (API_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run any logic between createServerClient and getUser — it
  // refreshes the auth token and writes the refreshed cookies above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (ALWAYS_ACCESSIBLE_PATHS.includes(pathname)) {
    return response;
  }

  const isAuthOnlyPath = AUTH_ONLY_PATHS.includes(pathname);

  if (!user && !isAuthOnlyPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthOnlyPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
