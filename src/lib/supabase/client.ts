"use client";

import { createBrowserClient } from "@supabase/ssr";
import { authCookieOptions, getPublicSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export function createClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();

  return createBrowserClient<Database>(url, publishableKey, {
    cookieOptions: authCookieOptions,
  });
}
