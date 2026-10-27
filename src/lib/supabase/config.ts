export const authCookieOptions = {
  name: "pool-auth",
  path: "/",
  sameSite: "lax" as const,
  // Local development uses HTTP; deployed builds use HTTPS. Browsers also
  // support Secure cookies on localhost for the production-mode Auth tests.
  secure: process.env.NODE_ENV === "production",
};

export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before using Supabase.",
    );
  }

  return { url, publishableKey };
}
