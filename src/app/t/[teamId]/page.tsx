import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Route, Tag } from "@/components/bits";
import { Icon } from "@/components/icon";
import { PlanRideDialog } from "@/components/plan-ride";
import { HandoffDialog } from "@/components/ride-actions";
import { RideCard, riderNames } from "@/components/ride-card";
import { RiderTimeline } from "@/components/rider-timeline";
import { attentionWindow, getMe, getRides, getTeam, type RideWithDetails, type TeamData } from "@/lib/pool/data";
import { attentionItems, firstName, involvesMe, isMyChild, listNames, riderStage, rideTag } from "@/lib/pool/rides";
import { formatDay, formatTime, localDateKey, localInputValue } from "@/lib/pool/time";

export const metadata: Metadata = { title: "Today" };

type MeRef = { id: string; familyId: string | null };

function pickFocus(rides: RideWithDetails[], me: MeRef, team: TeamData, now: Date) {
  const zone = team.team.timezone;
  const today = localDateKey(now, zone);
  const mine = rides.filter((r) => r.status !== "cancelled" && involvesMe(r, me, team));
  return (
    mine.find((r) => r.status === "in_progress") ??
    mine.find((r) => r.status === "scheduled" && localDateKey(new Date(r.starts_at), zone) === today) ??
    [...mine].reverse().find((r) => r.status === "completed" && localDateKey(new Date(r.starts_at), zone) === today) ??
    mine.find((r) => r.status === "scheduled" && new Date(r.starts_at) > now) ??
    null
  );
}

function at(value: string | null, zone: string) {
  return value ? formatTime(new Date(value), zone) : "";
}

function heroCopy(ride: RideWithDetails, me: MeRef, team: TeamData) {
  const zone = team.team.timezone;
  const start = new Date(ride.starts_at);
  const driver = ride.driver_id ? team.people.get(ride.driver_id) : null;
  const driverFirst = driver ? firstName(driver.name) : "";
  const time = formatTime(start, zone);
  const isToday = localDateKey(start, zone) === localDateKey(new Date(), zone);
  const when = isToday ? `today at ${time}` : `${formatDay(start, zone)} at ${time}`;

  if (ride.driver_id === me.id) {
    if (ride.status === "completed") return { title: "Every handoff is confirmed.", sub: `Thanks for driving ${ride.title}.`, big: "Done", detail: "Ride complete", tone: "green" as const };
    if (ride.status === "in_progress") {
      const left = ride.riders.filter((r) => riderStage(r) !== "handed_off").length;
      const firstPickup = ride.riders.map((r) => r.picked_up_at).filter(Boolean).sort()[0] ?? null;
      return { title: `You're driving ${ride.title}.`, sub: `${left} of ${ride.riders.length} riders still with you. Check off each step when it's safe.`, big: "On the road", detail: `First pickup at ${at(firstPickup, zone)}`, tone: "green" as const };
    }
    return { title: `You're driving ${ride.title} ${when}.`, sub: `${riderNames(ride, team)}. Mark each pickup when they're in the car.`, big: time, detail: "Pickup time", tone: "green" as const };
  }

  const myRiders = ride.riders.filter((r) => isMyChild(r.child_id, me.familyId, team));
  const names = listNames(myRiders.map((r) => team.children.get(r.child_id)?.first_name ?? "Your child"));
  const stages = myRiders.map(riderStage);

  if (stages.includes("arrived")) {
    const arrived = myRiders.find((r) => riderStage(r) === "arrived")!;
    return { title: `${driverFirst} has arrived. You're up next.`, sub: `Confirm only when ${names} ${myRiders.length > 1 ? "are" : "is"} with you.`, big: "Your turn", detail: `${driverFirst} reported arrival at ${at(arrived.arrived_at, zone)}`, tone: "amber" as const };
  }
  if (stages.length && stages.every((s) => s === "handed_off")) {
    return { title: `${names}'s handoff is confirmed.`, sub: `${names} ${myRiders.length > 1 ? "are" : "is"} with your family. This ride is done for you.`, big: at(myRiders[0].handed_off_at, zone), detail: "Handoff confirmed", tone: "green" as const };
  }
  if (stages.includes("picked_up")) {
    const picked = myRiders.find((r) => r.picked_up_at)!;
    return { title: `${names} ${myRiders.length > 1 ? "are" : "is"} on the way.`, sub: `${driverFirst} picked up ${names} at ${at(picked.picked_up_at, zone)}. You'll confirm the handoff when ${driverFirst} arrives.`, big: at(picked.picked_up_at, zone), detail: "Picked up · no live location", tone: "green" as const };
  }
  if (!ride.driver_id) {
    return { title: `${names}'s ride ${when} needs a driver.`, sub: "Offer to drive, or ask someone in your circle.", big: time, detail: "Pickup time · no driver yet", tone: "amber" as const };
  }
  return { title: `${names}'s next ride is ${when}.`, sub: `${driver?.name ?? "A parent"} is driving.`, big: time, detail: "Pickup time", tone: "green" as const };
}

export default async function TodayPage({ params }: PageProps<"/t/[teamId]">) {
  const { teamId } = await params;
  const [me, team] = await Promise.all([getMe(), getTeam(teamId)]);
  const now = new Date();
  const rides = await getRides(teamId, ...attentionWindow(now));
  const meRef = { id: me.id, familyId: me.household?.id ?? null };
  const zone = team.team.timezone;
  const focus = pickFocus(rides, meRef, team, now);
  const items = attentionItems(rides, meRef, team, now);
  const noRiders = !!me.household?.children.length && ![...team.children.values()].some((c) => c.family_id === meRef.familyId);
  const upcoming = rides
    .filter((r) => r.id !== focus?.id && r.status === "scheduled" && new Date(r.starts_at) > now)
    .filter((r) => involvesMe(r, meRef, team) || !r.driver_id)
    .slice(0, 4);
  const hero = focus ? heroCopy(focus, meRef, team) : null;
  const ids = focus ? { teamId, rideId: focus.id } : null;
  const isDriver = focus?.driver_id === me.id;
  const driver = focus?.driver_id ? team.people.get(focus.driver_id) : null;
  // When the driver has arrived with your child, the handoff is the one next step.
  const handoffChild =
    focus?.status === "in_progress"
      ? focus.riders.find((r) => riderStage(r) === "arrived" && isMyChild(r.child_id, meRef.familyId, team))
      : undefined;

  const plan = (
    <PlanRideDialog
      teamId={teamId}
      riders={[...team.children.values()].map((c) => ({ id: c.id, name: c.first_name, mine: c.family_id === meRef.familyId }))}
      defaultStart={localInputValue(new Date(now.getTime() + 24 * 3600 * 1000), zone).slice(0, 11) + "16:10"}
      minStart={localInputValue(now, zone)}
      seats={me.profile?.seats ?? 0}
      zoneLabel={`Times are in ${zone.replace("_", " ")}`}
      variant="secondary"
    />
  );

  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">{formatDay(now, zone)}</p>
          <h1 tabIndex={-1}>{hero ? hero.title : "Nothing on the road for your family."}</h1>
          <p>{hero ? hero.sub : "When a ride with your children or your car comes up, it shows here."}</p>
        </div>
        {plan}
      </div>

      {focus && hero && ids ? (
        <section className="journey card" aria-labelledby="journey-title">
          <div className="journey-info">
            <div className="section-head">
              <span className="eyebrow">{isDriver ? "Your drive" : "Your family's ride"}</span>
              {handoffChild ? <Tag label="Handoff needed" tone="amber" /> : <Tag {...rideTag(focus)} />}
            </div>
            <h2 id="journey-title">{focus.title}</h2>
            <Route pickup={focus.pickup} dropoff={focus.dropoff} />
            <div className={`arrival ${hero.tone === "amber" ? "amber" : ""}`}>
              <strong>{hero.big}</strong>
              <span>{hero.detail}</span>
            </div>
            {driver ? (
              <div className="driver">
                <Avatar id={driver.id} name={driver.name} />
                <div>
                  <strong>
                    {driver.name}
                    {driver.id === me.id ? <span className="muted"> · you</span> : null}
                  </strong>
                  <p>
                    {driver.vehicle ?? "Car not listed"}
                    {driver.plateLast3 ? ` · plate ending ${driver.plateLast3}` : ""}
                  </p>
                  <p className="approval-note">
                    <Icon name="shield" size={14} /> Approved by every rider&apos;s family
                  </p>
                </div>
              </div>
            ) : null}
            <div className="journey-actions">
              {handoffChild ? (
                <HandoffDialog
                  ids={ids}
                  childId={handoffChild.child_id}
                  childName={team.children.get(handoffChild.child_id)?.first_name ?? "your child"}
                  driverName={driver ? firstName(driver.name) : "The driver"}
                />
              ) : null}
              <Link className={`button ${handoffChild ? "secondary" : "primary"}`} href={`/t/${teamId}/rides/${focus.id}`}>
                <Icon name="arrow" size={18} />
                <span>Ride details</span>
              </Link>
              {driver && driver.id !== me.id && driver.phone ? (
                <a className="button plain" href={`tel:${driver.phone}`}>
                  <Icon name="phone" size={18} />
                  <span>Call {firstName(driver.name)}</span>
                </a>
              ) : null}
            </div>
          </div>
          <div className="journey-side">
            <span className="eyebrow">Riders</span>
            <RiderTimeline ride={focus} team={team} me={meRef} />
            <div className="footer-note">
              <Icon name="shield" size={17} />
              <p>Only {focus.riders.length > 1 ? "each child's" : "the child's"} family can confirm a handoff. Pool has no live location.</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="attention-title">
        <div className="section-head">
          <h2 id="attention-title">
            Needs attention <span className="number">{items.length + (noRiders ? 1 : 0)}</span>
          </h2>
        </div>
        {noRiders ? (
          <div className="task">
            <span className="task-icon neutral">
              <Icon name="users" />
            </span>
            <div>
              <strong>Add your riders to {team.team.name}</strong>
              <p>Choose which of your children ride with this team so rides can include them.</p>
            </div>
            <Link className="button outline" href={`/t/${teamId}/riders`}>
              Choose riders
            </Link>
          </div>
        ) : null}
        {items.map((item) => {
          const ride = item.ride;
          const day = `${formatDay(new Date(ride.starts_at), zone)} · ${formatTime(new Date(ride.starts_at), zone)}`;
          const proposed = ride.request ? team.people.get(ride.request.proposed_driver) : null;
          const key = `${item.kind}-${ride.id}-${"childId" in item ? item.childId : ""}`;
          if (item.kind === "handoff") {
            const name = team.children.get(item.childId)?.first_name ?? "Your child";
            return (
              <div className="task" key={key}>
                <span className="task-icon">
                  <Icon name="home" />
                </span>
                <div>
                  <strong>{name}&apos;s handoff is waiting for you</strong>
                  <p>{ride.driver_id ? firstName(team.people.get(ride.driver_id)?.name ?? "The driver") : "The driver"} reported arrival. Confirm when {name} is with you.</p>
                </div>
                <HandoffDialog
                  ids={{ teamId, rideId: ride.id }}
                  childId={item.childId}
                  childName={name}
                  driverName={ride.driver_id ? firstName(team.people.get(ride.driver_id)?.name ?? "The driver") : "The driver"}
                />
              </div>
            );
          }
          const copy =
            item.kind === "decide"
              ? { icon: "shield" as const, title: `Approve ${proposed?.name ?? "a driver"} for ${ride.title}?`, body: `${day}. Your family's answer is needed.`, cta: "Review" }
              : item.kind === "respond"
                ? { icon: "car" as const, title: `You were asked to drive ${ride.title}`, body: `${day}. Accept or decline.`, cta: "Review" }
                : { icon: "warning" as const, title: `${ride.title} needs a driver`, body: `${day} · ${riderNames(ride, team)}`, cta: "Find a driver" };
          return (
            <div className="task" key={key}>
              <span className={`task-icon ${item.kind === "respond" ? "neutral" : ""}`}>
                <Icon name={copy.icon} />
              </span>
              <div>
                <strong>{copy.title}</strong>
                <p>{copy.body}</p>
              </div>
              <Link className="button outline" href={`/t/${teamId}/rides/${ride.id}`}>
                {copy.cta}
              </Link>
            </div>
          );
        })}
        {items.length === 0 && !noRiders ? (
          <div className="all-set">
            <Icon name="check" />
            <div>
              <strong>You&apos;re all caught up.</strong>
              <p>Your family&apos;s rides this week have drivers. We&apos;ll keep the plan here.</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="section" aria-labelledby="up-next">
        <div className="section-head">
          <div>
            <p className="eyebrow">A little planning goes a long way</p>
            <h2 id="up-next">Coming up</h2>
          </div>
          <Link className="button plain" href={`/t/${teamId}/schedule`}>
            <span>View the week</span>
            <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="ride-grid">
          {upcoming.length ? (
            upcoming.map((ride) => <RideCard key={ride.id} ride={ride} team={team} meId={me.id} />)
          ) : (
            <div className="empty card">
              <Icon name="leaf" size={32} />
              <h3>A little room to breathe.</h3>
              <p>No rides for your family in the next week.</p>
              {plan}
            </div>
          )}
        </div>
      </section>

      <div className="privacy-note">
        <Icon name="lock" size={17} />
        <span>Ride details stay with the families on {team.team.name}. Joining the team never grants driver approval.</span>
      </div>
    </>
  );
}
