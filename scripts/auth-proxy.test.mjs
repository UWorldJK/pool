import assert from "node:assert/strict";
import test, { after, beforeEach, mock } from "node:test";
import { registerAuthTestLoader } from "./auth-test-loader.mjs";

const loader = registerAuthTestLoader();
const { NextRequest } = await import("next/server");
let options;
let result;
let onGetUser;
let configuration;
mock.module("@supabase/ssr", {
  exports: {
    createServerClient: (url, key, opts) => {
      configuration = { url, key };
      options = opts;
      return {
        auth: {
          getUser: async () => {
            onGetUser?.();
            return result;
          },
        },
      };
    },
  },
});
const { updateSession } = await import("../src/lib/supabase/proxy.ts");
const { config } = await import("../src/proxy.ts");
loader.deregister();
after(() => mock.restoreAll());
beforeEach((context) => {
  context.mock.property(process, "env", {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "https://public.example",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_public",
    SUPABASE_INTERNAL_URL: "http://internal:8000",
    SUPABASE_SECRET_KEY: "unused-secret",
  });
  result = {
    data: { user: { email: "one@example.test", email_confirmed_at: "yes" } },
    error: null,
  };
  onGetUser = undefined;
});

test("proxy propagates refreshed chunks/deletions to request and response with SDK headers", async () => {
  const request = new NextRequest("https://pool.example/app");
  onGetUser = () => {
    options.cookies.setAll(
      [
        {
          name: "pool-auth.0",
          value: "first",
          options: { sameSite: "lax", path: "/" },
        },
        { name: "pool-auth.1", value: "", options: { maxAge: 0 } },
      ],
      {
        "Cache-Control": "private, no-store",
        Expires: "0",
        "X-SDK-Header": "retained",
      },
    );
    options.cookies.setAll(
      [
        {
          name: "pool-auth.0",
          value: "second",
          options: { sameSite: "lax", path: "/" },
        },
      ],
      {},
    );
  };
  const response = await updateSession(request);
  assert.deepEqual(configuration, {
    url: "http://internal:8000",
    key: "sb_publishable_public",
  });
  assert.equal(options.cookieOptions.name, "pool-auth");
  assert.equal(request.cookies.get("pool-auth.0").value, "second");
  assert.equal(response.cookies.get("pool-auth.0").value, "second");
  assert.equal(response.cookies.get("pool-auth.1").maxAge, 0);
  assert.match(
    response.headers.get("x-middleware-request-cookie"),
    /pool-auth.0=second/,
  );
  assert.equal(response.headers.get("X-SDK-Header"), "retained");
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.equal(response.headers.get("Vercel-CDN-Cache-Control"), "no-store");
});

test("denied and forged identities redirect safely without dropping cookie clearing", async () => {
  for (const error of [null, { message: "forged" }]) {
    result = {
      data: {
        user: error
          ? { email: "forged@example.test", email_confirmed_at: "yes" }
          : null,
      },
      error,
    };
    onGetUser = () =>
      options.cookies.setAll(
        [{ name: "pool-auth", value: "", options: { maxAge: 0, path: "/" } }],
        {},
      );
    const response = await updateSession(
      new NextRequest("https://pool.example/app?tab=one"),
    );
    assert.equal(response.status, 307);
    assert.equal(
      new URL(response.headers.get("location")).searchParams.get("next"),
      "/app?tab=one",
    );
    assert.equal(response.cookies.get("pool-auth").maxAge, 0);
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
});

test("proxy clients and cookies are isolated per request; health/static/home bypass matcher", async () => {
  await updateSession(
    new NextRequest("https://pool.example/app", {
      headers: { cookie: "pool-auth=one" },
    }),
  );
  assert.equal(options.cookies.getAll()[0].value, "one");
  await updateSession(
    new NextRequest("https://pool.example/app", {
      headers: { cookie: "pool-auth=two" },
    }),
  );
  assert.equal(options.cookies.getAll()[0].value, "two");
  assert.deepEqual(config.matcher, [
    "/app/:path*",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/auth/:path*",
  ]);
});
