import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions, getPublicSupabaseConfig } from "./config";

// Writable clients belong only in Server Actions and Route Handlers.
export async function createClient({ readOnly = false } = {}) {
  const { url, publishableKey } = getPublicSupabaseConfig();
  const cookieStore = await cookies();

  // This client shares the user's session and must remain subject to RLS.
  return createServerClient(
    process.env.SUPABASE_INTERNAL_URL || url,
    publishableKey,
    {
      // Browser and container URLs differ locally. Both clients must use the same
      // cookie name rather than letting the SDK derive it from their hostnames.
      cookieOptions: authCookieOptions,
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components cannot write. The proxy refreshes both the incoming
          // request and outgoing response before a component reads the session.
          if (readOnly) return;
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}

export function createReadOnlyClient() {
  return createClient({ readOnly: true });
}
