import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions, getPublicSupabaseConfig } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/pool/paths";

// Routes that need a signed in user. Pages still check with auth.getUser();
// this only refreshes the session and sends signed out visitors to /login.
const protectedPrefixes = ["/t/", "/welcome", "/settings", "/invite/", "/teams"];

function publicConfig() {
  try {
    return getPublicSupabaseConfig();
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Without settings, pages that use Supabase fail with the helper's explicit
  // error; the proxy should not turn every route into a 500.
  const config = publicConfig();
  if (!config) return response;
  const { url, publishableKey } = config;

  const supabase = createServerClient(process.env.SUPABASE_INTERNAL_URL || url, publishableKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the token with the Auth server and refreshes it if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  if (!user && protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(safeNextPath(pathname + search))}`;
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|api/health).*)"],
};
