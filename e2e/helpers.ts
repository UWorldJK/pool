import { expect, type Browser, type Page } from "@playwright/test";

const inbox = "http://127.0.0.1:54324/api/v1";

/** A unique local test address per run, so reruns never collide. */
export function testEmail(name: string, run: string) {
  return `${name}.${run}@example.test`;
}

async function latestLink(email: string, after: number): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const search = await fetch(`${inbox}/search?query=${encodeURIComponent(`to:"${email}"`)}`).then((r) => r.json());
    const message = (search.messages ?? []).find((m: { Created: string }) => new Date(m.Created).getTime() >= after - 1000);
    if (message) {
      const full = await fetch(`${inbox}/message/${message.ID}`).then((r) => r.json());
      const match = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(full.HTML as string);
      if (match) return match[1].replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No sign in email for ${email}`);
}

/** Signs in through the real magic link flow and returns the page. */
export async function signIn(browser: Browser, email: string, next = "/"): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const sentAt = Date.now();
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign in link" }).click();
  await expect(page.getByRole("heading", { name: "We sent you a link." })).toBeVisible();
  await page.goto(await latestLink(email, sentAt));
  return page;
}

export async function onboard(page: Page, person: { name: string; seats: number; family: string; child: string }) {
  await expect(page.getByRole("heading", { name: "Nice to meet you." })).toBeVisible();
  await page.getByLabel("Your name").fill(person.name);
  await page.getByLabel("Car").fill("Test car");
  await page.getByLabel("Passenger seats").fill(String(person.seats));
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Who rides with you?" })).toBeVisible();
  await page.getByLabel("Family name").fill(person.family);
  await page.getByLabel("First name").fill(person.child);
  await page.getByRole("button", { name: "Save household" }).click();
  await expect(page.getByRole("heading", { name: "Join your team's circle." })).toBeVisible();
}

/** "YYYY-MM-DDTHH:MM" for a datetime-local input, in the team's zone. */
export function localInput(hoursFromNow: number, timeZone = "America/Denver") {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(Date.now() + hoursFromNow * 3_600_000))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
