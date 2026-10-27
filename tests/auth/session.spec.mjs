import { test, expect } from "@playwright/test";

const password = "Pool-test-password-2026!";
const mailboxOrigin = "http://localhost:55324";
const uniqueEmail = (label) => `pool-r2-${label}-${Date.now()}@example.test`;
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function capturedLink(email, type = "signup") {
  let link;
  await expect
    .poll(async () => {
      const response = await fetch(
        `${mailboxOrigin}/api/v1/messages?limit=100`,
      );
      const { messages } = await response.json();
      const delivered = messages.find(
        (message) =>
          message.To.some((to) => to.Address === email) &&
          message.Subject ===
            (type === "recovery"
              ? "Reset your Pool password"
              : "Confirm your Pool email"),
      );
      if (!delivered) return false;
      const message = await fetch(
        `${mailboxOrigin}/api/v1/message/${delivered.ID}`,
      ).then((r) => r.json());
      link = message.HTML.match(/href="([^"]+)"/)?.[1].replaceAll("&amp;", "&");
      return Boolean(link);
    })
    .toBe(true);
  const url = new URL(link);
  expect(url.origin).toBe("http://localhost:3100");
  return link;
}

async function signUp(page, email) {
  await page.goto("/sign-up");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("I am at least 18 years old.").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  return capturedLink(email);
}

async function signIn(page, email, next = "/app", value = password) {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(value);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function confirm(page, link) {
  await page.goto(link);
  const response = await page.request.get("/app", { maxRedirects: 0 });
  expect(response.status()).toBe(307); // GET of a mail link does not consume it.
  await page
    .getByRole("button", { name: "Confirm email", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
}

async function sessionCookies(context) {
  return (await context.cookies()).filter((cookie) =>
    /^pool-auth(?:\.\d+)?$/.test(cookie.name),
  );
}
async function readSession(context) {
  const cookies = (await sessionCookies(context)).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const raw = cookies.map((cookie) => cookie.value).join("");
  return JSON.parse(
    Buffer.from(raw.slice("base64-".length), "base64url").toString(),
  );
}
async function replaceSession(context, session) {
  await context.clearCookies();
  await context.addCookies([
    {
      name: "pool-auth",
      value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
      url: "http://localhost:3100",
      sameSite: "Lax",
    },
  ]);
}
function privateResponse(response) {
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["cache-control"]).toContain("private");
}

test("real signup, email confirmation, two users, refresh propagation and sign-out", async ({
  browser,
}) => {
  const one = await browser.newContext();
  const two = await browser.newContext();
  const pageOne = await one.newPage();
  const pageTwo = await two.newPage();
  const emailOne = uniqueEmail("one");
  const emailTwo = uniqueEmail("two");
  const linkOne = await signUp(pageOne, emailOne);
  await signIn(pageOne, emailOne);
  await expect(pageOne.locator("form [role=alert]")).toContainText(
    "confirm your email",
  );
  await confirm(pageOne, linkOne);
  await expect(pageOne.getByText(emailOne, { exact: true })).toBeVisible();
  const linkTwo = await signUp(pageTwo, emailTwo);
  await confirm(pageTwo, linkTwo);

  // A legitimate refresh token with stale expiry metadata forces a real refresh
  // through Next's proxy; the component must see the renewed request cookies.
  const stale = await readSession(one);
  await replaceSession(one, { ...stale, expires_at: 1 });
  const refreshed = await pageOne.goto("/app");
  privateResponse(refreshed);
  expect((await refreshed.allHeaders())["set-cookie"]).toContain("pool-auth");
  const renewed = await readSession(one);
  expect(renewed.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
  expect(renewed.refresh_token).not.toBe(stale.refresh_token);
  await pageOne.reload();
  await expect(pageOne.getByText(emailOne, { exact: true })).toBeVisible();
  await expect(pageOne.getByText(emailTwo, { exact: true })).toHaveCount(0);
  privateResponse(await pageTwo.goto("/app"));
  await expect(pageTwo.getByText(emailTwo, { exact: true })).toBeVisible();
  await expect(pageTwo.getByText(emailOne, { exact: true })).toHaveCount(0);

  // Exercise RSC responses as well as HTML against the same production server.
  for (const [context, own, other] of [
    [one, emailOne, emailTwo],
    [two, emailTwo, emailOne],
  ]) {
    const response = await context.request.get("/app?_rsc=isolation", {
      headers: { RSC: "1" },
    });
    privateResponse(response);
    const body = await response.text();
    expect(body).toContain(own);
    expect(body).not.toContain(other);
  }
  await pageOne.getByRole("button", { name: "Sign out" }).click();
  await expect(pageOne).toHaveURL(/\/sign-in\?message=signed-out$/);
  expect(await sessionCookies(one)).toHaveLength(0);
  expect((await one.request.get("/app", { maxRedirects: 0 })).status()).toBe(
    307,
  );
  await pageTwo.reload();
  await expect(pageTwo.getByText(emailTwo, { exact: true })).toBeVisible();

  // Return-path attacks are tested through the real action and resulting URL.
  for (const next of [
    "https://evil.example",
    "//evil.example",
    "/app/%2e%2e/evil",
  ]) {
    await signIn(pageOne, emailOne, next);
    await expect(pageOne).toHaveURL("http://localhost:3100/app");
    await pageOne.getByRole("button", { name: "Sign out" }).click();
    await expect(pageOne).toHaveURL(/signed-out/);
  }
  await signIn(pageOne, emailOne, "/app?tab=one");
  await expect(pageOne).toHaveURL("http://localhost:3100/app?tab=one");
  await pageOne.getByRole("button", { name: "Sign out" }).click();
  await expect(pageOne).toHaveURL(/signed-out/);
  await pageOne.goto(linkOne);
  await pageOne
    .getByRole("button", { name: "Confirm email", exact: true })
    .click();
  await expect(
    pageOne.getByRole("heading", { name: "This link could not be used" }),
  ).toBeVisible();
  await one.close();
  await two.close();
});

test("recovery uses captured mail, changes the password and rejects reused links", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("recovery");
  const link = await signUp(page, email);
  await confirm(page, link);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/signed-out/);
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account matches");
  const recovery = await capturedLink(email, "recovery");
  expect(recovery).toContain("type=recovery");
  await page.goto(recovery);
  await page.getByRole("button", { name: "Choose a new password" }).click();
  await expect(page).toHaveURL(/\/reset-password$/);
  const newPassword = "Replacement-pool-password!";
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/message=password-updated/);
  expect(await sessionCookies(context)).toHaveLength(0);
  await signIn(page, email);
  await expect(page.locator("form [role=alert]")).toContainText(
    "Unable to sign in",
  );
  await signIn(page, email, "/app", newPassword);
  await expect(page).toHaveURL(/\/app$/);
  await page.goto(recovery);
  await page.getByRole("button", { name: "Choose a new password" }).click();
  await expect(page).toHaveURL(/\/auth\/error$/);
});

test("absent, malformed, forged and genuinely expired sessions fail closed", async ({
  page,
  context,
}) => {
  for (const route of ["/app", "/app/private?return=//evil.example"]) {
    const response = await context.request.get(route, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    privateResponse(response);
    expect(await response.text()).not.toContain("Signed in as");
  }
  await context.addCookies([
    {
      name: "pool-auth",
      value: "malformed-session",
      url: "http://localhost:3100",
    },
  ]);
  expect(
    (await context.request.get("/app", { maxRedirects: 0 })).status(),
  ).toBe(307);
  await context.clearCookies();
  const email = uniqueEmail("expiry");
  await confirm(page, await signUp(page, email));
  const session = await readSession(context);
  const parts = session.access_token.split(".");
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  parts[1] = Buffer.from(
    JSON.stringify({
      ...claims,
      sub: "00000000-0000-4000-8000-000000000000",
      email: "forged@example.test",
    }),
  ).toString("base64url");
  await replaceSession(context, {
    ...session,
    access_token: parts.join("."),
    user: { ...session.user, email: "forged@example.test" },
    refresh_token: "forged-refresh",
  });
  expect(
    (await context.request.get("/app", { maxRedirects: 0 })).status(),
  ).toBe(307);
  // Keep the authentic signature; wait past the actual Auth-issued JWT expiry.
  await sleep(Math.max(0, claims.exp * 1000 - Date.now() + 1500));
  await replaceSession(context, {
    ...session,
    refresh_token: "expired-invalid-refresh",
  });
  const expired = await context.request.get("/app", { maxRedirects: 0 });
  expect(expired.status()).toBe(307);
  privateResponse(expired);
});

test("expired confirmation and recovery mail, missing verifier and callback errors are useful", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("expired-mail");
  const expiredConfirmation = await signUp(page, email);
  await sleep(12_000);
  await page.goto(expiredConfirmation);
  await page
    .getByRole("button", { name: "Confirm email", exact: true })
    .click();
  await expect(page).toHaveURL(/\/auth\/error$/);
  expect(
    (await context.request.get("/app", { maxRedirects: 0 })).status(),
  ).toBe(307);

  const confirmedEmail = uniqueEmail("expired-recovery");
  await confirm(page, await signUp(page, confirmedEmail));
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/signed-out/);
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(confirmedEmail);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account matches");
  const expiredRecovery = await capturedLink(confirmedEmail, "recovery");
  await sleep(12_000);
  await page.goto(expiredRecovery);
  await page.getByRole("button", { name: "Choose a new password" }).click();
  await expect(page).toHaveURL(/\/auth\/error$/);
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/auth\/error$/);
  for (const path of [
    "/auth/confirm?type=invite&token_hash=invalid",
    "/auth/callback",
    "/auth/callback?error=access_denied&error_description=untrusted-copy",
    "/auth/callback?code=invalid&next=//evil.example",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "This link could not be used" }),
    ).toBeVisible();
    await expect(page.getByText("untrusted-copy")).toHaveCount(0);
  }
});

test("real PKCE callback exchanges code, sets cookies and rejects replay and missing verifier", async ({
  browser,
  page,
  context,
}) => {
  const email = uniqueEmail("callback");
  const link = new URL(await signUp(page, email));
  const verify = new URL("http://localhost:55321/auth/v1/verify");
  verify.searchParams.set("token", link.searchParams.get("token_hash"));
  verify.searchParams.set("type", "signup");
  verify.searchParams.set(
    "redirect_to",
    "http://localhost:3100/auth/callback?next=//evil.example",
  );
  // Follow GoTrue's verification redirect in the original browser holding PKCE.
  const response = await context.request.get(verify.href, { maxRedirects: 0 });
  const callback = response.headers().location;
  expect(callback).toContain("code=");
  const missingVerifier = await browser.newContext();
  const failed = await missingVerifier.request.get(callback, {
    maxRedirects: 0,
  });
  expect(failed.headers().location).toBe("/auth/error");
  await missingVerifier.close();
  await page.goto(callback);
  await expect(page).toHaveURL("http://localhost:3100/app");
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  expect((await sessionCookies(context)).length).toBeGreaterThan(0);
  await page.goto(callback);
  await expect(page).toHaveURL(/\/auth\/error$/);
});

test("keyboard signup, mobile reflow and public liveness/static assets", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/sign-up");
  await page.getByLabel("Email address").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("I am at least 18 years old.")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const path of ["/", "/api/health", "/robots.txt"])
    expect((await context.request.get(path)).status()).toBe(200);
  const css = await page
    .locator('link[rel="stylesheet"]')
    .first()
    .getAttribute("href");
  expect((await context.request.get(css)).status()).toBe(200);
});
