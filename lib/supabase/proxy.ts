import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MFA_GUARDED, mfaRedirect } from "@/lib/auth/mfa";
import { sessionOwesSecondFactor } from "@/lib/auth/two-factor-check";

// Routes that require a session. Everything else is public.
const PROTECTED = ["/dashboard", "/tools", "/score", "/settings", "/onboard"];

export async function updateSession(request: NextRequest) {
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

  // IMPORTANT: getUser() revalidates the token, do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Two-factor, enforced here rather than in the browser: a student who has
  // turned it on cannot reach a protected page or API until this sign-in has
  // entered the code we emailed. Only guarded paths ask, and only students with
  // two-factor on cost a database call (see lib/auth/two-factor-check.ts).
  if (user && MFA_GUARDED.some((p) => path === p || path.startsWith(p + "/"))) {
    const to = mfaRedirect(path, await sessionOwesSecondFactor(supabase));
    if (to) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Two-factor code required." }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      const [pathname, query] = to.split("?");
      url.pathname = pathname;
      url.search = query ? `?${query}` : "";
      return NextResponse.redirect(url);
    }
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
