const internal = process.argv.includes("--internal");
const baseUrl = internal
  ? process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  : process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!baseUrl || !publishableKey) {
  console.error("Set the Supabase URL and publishable key in .env.local first.");
  process.exit(1);
}

try {
  for (const endpoint of ["/auth/v1/health", "/rest/v1/"]) {
    const response = await fetch(new URL(endpoint, baseUrl), {
      headers: { apikey: publishableKey },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`${endpoint} returned HTTP ${response.status}`);
    }

    console.log(`${internal ? "Container" : "Public"} Supabase ${endpoint}: OK`);
  }
} catch (error) {
  console.error("Supabase connectivity check failed:", error.message);
  process.exitCode = 1;
}
