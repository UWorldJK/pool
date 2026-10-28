import assert from "node:assert/strict";
import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import test, { after, beforeEach, mock } from "node:test";

const require = createRequire(import.meta.url);
// A file URL, not a path: Windows paths ("C:\...") are not valid ESM specifiers.
const headersModule = pathToFileURL(require.resolve("next/headers")).href;
const serverModule = new URL("../src/lib/supabase/server.ts", import.meta.url);

// Match Next.js resolution for its extensionless imports in the native test runner.
const resolutionHooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/headers") {
      return nextResolve(headersModule, context);
    }
    if (specifier === "./config" && context.parentURL === serverModule.href) {
      return nextResolve(new URL("./config.ts", serverModule).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const client = {};
const createServerClient = mock.fn(() => client);
const userCookies = [{ name: "pool-auth", value: "user-session" }];
const cookieStore = {
  getAll: mock.fn(() => userCookies),
  set: mock.fn(),
};

mock.module("server-only", { exports: {} });
mock.module("@supabase/ssr", { exports: { createServerClient } });
mock.module("next/headers", { exports: { cookies: async () => cookieStore } });

// Import the actual helper and config; only the SDK and Next.js boundaries are mocked.
const { createClient } = await import(serverModule.href);
resolutionHooks.deregister();
after(() => mock.restoreAll());

beforeEach((context) => {
  context.mock.property(process, "env", {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "https://public-project.example",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture",
    SUPABASE_SERVICE_ROLE_KEY: "unused-service-role-fixture",
    SUPABASE_SECRET_KEY: "unused-secret-fixture",
    SUPABASE_INTERNAL_URL: "",
  });
  createServerClient.mock.resetCalls();
  cookieStore.getAll.mock.resetCalls();
  cookieStore.set.mock.resetCalls();
});

test("the session client uses the public key even when both admin keys are present", async () => {
  assert.equal(await createClient(), client);
  const [url, key] = createServerClient.mock.calls[0].arguments;

  assert.equal(url, "https://public-project.example");
  assert.equal(key, "sb_publishable_test_fixture");
});

test("the session client preserves its internal URL override without elevating access", async () => {
  process.env.SUPABASE_INTERNAL_URL = "http://api.supabase.internal:8000";
  await createClient();
  const [url, key] = createServerClient.mock.calls[0].arguments;

  assert.equal(url, "http://api.supabase.internal:8000");
  assert.equal(key, "sb_publishable_test_fixture");
});

test("the session client shares the user's cookies and forwards refreshed cookies", async () => {
  await createClient();
  const [, , options] = createServerClient.mock.calls[0].arguments;
  const refreshedCookie = {
    name: "pool-auth",
    value: "refreshed-user-session",
    options: { httpOnly: true, sameSite: "lax", path: "/" },
  };
  const clearedCookie = { name: "old-session", value: "", options: { maxAge: 0 } };

  assert.deepEqual(options.cookieOptions, { name: "pool-auth" });
  assert.equal(options.cookies.getAll(), userCookies);
  options.cookies.setAll([refreshedCookie, clearedCookie]);
  assert.deepEqual(cookieStore.set.mock.calls.map((call) => call.arguments), [
    [refreshedCookie.name, refreshedCookie.value, refreshedCookie.options],
    [clearedCookie.name, clearedCookie.value, clearedCookie.options],
  ]);
});

test("the session client requires the public key even when admin keys are present", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  await assert.rejects(createClient(), /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.equal(createServerClient.mock.callCount(), 0);
});
