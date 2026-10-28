import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions, getPublicSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export async function createClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();
  const cookieStore = await cookies();

  // This client shares the user's session and must remain subject to RLS.
  return createServerClient<Database>(process.env.SUPABASE_INTERNAL_URL || url, publishableKey, {
    // Browser and container URLs differ locally. Both clients must use the same
    // cookie name rather than letting the SDK derive it from their hostnames.
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Components cannot write cookies. src/proxy.ts refreshes the
        // session before rendering, so a refresh here can be skipped safely.
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {}
      },
    },
  });
}
