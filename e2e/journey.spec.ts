import { expect, test } from "@playwright/test";
import { localInput, onboard, signIn, testEmail } from "./helpers";

// Two families from first sign in to a completed ride, through the real UI.
// Covers spec rules 1, 3, 7 and 8 end to end; pgTAP covers every rule in depth.
test("two families plan, approve, drive and hand off a ride", async ({ browser }) => {
  const run = Date.now().toString(36);

  // Alex starts the team.
  const alex = await signIn(browser, testEmail("alex", run));
  await onboard(alex, { name: "Alex Morgan", seats: 3, family: "Morgan", child: "Emma" });
  await alex.getByText("Start a new team instead").click();
  await alex.getByLabel("Team name").fill(`Northside ${run}`);
  await alex.getByRole("button", { name: "Start team" }).click();
  await expect(alex.getByRole("heading", { name: "Nothing on the road for your family." })).toBeVisible();
  const teamUrl = new URL(alex.url()).pathname;

  await alex.getByRole("link", { name: "My circle" }).first().click();
  await alex.getByRole("button", { name: "Create invite link" }).click();
  const inviteLink = await alex.getByLabel("Link ready. It works for 7 days.").inputValue();
  expect(inviteLink).toMatch(/\/invite\/[0-9a-f]{64}$/);

  // Sarah joins from the invite link and adds Lucas to the team.
  const sarah = await signIn(browser, testEmail("sarah", run));
  await onboard(sarah, { name: "Sarah Chen", seats: 3, family: "Chen", child: "Lucas" });
  await sarah.getByLabel("Team invite link").fill(inviteLink);
  await sarah.getByRole("button", { name: "Join team" }).click();
  await expect(sarah.getByRole("heading", { name: /Who rides with Northside/ })).toBeVisible();
  await sarah.getByRole("button", { name: "Save riders" }).click();
  await expect(sarah).toHaveURL(new RegExp(`${teamUrl}$`));

  // Alex plans a ride for Emma and Lucas without a driver.
  await alex.goto(teamUrl);
  await alex.getByRole("button", { name: "Plan a ride" }).first().click();
  const plan = alex.getByRole("dialog");
  await plan.getByLabel("Day and pickup time").fill(localInput(2));
  await plan.getByLabel("Pickup point").fill("Maple Grove");
  await plan.getByLabel("Drop-off").fill("Meadow Park");
  await plan.getByRole("checkbox", { name: "Lucas" }).check();
  await plan.getByRole("button", { name: "Save ride" }).click();
  await expect(plan).toBeHidden();
  await expect(alex.getByRole("heading", { name: /Emma's ride today at .* needs a driver\./ })).toBeVisible();

  // Sarah offers to drive. Morgan has not approved her, so it becomes a request.
  await sarah.reload();
  await sarah.getByRole("link", { name: "Find a driver" }).first().click();
  await sarah.getByRole("button", { name: "I can drive" }).click();
  const offer = sarah.getByRole("dialog");
  await expect(offer).toContainText("the Morgan family approve you");
  await offer.getByRole("checkbox", { name: /passenger seats/ }).check();
  await offer.getByRole("button", { name: "Send my offer" }).click();
  await expect(sarah.getByText("No confirmed driver")).toBeVisible();
  await expect(sarah.getByText(/Waiting for the Morgan family/)).toBeVisible();

  // Alex approves Sarah for this ride; she is assigned in the same step.
  await alex.reload();
  await alex.getByRole("link", { name: "Review" }).click();
  await alex.getByRole("button", { name: "Approve Sarah" }).click();
  await expect(alex.getByText("Approved. The new driver is confirmed.")).toBeVisible();
  await expect(alex.getByText("Sarah Chen", { exact: true }).first()).toBeVisible();

  // Sarah drives: both pickups, then both arrivals.
  await sarah.reload();
  for (const name of ["Emma", "Lucas"]) {
    await sarah.getByRole("button", { name: `${name} is in the car` }).click();
    await expect(sarah.getByRole("button", { name: `Arrived with ${name}` })).toBeVisible();
  }
  await expect(sarah.getByText("On the way").first()).toBeVisible();
  for (const name of ["Emma", "Lucas"]) {
    await sarah.getByRole("button", { name: `Arrived with ${name}` }).click();
    await expect(sarah.getByRole("button", { name: `Arrived with ${name}` })).toBeHidden();
  }

  // Sarah cannot confirm Emma's handoff: only Lucas's button is hers.
  await sarah.reload();
  await expect(sarah.getByRole("button", { name: "Confirm handoff" })).toHaveCount(1);

  // Alex confirms Emma from Today's Needs attention.
  await alex.goto(teamUrl);
  await expect(alex.getByText("Emma's handoff is waiting for you")).toBeVisible();
  await alex.getByRole("button", { name: "Confirm handoff" }).first().click();
  const handoff = alex.getByRole("dialog", { name: "Is Emma with you?" });
  await handoff.getByRole("button", { name: "Confirm handoff" }).click();
  // The browser blocks the submit until the box is ticked; the server checks again.
  await expect(handoff).toBeVisible();
  await expect(handoff.getByRole("checkbox", { name: "I confirm Emma is with me now." })).toHaveJSProperty("validity.valueMissing", true);
  await handoff.getByRole("checkbox", { name: "I confirm Emma is with me now." }).check();
  await handoff.getByRole("button", { name: "Confirm handoff" }).click();
  await expect(alex.getByRole("heading", { name: "Emma's handoff is confirmed." })).toBeVisible();

  // Sarah confirms Lucas, which completes the ride.
  await sarah.reload();
  await sarah.getByRole("button", { name: "Confirm handoff" }).click();
  const own = sarah.getByRole("dialog", { name: "Is Lucas with you?" });
  await own.getByRole("checkbox", { name: "I confirm Lucas is with me now." }).check();
  await own.getByRole("button", { name: "Confirm handoff" }).click();
  await expect(sarah.getByText("Ride complete").first()).toBeVisible();

  await alex.getByRole("link", { name: "Activity" }).first().click();
  await expect(alex.getByRole("heading", { name: /is complete$/ })).toBeVisible();
  await expect(alex.getByRole("heading", { name: /Morgan family approved Sarah Chen/ })).toBeVisible();
});

test("people outside a team cannot open it", async ({ browser }) => {
  const run = Date.now().toString(36);
  const owner = await signIn(browser, testEmail("owner", run));
  await onboard(owner, { name: "Olive Owner", seats: 2, family: "Owner", child: "Zed" });
  await owner.getByText("Start a new team instead").click();
  await owner.getByLabel("Team name").fill(`Private ${run}`);
  await owner.getByRole("button", { name: "Start team" }).click();
  await expect(owner.getByRole("heading", { name: "Nothing on the road for your family." })).toBeVisible();
  const teamUrl = new URL(owner.url()).pathname;

  const stranger = await signIn(browser, testEmail("stranger", run));
  const response = await stranger.goto(teamUrl);
  expect(response?.status()).toBe(404);
  await expect(stranger.getByRole("heading", { name: "We couldn't find that." })).toBeVisible();

  const signedOut = await (await browser.newContext()).newPage();
  await signedOut.goto(teamUrl);
  await expect(signedOut).toHaveURL(/\/login\?next=/);
});
