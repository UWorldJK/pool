// Loads local demo data. Local only: it talks to the Supabase stack on this machine.
//   1. Creates the demo accounts through Supabase Auth with the public key, so
//      they are real accounts that can sign in (emails land in the local inbox).
//   2. Runs the fixtures in the database container.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

process.loadEnvFile?.(new URL("../.env.local", import.meta.url));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local first.");
  process.exit(1);
}

for (const name of ["alex", "jamie", "sarah", "david", "maya", "olive"]) {
  const response = await fetch(new URL("/auth/v1/otp", url), {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email: `${name}@example.test`, create_user: true }),
  });
  if (!response.ok) {
    console.error(`Could not create ${name}@example.test: HTTP ${response.status}`);
    process.exit(1);
  }
}

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const sql = ["begin;", read("../supabase/tests/_helpers.psql"), read("./demo-seed.sql"), "commit;"].join("\n");
const result = spawnSync("docker", ["exec", "-i", "supabase_db_pool", "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], {
  input: sql,
  stdio: ["pipe", "ignore", "inherit"],
});
if (result.status !== 0) {
  console.error("Demo seed failed. Run `npm run supabase:reset` first; the demo team must not exist yet.");
  process.exit(result.status ?? 1);
}
console.log("Demo team loaded. Sign in as alex@example.test, sarah@example.test, david@example.test or maya@example.test.");
