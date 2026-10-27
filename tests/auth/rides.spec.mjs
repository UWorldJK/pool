import { test, expect } from "@playwright/test";
import { account, family, invitation, openAndCheck, password } from "./helpers.mjs";
async function joinCircle(inviter, recipient, circleUrl, familyName) {
  await inviter.page.goto(circleUrl);
  const link = await invitation(inviter.page, recipient.email, "circle");
  await openAndCheck(recipient.page, link);
  await recipient.page.getByLabel("Your display name").fill("Ride guardian");
  await recipient.page.getByLabel("Family to join the circle").selectOption({ label: familyName });
  await recipient.page.getByLabel("I explicitly accept this circle family membership.").check();
  await recipient.page.getByRole("button", { name: "Accept invitation", exact: true }).click();
  await expect(recipient.page.getByRole("status")).toContainText("Membership accepted");
}
async function child(page, name) {
  await page.goto("/app/children");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Save child", exact: true }) });
  await form.getByLabel("Child display name").fill(name);
  await form.getByLabel("Seat requirement").selectOption("booster");
  await form.getByRole("button", { name: "Save child", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  return page.locator('form:has(button:text-is("Update child")) input[name="child_id"]').first().inputValue();
}
async function plan(page, direction) {
  await page.goto("/app/rides/new");
  await page.getByLabel("Travel direction").selectOption(direction);
  await page.getByLabel("Pickup summary", { exact: true }).fill(direction === "outbound" ? "Morning area" : "Activity area");
  await page.getByLabel("Drop-off summary", { exact: true }).fill(direction === "outbound" ? "Activity area" : "Home area");
  await page.getByLabel("Exact pickup", { exact: true }).fill("101 Secret Pickup, side door");
  await page.getByLabel("Exact drop-off", { exact: true }).fill("202 Secret Dropoff, room 2");
  await page.getByLabel("IANA timezone").fill("America/Denver");
  await page.getByLabel("Pickup time", { exact: true }).fill(direction === "outbound" ? "2027-11-07T01:30" : "2027-11-07T15:00");
  await page.getByLabel("Drop-off time", { exact: true }).fill(direction === "outbound" ? "2027-11-07T02:30" : "2027-11-07T16:00");
  await page.getByLabel("Creator child", { exact: true }).check();
  await page.getByLabel("Invited browser family", { exact: true }).check();
  if (direction === "outbound") {
    await page.getByRole("button", { name: "Create ride", exact: true }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("occurs twice");
    await page.getByLabel("Pickup time repeated-hour choice").selectOption("later");
  }
  await page.getByRole("button", { name: "Create ride", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  // A second click cannot generate another request identity after revalidation.
  await expect(page.getByRole("button", { name: "Create ride", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Open saved result" }).click();
  await expect(page.getByText("Unassigned — needs a driver", { exact: false }).first()).toBeVisible();
  return page.url();
}
// Replay a real Server Action POST under another independent user's cookies.
// The authorized request is intercepted before it reaches the server.
async function deniedReplay(ownerPage, otherContext, click, expected) {
  const actionRequest = new Promise((resolve) => {
    ownerPage.route("**/*", async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.headers()["next-action"]) { resolve({ url: request.url(), body: request.postDataBuffer(), headers: request.headers() }); await route.abort(); }
      else await route.continue();
    });
  });
  await click();
  const captured = await actionRequest;
  await ownerPage.unroute("**/*");
  await replay(captured, otherContext, expected);
  return captured;
}
async function replay(captured, otherContext, expected) {
  const response = await otherContext.request.post(captured.url, { data: captured.body, headers: { "content-type": captured.headers["content-type"], "next-action": captured.headers["next-action"], origin: "http://localhost:3100", accept: "text/x-component" } });
  expect(await response.text()).toContain(expected);
}

test("R4 real multi-session planning, private offers, endpoint denials, enrollment races, schedule and cancellation", async ({ browser }) => {
  const creator = await account(browser, "ride-creator"), other = await account(browser, "ride-other"), coordinator = await account(browser, "ride-coordinator"), outsider = await account(browser, "ride-outsider");
  const independent = await browser.newContext();
  try {
    const creatorFamily = await family(creator.page, "Creator browser family", "Creator adult");
    await family(other.page, "Invited browser family", "Invited adult");
    await family(coordinator.page, "Coordinator browser family", "Coordinator adult");
    await family(outsider.page, "Unrelated browser family", "Outside adult");
    await coordinator.page.getByLabel("Circle name").fill("R4 browser circle");
    await coordinator.page.getByRole("button", { name: "Create circle", exact: true }).click();
    await coordinator.page.getByRole("link", { name: "Open saved membership" }).click();
    await expect(coordinator.page.getByRole("heading", { name: "R4 browser circle", exact: true })).toBeVisible();
    const circleUrl = coordinator.page.url();
    await joinCircle(coordinator, creator, circleUrl, "Creator browser family");
    await joinCircle(coordinator, other, circleUrl, "Invited browser family");
    const childId = await child(creator.page, "Creator child");
    await child(other.page, "Invited child");
    // Forge an existing UI action to target a child belonging to another family.
    const foreignForm = other.page.locator("form").filter({ has: other.page.getByRole("button", { name: "Update child", exact: true }) });
    // Wait for hydration before altering a controlled hidden field; otherwise
    // React can restore its original value and turn this denial into an own edit.
    await expect(foreignForm.getByRole("button", { name: "Update child", exact: true })).toBeEnabled();
    await foreignForm.locator('input[name="child_id"]').evaluate((input, id) => { input.value = id; }, childId);
    await foreignForm.getByRole("button", { name: "Update child", exact: true }).click();
    await expect(foreignForm.locator('p[role="alert"]')).toContainText("unavailable");
    const rideUrl = await plan(creator.page, "outbound");
    await other.page.goto(rideUrl);
    await expect(other.page.getByText("Only the minimal invitation summary", { exact: false })).toBeVisible();
    await expect(other.page.getByText("101 Secret Pickup, side door", { exact: false })).toHaveCount(0);
    await expect(other.page.getByText("Creator child", { exact: true })).toHaveCount(0);
    for (const person of [coordinator, outsider]) { await person.page.goto(rideUrl); await expect(person.page.getByRole("heading", { name: "Ride unavailable" })).toBeVisible(); }
    // A callable enrollment endpoint rejects a forged cross-family child too.
    await other.page.getByLabel("Invited child", { exact: true }).check();
    await other.page.getByLabel("Invited child", { exact: true }).evaluate((input, id) => { input.value = id; }, childId);
    await other.page.getByRole("button", { name: "Join with own riders", exact: true }).click();
    await expect(other.page.locator('p[role="alert"]')).toContainText("Select only your own children");
    await other.page.reload();
    expect((await independent.request.get(rideUrl, { maxRedirects: 0 })).status()).toBe(307);
    // Both circle membership and coordinator status fail the same creator endpoint.
    await creator.page.getByLabel("I confirm cancellation for every family.").check();
    await deniedReplay(creator.page, coordinator.context, () => creator.page.getByRole("button", { name: "Cancel ride", exact: true }).click(), "unavailable");
    await creator.page.goto(rideUrl);
    // Unrelated user replays an enrollment action, without any form of ride access.
    await other.page.getByLabel("Invited child", { exact: true }).check();
    const enrollmentPost = await deniedReplay(other.page, outsider.context, () => other.page.getByRole("button", { name: "Join with own riders", exact: true }).click(), "unavailable");
    await other.page.goto(rideUrl);
    const secondPage = await independent.newPage();
    await secondPage.goto("/sign-in");
    await secondPage.getByLabel("Email address").fill(other.email);
    await secondPage.getByLabel("Password", { exact: true }).fill(password);
    await secondPage.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(secondPage).toHaveURL(/\/app$/);
    await secondPage.goto(rideUrl);
    await other.page.getByLabel("Invited child", { exact: true }).check();
    await secondPage.getByLabel("Invited child", { exact: true }).check();
    await Promise.all([other.page.getByRole("button", { name: "Join with own riders", exact: true }).click(), secondPage.getByRole("button", { name: "Join with own riders", exact: true }).click()]);
    await expect.poll(async () => (await other.page.locator('p[role="alert"]').count()) + (await secondPage.locator('p[role="alert"]').count())).toBe(1);
    for (const page of [other.page, secondPage]) { await page.reload(); await expect(page.getByText("Pickup: 101 Secret Pickup, side door", { exact: true })).toBeVisible(); await expect(page.getByRole("listitem").filter({ hasText: "Invited child · booster" })).toHaveCount(1); }
    // Creator's independent stale form must not cancel the newly changed roster.
    await creator.page.getByLabel("I confirm cancellation for every family.").check();
    await creator.page.getByRole("button", { name: "Cancel ride", exact: true }).click();
    await expect(creator.page.locator('p[role="alert"]')).toContainText("current revision");
    await creator.page.reload();
    await other.page.getByLabel("Invited child", { exact: true }).uncheck();
    await other.page.getByRole("button", { name: "Save own riders", exact: true }).click();
    await expect(other.page.getByText("Only the minimal invitation summary", { exact: false })).toBeVisible();
    await other.page.getByRole("button", { name: "Decline ride", exact: true }).click();
    await expect(other.page.getByText("Participation: declined", { exact: false })).toBeVisible();
    await other.page.getByLabel("Invited child", { exact: true }).check();
    await other.page.getByRole("button", { name: "Join with own riders", exact: true }).click();
    await expect(other.page.getByText("Pickup: 101 Secret Pickup, side door", { exact: true })).toBeVisible();
    await plan(creator.page, "return");
    await creator.page.goto("/app/schedule?date=2027-11-07&timezone=America%2FDenver");
    await expect(creator.page.getByRole("listitem")).toHaveCount(2);
    await expect(creator.page.getByText("Outbound · Unassigned", { exact: false })).toBeVisible();
    await expect(creator.page.getByText("Return · Unassigned", { exact: false })).toBeVisible();
    await creator.page.goto("/app/schedule?date=2028-06-01&timezone=UTC");
    await expect(creator.page.getByText("No rides in this week.", { exact: false })).toBeVisible();
    for (const date of ["2021-03-16", "2021-03-23"]) {
      await creator.page.goto(`/app/schedule?date=${date}&timezone=Asia%2FTehran`);
      await expect(creator.page.getByText("No rides in this week.", { exact: false })).toBeVisible();
      await expect(creator.page.locator('p[role="alert"]')).toHaveCount(0);
    }
    await creator.page.goto("/app/attention"); await expect(creator.page.getByRole("heading", { name: "Participating rides needing a driver" })).toBeVisible();
    await creator.page.goto(rideUrl);
    // Use keyboard and a narrow screen for the final irreversible-in-app operation.
    await creator.page.setViewportSize({ width: 390, height: 844 });
    expect(await creator.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await creator.page.getByLabel("I confirm cancellation for every family.").check();
    await creator.page.getByRole("button", { name: "Cancel ride", exact: true }).focus(); await creator.page.keyboard.press("Enter");
    await expect(creator.page.getByText("The creator cancelled this ride.", { exact: false })).toBeVisible();
    await creator.page.reload(); await other.page.reload();
    await expect(other.page.getByText("The creator cancelled this ride.", { exact: false })).toBeVisible();
    await expect(other.page.getByRole("button", { name: "Save own riders", exact: true })).toHaveCount(0);
    await coordinator.page.goto(circleUrl);
    const removal = coordinator.page.locator("li").filter({ hasText: "Invited browser family" });
    await removal.getByLabel("I confirm this family’s removal from the circle.").check();
    await removal.getByRole("button", { name: "Remove family from circle", exact: true }).click();
    await expect(removal).toHaveCount(0);
    await other.page.reload(); await expect(other.page.getByRole("heading", { name: "Ride unavailable" })).toBeVisible();
    await secondPage.reload(); await expect(secondPage.getByRole("heading", { name: "Ride unavailable" })).toBeVisible();
    // A removed session also cannot replay its formerly authorized endpoint.
    await replay(enrollmentPost, other.context, "unavailable");
    await creator.page.goto(creatorFamily);
    await expect(creator.page.getByRole("heading", { name: "Creator browser family" })).toBeVisible();
  } finally { await Promise.all([creator.context.close(), other.context.close(), coordinator.context.close(), outsider.context.close(), independent.close()]); }
});
