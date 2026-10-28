import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Notice, Route, Tag } from "@/components/bits";
import { Icon } from "@/components/icon";
import {
  CancelRequestForm,
  CancelRideDialog,
  ClaimDialog,
  DecideForm,
  ProposeDialog,
  ReleaseDialog,
  RespondForm,
} from "@/components/ride-actions";
import { riderNames } from "@/components/ride-card";
import { RiderTimeline } from "@/components/rider-timeline";
import { getMe, getRide, getSession, getTeam } from "@/lib/pool/data";
import { familiesToAsk, firstName, isMyChild, listNames, rideTag } from "@/lib/pool/rides";
import { formatDay, formatTime, localDateKey } from "@/lib/pool/time";

export const metadata: Metadata = { title: "Ride" };

export default async function RidePage({ params }: PageProps<"/t/[teamId]/rides/[rideId]">) {
  const { teamId, rideId } = await params;
  const [me, team, ride] = await Promise.all([getMe(), getTeam(teamId), getRide(teamId, rideId)]);
  const { supabase } = await getSession();
  const { data: events } = await supabase
    .from("activity_events")
    .select("id, summary, detail, created_at")
    .eq("ride_id", rideId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(20);

  const zone = team.team.timezone;
  const start = new Date(ride.starts_at);
  const ids = { teamId, rideId };
  const familyId = me.household?.id ?? null;
  const driver = ride.driver_id ? team.people.get(ride.driver_id) : null;
  const isDriver = ride.driver_id === me.id;
  const open = ride.status === "scheduled" && start > new Date();
  const request = ride.request;
  const pending = request?.effectiveStatus === "pending" ? request : null;
  // A missed request only matters while the ride still has no driver.
  const expired = request?.effectiveStatus === "expired" && !ride.driver_id ? request : null;
  const proposed = request ? team.people.get(request.proposed_driver) : null;
  const myRiders = ride.riders.filter((r) => isMyChild(r.child_id, familyId, team));
  const isOrganizer = team.role === "organizer";
  const canPropose = !ride.driver_id || isDriver || isOrganizer || myRiders.length > 0;
  const nameOfFamily = (id: string) => team.families.get(id)?.name ?? "A";
  const askingMe = familiesToAsk(ride, me.id, team).map((id) => `the ${nameOfFamily(id)} family`);
  const waiting = pending
    ? [
        ...(pending.driver_accepted_at ? [] : [`${firstName(proposed?.name ?? "the driver")} to accept`]),
        ...pending.approvals.filter((a) => a.decision === null).map((a) => `the ${nameOfFamily(a.family_id)} family`),
      ]
    : [];
  const myDecision = pending?.approvals.find((a) => a.family_id === familyId && a.decision === null);
  const candidates = [...team.people.values()]
    .filter((p) => p.id !== me.id && p.id !== ride.driver_id && p.seats >= ride.riders.length)
    .map((p) => {
      const asked = familiesToAsk(ride, p.id, team);
      return {
        id: p.id,
        name: p.name,
        note: asked.length ? `needs approval from ${listNames(asked.map((f) => nameOfFamily(f)))}` : "approved by every family",
      };
    });

  return (
    <>
      <Link className="button plain mb-4 -ml-2" href={`/t/${teamId}/schedule?day=${localDateKey(start, zone)}`}>
        <Icon name="back" size={18} />
        <span>Schedule</span>
      </Link>
      <div className="page-intro">
        <div>
          <p className="eyebrow">
            {formatDay(start, zone)} · {formatTime(start, zone)} pickup
          </p>
          <h1 tabIndex={-1}>{ride.title}</h1>
          <p>{riderNames(ride, team)}</p>
        </div>
        <Tag {...rideTag(ride)} />
      </div>

      <section className="journey card" aria-label="Ride plan">
        <div className="journey-info">
          <span className="eyebrow">Plan</span>
          <Route pickup={ride.pickup} dropoff={ride.dropoff} />
          {driver ? (
            <div className="driver">
              <Avatar id={driver.id} name={driver.name} />
              <div>
                <strong>
                  {driver.name}
                  {isDriver ? <span className="muted"> · you</span> : null}
                </strong>
                <p>
                  {driver.vehicle ?? "Car not listed"}
                  {driver.plateLast3 ? ` · plate ending ${driver.plateLast3}` : ""} · {driver.seats} seats
                </p>
                <p className="approval-note">
                  <Icon name="shield" size={14} /> Approved by every rider&apos;s family
                </p>
              </div>
            </div>
          ) : (
            <div className="driver">
              <span className="empty-avatar">
                <Icon name="car" size={18} />
              </span>
              <div>
                <strong>No confirmed driver</strong>
                <p>A proposed driver is not an assignment.</p>
              </div>
            </div>
          )}

          {pending ? (
            <div className="notice amber" role="region" aria-label="Driver request">
              <Icon name="clock" />
              <div>
                <strong>
                  {pending.kind === "replacement"
                    ? `${proposed?.name ?? "A driver"} is proposed to replace ${driver ? firstName(driver.name) : "the driver"}.`
                    : `${proposed?.name ?? "A driver"} is proposed for this ride.`}
                </strong>
                <p>
                  {waiting.length ? `Waiting for ${listNames(waiting)}. ` : ""}
                  Reply by {formatDay(new Date(pending.expires_at), zone)}, {formatTime(new Date(pending.expires_at), zone)}.
                  {pending.kind === "replacement" ? ` ${driver ? firstName(driver.name) : "The current driver"} stays assigned until then.` : ""}
                </p>
                {pending.proposed_driver === me.id && !pending.driver_accepted_at ? (
                  <RespondForm ids={ids} requestId={pending.id} riderCount={ride.riders.length} />
                ) : null}
                {myDecision ? (
                  <DecideForm
                    ids={ids}
                    requestId={pending.id}
                    driverName={firstName(proposed?.name ?? "this driver")}
                    childNames={listNames(myRiders.map((r) => team.children.get(r.child_id)?.first_name ?? "your child"))}
                  />
                ) : null}
                {pending.created_by === me.id || pending.proposed_driver === me.id || isOrganizer ? (
                  <CancelRequestForm ids={ids} requestId={pending.id} />
                ) : null}
              </div>
            </div>
          ) : null}
          {expired ? (
            <Notice tone="amber" icon="clock" title="A driver request missed its deadline.">
              {proposed?.name ?? "The proposed driver"} was not assigned.
            </Notice>
          ) : null}

          <div className="journey-actions">
            {open && !ride.driver_id && !pending ? (
              <ClaimDialog
                ids={ids}
                title={`${ride.title}, ${formatDay(start, zone)} at ${formatTime(start, zone)}`}
                riders={riderNames(ride, team)}
                riderCount={ride.riders.length}
                seats={me.profile?.seats ?? 0}
                asking={askingMe.length ? listNames(askingMe) : ""}
                variant="primary"
              />
            ) : null}
            {open && !pending && canPropose ? <ProposeDialog ids={ids} candidates={candidates} hasDriver={!!ride.driver_id} /> : null}
            {driver && !isDriver && driver.phone ? (
              <a className="button plain" href={`tel:${driver.phone}`}>
                <Icon name="phone" size={18} />
                <span>Call {firstName(driver.name)}</span>
              </a>
            ) : null}
            {isDriver && ride.status === "scheduled" ? <ReleaseDialog ids={ids} /> : null}
            {ride.status === "scheduled" && (ride.created_by === me.id || isOrganizer) ? <CancelRideDialog ids={ids} /> : null}
          </div>
        </div>

        <div className="journey-side">
          <span className="eyebrow">Riders</span>
          <RiderTimeline ride={ride} team={team} me={{ id: me.id, familyId }} />
          <div className="footer-note">
            <Icon name="shield" size={17} />
            <p>Pickups open three hours before the ride. Only a child&apos;s family can confirm their handoff.</p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="ride-history">
        <h2 id="ride-history" className="mb-4">
          History
        </h2>
        <div className="card activity-list">
          {(events ?? []).length ? (
            events!.map((event) => (
              <article key={event.id}>
                <span className="timeline-dot">
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <h3 className="text-[15px]">{event.summary}</h3>
                  {event.detail ? <p>{event.detail}</p> : null}
                  <small>
                    {formatDay(new Date(event.created_at), zone)} · {formatTime(new Date(event.created_at), zone)}
                  </small>
                </div>
              </article>
            ))
          ) : (
            <p className="py-6">Nothing has happened on this ride yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
