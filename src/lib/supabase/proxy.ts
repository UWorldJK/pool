import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions, getPublicSupabaseConfig } from "./config";
import { verifiedUser } from "../auth/identity";
import { appReturnPath } from "../auth/paths";
import { privateAuthHeaders } from "../auth/cache";

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getPublicSupabaseConfig();
  let response = NextResponse.next({ request });
  const client = createServerClient(
    process.env.SUPABASE_INTERNAL_URL || url,
    publishableKey,
    {
      cookieOptions: authCookieOptions,
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          // Forward new tokens to this render as well as the browser. Preserve
          // every cookie/header even if the SDK calls setAll more than once.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          const previous = response;
          response = NextResponse.next({ request });
          previous.cookies
            .getAll()
            .forEach((cookie) => response.cookies.set(cookie));
          previous.headers.forEach((value, name) => {
            if (!name.startsWith("x-middleware-") && name !== "set-cookie")
              response.headers.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );
  const user = await verifiedUser(client);
  if (
    !user &&
    (request.nextUrl.pathname === "/app" ||
      request.nextUrl.pathname.startsWith("/app/"))
  ) {
    const target = new URL("/sign-in", request.url);
    target.searchParams.set(
      "next",
      appReturnPath(request.nextUrl.pathname + request.nextUrl.search),
    );
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response = redirect;
  }
  Object.entries(privateAuthHeaders).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  return response;
}
