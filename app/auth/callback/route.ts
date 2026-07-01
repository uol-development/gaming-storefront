import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * OAuth/email callback. YouTube-style link flow: the email confirmation and
 * password-recovery links land here with a `code`, which we exchange for a
 * session and set on the redirect response. `next` controls where to land
 * (defaults to the account page; recovery links pass /auth/reset).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!code || !url || !anon) {
    return NextResponse.redirect(`${origin}/?auth=error`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/?auth=error`);
  return response;
}
