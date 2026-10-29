import { expect } from "@playwright/test";

export const password = "Pool-membership-browser-2026!";
export async function account(browser, label) {
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
export async function family(page, name, display) {
  await page.goto("/app");
  await page.getByLabel("Family name", { exact: true }).fill(name);
  await page.getByLabel("Your display name").fill(display);
  await page.getByRole("button", { name: "Create family", exact: true }).click();
  await page.getByRole("link", { name: "Open saved membership" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  return page.url();
}
export async function invitation(page, email, kind) {
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
export async function openAndCheck(page, link) {
  await page.goto(link);
  await expect.poll(async () => (await page.getByLabel("Invitation link", { exact: true }).inputValue()) === link).toBe(true);
  await expect(page.getByRole("button", { name: "Accept invitation", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Check invitation", exact: true }).click();
}
