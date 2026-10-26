import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions, getPublicSupabaseConfig } from "./config";

export async function createClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();
  const cookieStore = await cookies();

  // Use service role key if available (for admin operations), otherwise use publishable key
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || publishableKey;

  return createServerClient(process.env.SUPABASE_INTERNAL_URL || url, apiKey, {
    // Browser and container URLs differ locally. Both clients must use the same
    // cookie name rather than letting the SDK derive it from their hostnames.
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Call this helper from Route Handlers or Server Actions, where cookies
        // can be written. Add the SSR refresh proxy when implementing login.
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
