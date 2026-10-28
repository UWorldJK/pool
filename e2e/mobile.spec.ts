import { expect, test } from "@playwright/test";
import { onboard, signIn, testEmail } from "./helpers";

// Phone width: bottom navigation, no sideways scrolling, dialogs fit the screen.
test("the app works at phone width", async ({ browser }) => {
  const run = Date.now().toString(36);
  const page = await signIn(browser, testEmail("phone", run));
  await page.setViewportSize({ width: 390, height: 844 });
  await onboard(page, { name: "Pat Phone", seats: 2, family: "Phone", child: "Kai" });
  await page.getByText("Start a new team instead").click();
  await page.getByLabel("Team name").fill(`Mobile ${run}`);
  await page.getByRole("button", { name: "Start team" }).click();

  const mobileNav = page.getByRole("navigation", { name: "Mobile primary" });
  await expect(mobileNav).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary", exact: true })).toBeHidden();

  for (const label of ["Schedule", "My circle", "Activity", "Today"]) {
    await mobileNav.getByRole("link", { name: label }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${label} scrolls sideways`).toBeLessThanOrEqual(0);
  }

  await page.getByRole("button", { name: "Plan a ride" }).first().click();
  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});
