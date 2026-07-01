import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Runs on every route (except static assets) to keep the Supabase session fresh
 * for both customers and staff. It only *gates* the admin panel: unauthenticated
 * users hitting /admin are bounced to /admin/login. Storefront routes just get a
 * refreshed session and pass through. The staff-role check happens in the admin
 * layout (requireStaff), which redirects non-staff (e.g. customers) to
 * /admin/login?error=forbidden — the `error` guard below prevents a redirect loop.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";
    if (!isLogin && !user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(loginUrl);
    }
    // Skip the "already signed in" bounce when a non-staff user was just kicked
    // back here (error=forbidden), so customers don't loop between /admin and login.
    if (isLogin && user && !request.nextUrl.searchParams.get("error")) {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.search = "";
      return NextResponse.redirect(adminUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // All routes except Next internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|ico|txt|xml)$).*)",
  ],
};
