import assert from "node:assert/strict";
import test from "node:test";

const { safeNextPath } = await import("../src/lib/pool/paths.ts");
const { poolErrorCode, poolErrorMessage } = await import("../src/lib/pool/errors.ts");
const { inviteToken, integer, uuids, checked } = await import("../src/lib/pool/form.ts");
const time = await import("../src/lib/pool/time.ts");
const rides = await import("../src/lib/pool/rides.ts");

test("safeNextPath keeps same-origin paths and refuses everything else", () => {
  assert.equal(safeNextPath("/t/abc?x=1"), "/t/abc?x=1");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null]) {
    assert.equal(safeNextPath(bad), "/", String(bad));
  }
});

test("database error codes map to plain sentences", () => {
  assert.equal(poolErrorCode({ message: "POOL:SEATS" }), "SEATS");
  assert.match(poolErrorMessage({ message: "POOL:SEATS" }), /passenger seats/);
  assert.match(poolErrorMessage({ message: "POOL:NOT_A_REAL_CODE" }), /Something went wrong/);
  assert.match(poolErrorMessage({ message: "new row violates check", code: "23514" }), /isn't right/);
  assert.match(poolErrorMessage({ message: "connection refused" }), /Something went wrong/);
  assert.match(poolErrorMessage(null), /Something went wrong/);
});

test("form readers clamp and filter input", () => {
  const form = new FormData();
  form.append("seats", "99");
  form.append("child", "not-a-uuid");
  form.append("child", "213d81b9-0dc0-406b-a07e-9b233010216e");
  form.append("ok", "on");
  assert.equal(integer(form, "seats", 0, 8, 0), 8);
  assert.equal(integer(form, "missing", 0, 8, 3), 3);
  assert.deepEqual(uuids(form, "child"), ["213d81b9-0dc0-406b-a07e-9b233010216e"]);
  assert.equal(checked(form, "ok"), true);
  assert.equal(checked(form, "missing"), false);
});

test("inviteToken accepts a full link or a bare token", () => {
  const token = "a".repeat(64);
  assert.equal(inviteToken(`https://pool.example/invite/${token}`), token);
  assert.equal(inviteToken(`  ${token.toUpperCase()} `), token);
  assert.equal(inviteToken("https://pool.example/invite/short"), null);
});

test("dates are grouped and labelled in the team's time zone", () => {
  // 02:30 UTC on Oct 28 is still Oct 27 in Denver.
  const late = new Date("2026-10-28T02:30:00Z");
  assert.equal(time.localDateKey(late, "America/Denver"), "2026-10-27");
  assert.equal(time.localDateKey(late, "America/New_York"), "2026-10-27");
  assert.equal(time.formatTime(late, "America/Denver"), "8:30 PM");
  assert.equal(time.localInputValue(late, "America/Denver"), "2026-10-27T20:30");
});

test("week helpers start on Monday and cross month ends", () => {
  assert.equal(time.weekStart("2026-11-01"), "2026-10-26");
  assert.equal(time.weekStart("2026-10-26"), "2026-10-26");
  assert.equal(time.addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(time.keyLabel("2026-10-30").long, "Friday, Oct 30");
  assert.equal(time.isValidLocalDateTime("2026-10-30T16:10"), true);
  assert.equal(time.isValidLocalDateTime("2026-10-30 16:10; drop table"), false);
});

const team = {
  children: new Map([
    ["emma", { id: "emma", family_id: "morgan", first_name: "Emma" }],
    ["lucas", { id: "lucas", family_id: "chen", first_name: "Lucas" }],
    ["oliver", { id: "oliver", family_id: "brooks", first_name: "Oliver" }],
  ]),
  families: new Map([
    ["morgan", { id: "morgan", name: "Morgan", adultIds: ["alex"] }],
    ["chen", { id: "chen", name: "Chen", adultIds: ["sarah"] }],
    ["brooks", { id: "brooks", name: "Brooks", adultIds: ["david"] }],
  ]),
  approvals: new Map([["lucas", new Set(["alex"])]]),
};

function ride(overrides = {}) {
  return {
    id: "r1",
    status: "scheduled",
    driver_id: null,
    starts_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    request: null,
    riders: [
      { child_id: "emma", picked_up_at: null, arrived_at: null, handed_off_at: null },
      { child_id: "lucas", picked_up_at: null, arrived_at: null, handed_off_at: null },
      { child_id: "oliver", picked_up_at: null, arrived_at: null, handed_off_at: null },
    ],
    ...overrides,
  };
}

test("familiesToAsk mirrors the database approval rule", () => {
  assert.deepEqual(rides.familiesToAsk(ride(), "alex", team), ["brooks"]);
  assert.deepEqual(rides.familiesToAsk(ride(), "sarah", team).sort(), ["brooks", "morgan"]);
});

test("ride tags never call a proposal an assignment", () => {
  const pending = { effectiveStatus: "pending" };
  assert.deepEqual(rides.rideTag(ride()), { label: "Needs a driver", tone: "amber" });
  assert.deepEqual(rides.rideTag(ride({ request: pending })), { label: "Driver pending", tone: "amber" });
  assert.deepEqual(rides.rideTag(ride({ driver_id: "alex", request: pending })), { label: "Change pending", tone: "amber" });
  assert.deepEqual(rides.rideTag(ride({ driver_id: "alex", request: { effectiveStatus: "expired" } })), {
    label: "Driver confirmed",
    tone: "green",
  });
  assert.equal(rides.rideTag(ride({ status: "cancelled" })).label, "Cancelled");
});

test("rider stages follow pickup, arrival and handoff", () => {
  const base = { picked_up_at: null, arrived_at: null, handed_off_at: null };
  assert.equal(rides.riderStage(base), "waiting");
  assert.equal(rides.riderStage({ ...base, picked_up_at: "t" }), "picked_up");
  assert.equal(rides.riderStage({ ...base, picked_up_at: "t", arrived_at: "t" }), "arrived");
  assert.equal(rides.riderStage({ picked_up_at: "t", arrived_at: "t", handed_off_at: "t" }), "handed_off");
});

test("needs attention lists handoffs first and only for your children", () => {
  const now = new Date();
  const arrived = ride({
    id: "live",
    status: "in_progress",
    driver_id: "david",
    riders: [
      { child_id: "emma", picked_up_at: "t", arrived_at: "t", handed_off_at: null },
      { child_id: "oliver", picked_up_at: "t", arrived_at: "t", handed_off_at: null },
    ],
  });
  const asking = ride({
    id: "ask",
    request: {
      effectiveStatus: "pending",
      proposed_driver: "sarah",
      driver_accepted_at: "t",
      approvals: [{ family_id: "morgan", decision: null }],
    },
  });
  const uncovered = ride({ id: "open" });
  const farAway = ride({ id: "later", starts_at: new Date(Date.now() + 20 * 86400000).toISOString() });

  const items = rides.attentionItems([uncovered, asking, arrived, farAway], { id: "alex", familyId: "morgan" }, team, now);
  assert.deepEqual(
    items.map((i) => `${i.kind}:${i.ride.id}`),
    ["handoff:live", "decide:ask", "needs_driver:open"],
  );
  const forSarah = rides.attentionItems([asking], { id: "sarah", familyId: "chen" }, team, now);
  assert.deepEqual(forSarah.map((i) => i.kind), []);
});

test("names join the way people say them", () => {
  assert.equal(rides.listNames(["Emma"]), "Emma");
  assert.equal(rides.listNames(["Emma", "Lucas"]), "Emma and Lucas");
  assert.equal(rides.listNames(["Emma", "Lucas", "Oliver"]), "Emma, Lucas and Oliver");
  assert.equal(rides.initials("Sarah  Chen"), "SC");
});
