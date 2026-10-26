"use client";

import { createBrowserClient } from "@supabase/ssr";
import { authCookieOptions, getPublicSupabaseConfig } from "./config";

export function createClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();

  return createBrowserClient(url, publishableKey, {
    cookieOptions: authCookieOptions,
  });
}
