import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PlanRideDialog } from "@/components/plan-ride";
import { RideCard } from "@/components/ride-card";
import { getMe, getRides, getTeam } from "@/lib/pool/data";
import { addDays, keyLabel, localDateKey, localInputValue, weekStart } from "@/lib/pool/time";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage({ params, searchParams }: PageProps<"/t/[teamId]/schedule">) {
  const { teamId } = await params;
  const query = await searchParams;
  const [me, team] = await Promise.all([getMe(), getTeam(teamId)]);
  const zone = team.team.timezone;
  const now = new Date();
  const today = localDateKey(now, zone);
  const day = typeof query.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.day) ? query.day : today;
  const monday = weekStart(day);
  const days = Array.from({ length: 7 }, (_, n) => addDays(monday, n));

  // Fetch a day either side in UTC, then group by the team's local date.
  const rides = (await getRides(teamId, `${addDays(monday, -1)}T00:00:00Z`, `${addDays(monday, 8)}T00:00:00Z`)).filter(
    (r) => r.status !== "cancelled",
  );
  const byDay = new Map(days.map((key) => [key, rides.filter((r) => localDateKey(new Date(r.starts_at), zone) === key)]));
  const week = days.flatMap((key) => byDay.get(key) ?? []);
  const selected = byDay.get(day) ?? [];
  const familyId = me.household?.id ?? null;
  const base = `/t/${teamId}/schedule`;

  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">
            Week of {keyLabel(monday).long.replace(/^\w+, /, "")}
          </p>
          <h1 tabIndex={-1}>A smoother week, together.</h1>
          <p>Every pickup and ride home, in one place.</p>
        </div>
        <PlanRideDialog
          teamId={teamId}
          riders={[...team.children.values()].map((c) => ({ id: c.id, name: c.first_name, mine: c.family_id === familyId }))}
          defaultStart={`${day < today ? today : day}T16:10`}
          minStart={localInputValue(now, zone)}
          seats={me.profile?.seats ?? 0}
          zoneLabel={`Times are in ${zone.replace("_", " ")}`}
        />
      </div>

      <div className="week-head">
        <Link className="icon-button" href={`${base}?day=${addDays(monday, -7)}`} aria-label="Previous week">
          <Icon name="back" />
        </Link>
        <Link className="icon-button" href={`${base}?day=${addDays(monday, 7)}`} aria-label="Next week">
          <Icon name="arrow" />
        </Link>
        {day !== today ? (
          <Link className="button plain" href={base}>
            This week
          </Link>
        ) : null}
      </div>
      <div className="week-summary">
        <span>
          <Icon name="check" size={18} />
          {week.filter((r) => r.driver_id).length} with drivers
        </span>
        <span>
          <Icon name="warning" size={18} />
          {week.filter((r) => !r.driver_id).length} need a driver
        </span>
      </div>
      <nav className="day-picker" aria-label="Choose a day">
        {days.map((key) => {
          const label = keyLabel(key);
          const count = byDay.get(key)?.length ?? 0;
          return (
            <Link key={key} href={`${base}?day=${key}`} aria-current={key === day ? "date" : undefined} aria-label={`${label.long}, ${count} rides`}>
              <span>{label.weekday}</span>
              <strong>{label.day}</strong>
              <small>{count ? `${count} ${count === 1 ? "ride" : "rides"}` : "None"}</small>
            </Link>
          );
        })}
      </nav>

      <div className="section-head">
        <h2>{keyLabel(day).long}</h2>
      </div>
      <div className="ride-grid">
        {selected.length ? (
          selected.map((ride) => <RideCard key={ride.id} ride={ride} team={team} meId={me.id} />)
        ) : (
          <div className="empty card">
            <Icon name="leaf" size={32} />
            <h3>A little room to breathe.</h3>
            <p>No rides planned for this day.</p>
          </div>
        )}
      </div>

      <aside className="helper">
        <Icon name="users" size={26} />
        <div>
          <h3>Plans change. Everyone stays in the loop.</h3>
          <p>
            A suggested swap keeps the current driver until everyone confirms. If a driver steps off a ride, it stays uncovered until a new
            driver is approved.
          </p>
        </div>
      </aside>
    </>
  );
}
