import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { account, family } from "./helpers.mjs";
import { captureState } from "./presentation.mjs";

async function accessible(page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect(results.violations.map(({ id, nodes }) => ({ id, targets:nodes.map((n) => n.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("R8 account, onboarding and setup reflow with accessible keyboard navigation",async({browser})=>{
  const person=await account(browser,"r8-presentation");
  const page=person.page;
  try {
    await page.setViewportSize({width:390,height:844});
    await accessible(page);
    const menu=page.getByRole("button",{name:"Menu",exact:false});
    await menu.focus();await page.keyboard.press("Enter");
    const dialog=page.getByRole("dialog",{name:"Your Pool"});
    await expect(dialog).toBeVisible();await expect(dialog.getByRole("button",{name:"Close navigation"})).toBeFocused();
    await accessible(page);
    await page.keyboard.press("Shift+Tab");await expect(dialog.getByRole("link",{name:"Plan a ride",exact:false})).toBeFocused();
    await page.keyboard.press("Tab");await expect(dialog.getByRole("button",{name:"Close navigation"})).toBeFocused();
    await page.keyboard.press("Escape");await expect(dialog).not.toBeVisible();await expect(menu).toBeFocused();
    await menu.press("Enter");await dialog.getByRole("link",{name:"Weekly schedule",exact:true}).focus();await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/app\/schedule$/);await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("group",{name:"Full week"})).toBeVisible();
    await expect(page.locator(".week-day")).toHaveCount(7);await accessible(page);
    await page.goto("/app");await family(page,"Presentation family","Presentation guardian");
    await accessible(page);await captureState(page,"family");
    await page.getByLabel("Circle name").fill("Presentation circle");await page.getByRole("button",{name:"Create circle",exact:true}).click();
    await page.getByRole("link",{name:"Open saved membership"}).click();await accessible(page);await captureState(page,"circle");
    await page.goto("/app/children");await page.getByLabel("Child display name").fill("Presentation child");await page.getByRole("button",{name:"Save child",exact:true}).click();
    await expect(page.getByRole("status")).toContainText("Saved");
    await page.goto("/app/rides/new");await accessible(page);await captureState(page,"planning");
    for(const path of ["/app/children","/app/invitations","/app/vehicles","/app/driving","/app/attention"]) {
      await page.goto(path);await accessible(page);
      for(const width of [320,1440]) {await page.setViewportSize({width,height:1000});await accessible(page);}
      await page.setViewportSize({width:390,height:844});
    }
    await page.goto("/app/schedule?date=invalid&timezone=UTC");await expect(page.locator("#main-content [role=alert]")).toContainText("Choose a valid date");await accessible(page);
    // Equivalent layout viewport at 400% browser zoom on a 1280px display.
    await page.setViewportSize({width:320,height:800});await page.goto("/app");await accessible(page);
    await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"Skip to main content"})).toBeFocused();await page.keyboard.press("Enter");await expect(page.locator("#main-content")).toBeFocused();
    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole("link",{name:"Families and circles",exact:true}).focus();await expect(page.getByRole("link",{name:"Families and circles",exact:true})).toHaveAttribute("aria-current","page");
    await page.goto("/app");await page.getByLabel("Family name",{exact:true}).fill(" ");await page.getByLabel("Your display name").fill("Presentation guardian");
    await page.getByRole("button",{name:"Create family",exact:true}).click();await expect(page.locator("#main-content [role=alert]")).toBeVisible();
    await expect(page.locator(".form-outcome").filter({has:page.getByRole("alert")})).toBeFocused();await accessible(page);
    await page.emulateMedia({colorScheme:"dark"});expect(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme)).toBe("light");await accessible(page);
    await page.emulateMedia({colorScheme:"light"});
    for(const path of ["/sign-in","/sign-up","/forgot-password","/reset-password"]) {
      await page.goto(path);await accessible(page);
    }
    await page.goto("/sign-in");await captureState(page,"authentication");
  } finally {await person.context.close();}
});
