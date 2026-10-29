import { test, expect } from "@playwright/test";

const password = "Pool-membership-browser-2026!";
async function account(browser, label) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = `pool-r3-${label}-${crypto.randomUUID()}@example.test`;
  await page.goto("/sign-up");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("I am at least 18 years old.").check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  let link;
  await expect.poll(async () => {
    const { messages } = await fetch("http://localhost:55324/api/v1/messages?limit=100").then((r) => r.json());
    const mail = messages.find((m) => m.To.some((to) => to.Address === email));
    if (!mail) return false;
    const message = await fetch(`http://localhost:55324/api/v1/message/${mail.ID}`).then((r) => r.json());
    link = message.HTML.match(/href="([^"]+)"/)?.[1].replaceAll("&amp;", "&");
    return Boolean(link);
  }).toBe(true);
  await page.goto(link);
  await page.getByRole("button", { name: "Confirm email", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  return { context, page, email };
}
async function family(page, name, display) {
  await page.goto("/app");
  await page.getByLabel("Family name", { exact: true }).fill(name);
  await page.getByLabel("Your display name").fill(display);
  await page.getByRole("button", { name: "Create family", exact: true }).click();
  await page.getByRole("link", { name: "Open saved membership" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  return page.url();
}
async function invitation(page, email, kind) {
  await page.getByLabel("Recipient email").fill(email);
  await page.getByRole("button", { name: `Create ${kind} invitation`, exact: true }).click();
  await expect(page.getByLabel("Manual invitation link")).toBeVisible();
  const link = await page.getByLabel("Manual invitation link").inputValue();
  // Capability is copyable, but is never placed in an HTTP query/path.
  const url = new URL(link, "http://localhost:3100");
  expect(url.search).toBe("");
  expect(url.hash.startsWith(`#kind=${kind}&token=`)).toBe(true);
  return link;
}
async function openAndCheck(page, link) {
  await page.goto(link);
  await expect.poll(async () => (await page.getByLabel("Invitation link", { exact: true }).inputValue()) === link).toBe(true);
  await expect(page.getByRole("button", { name: "Accept invitation", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Check invitation", exact: true }).click();
}

test("two real families and a guardian use manual invitations, explicit acceptance, persisted rosters and removal", async ({ browser }) => {
  const owner = await account(browser, "owner");
  const other = await account(browser, "other");
  const guardian = await account(browser, "guardian");
  try {
    const ownerFamilyUrl = await family(owner.page, "Oak browser family", "Oak adult");
    const otherFamilyUrl = await family(other.page, "Elm browser family", "Elm adult");
    await owner.page.getByLabel("Circle name").fill("Morning browser circle");
    await owner.page.getByRole("button", { name: "Create circle", exact: true }).click();
    await owner.page.getByRole("link", { name: "Open saved membership" }).click();
    await expect(owner.page.getByRole("heading", { level: 1 })).toHaveText("Morning browser circle");
    const circleUrl = owner.page.url();
    const circleLink = await invitation(owner.page, other.email, "circle");
    await owner.context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await owner.page.getByRole("button", { name: "Copy invitation link", exact: true }).click();
    await expect(owner.page.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
    expect((await owner.page.evaluate(() => navigator.clipboard.readText())) === circleLink).toBe(true);
    await openAndCheck(guardian.page, circleLink);
    await expect(guardian.page.locator('p[role="alert"]')).toContainText("unavailable to this account");
    await openAndCheck(other.page, circleLink);
    await expect(other.page.getByRole("heading", { name: "Join circle: Morning browser circle" })).toBeVisible();
    await other.page.getByLabel("Your display name").fill("Elm adult");
    await other.page.getByLabel("Family to join the circle").selectOption({ label: "Elm browser family" });
    await other.page.getByLabel("I explicitly accept this circle family membership.").check();
    await other.page.getByRole("button", { name: "Accept invitation", exact: true }).click();
    await expect(other.page.getByRole("status")).toContainText("Membership accepted");
    await other.page.goto(circleUrl);
    await other.page.reload();
    await expect(other.page.getByText("Oak browser family", { exact: false }).first()).toBeVisible();
    await expect(other.page.getByText("Elm browser family", { exact: false }).first()).toBeVisible();
    await expect(other.page.getByRole("button", { name: "Create circle invitation" })).toHaveCount(0);
    await other.page.goto(ownerFamilyUrl);
    await expect(other.page.getByRole("heading", { name: "Membership unavailable" })).toBeVisible();
    await owner.page.goto(ownerFamilyUrl);
    const guardianLink = await invitation(owner.page, guardian.email, "guardian");
    await openAndCheck(guardian.page, guardianLink);
    await guardian.page.getByLabel("Your display name").fill("Oak guardian");
    await guardian.page.getByLabel("I explicitly accept this family guardian membership.").check();
    await guardian.page.getByRole("button", { name: "Accept invitation", exact: true }).click();
    await guardian.page.getByRole("link", { name: "Open saved membership" }).click();
    await expect(guardian.page.getByText("Oak adult · owner", { exact: false }).first()).toBeVisible();
    await expect(guardian.page.getByRole("button", { name: "Create guardian invitation" })).toHaveCount(0);
    await guardian.page.reload();
    await expect(guardian.page.getByText("Oak guardian · guardian", { exact: false }).first()).toBeVisible();
    // Reuse fails, and revocation is visible without exposing invitation email lists.
    await openAndCheck(guardian.page, guardianLink);
    await expect(guardian.page.locator('p[role="alert"]')).toContainText("already been used");
    await owner.page.reload();
    const revokedLink = await invitation(owner.page, guardian.email, "guardian");
    await owner.page.reload();
    await owner.page.getByRole("button", { name: "Revoke invitation", exact: true }).click();
    await openAndCheck(guardian.page, revokedLink);
    await expect(guardian.page.locator('p[role="alert"]')).toContainText("revoked");
    await owner.page.reload();
    const guardianRow = owner.page.getByRole("listitem").filter({ hasText: "Oak guardian · guardian" });
    await guardianRow.getByRole("checkbox").check();
    await guardianRow.getByRole("button", { name: "Remove guardian", exact: true }).click();
    await expect(guardianRow).toHaveCount(0);
    await guardian.page.goto(ownerFamilyUrl);
    await expect(guardian.page.getByRole("heading", { name: "Membership unavailable" })).toBeVisible();
    await owner.page.goto(circleUrl);
    const otherRow = owner.page.getByRole("listitem").filter({ hasText: "Elm browser family" });
    await otherRow.getByRole("checkbox").check();
    await otherRow.getByRole("button", { name: "Remove family from circle", exact: true }).click();
    await expect(otherRow).toHaveCount(0);
    await other.page.goto(circleUrl);
    await expect(other.page.getByRole("heading", { name: "Membership unavailable" })).toBeVisible();
    await other.page.goto(otherFamilyUrl);
    await other.page.setViewportSize({ width: 390, height: 844 });
    expect(await other.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await other.page.keyboard.press("Tab");
    expect(await other.page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
  } finally { await Promise.all([owner.context.close(), other.context.close(), guardian.context.close()]); }
});
