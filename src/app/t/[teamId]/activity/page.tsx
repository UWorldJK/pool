import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/bits";
import { Icon, type IconName } from "@/components/icon";
import { getActivity, getTeam } from "@/lib/pool/data";
import { formatDay, formatTime } from "@/lib/pool/time";

export const metadata: Metadata = { title: "Activity" };

const icons: Record<string, IconName> = {
  picked_up: "car",
  arrived: "home",
  handed_off: "check",
  ride_completed: "check",
  driver_released: "warning",
  driver_unassigned: "warning",
  request_declined: "info",
  family_declined: "info",
  ride_cancelled: "close",
  rides_planned: "calendar",
  member_joined: "users",
  approval_granted: "shield",
  approval_revoked: "shield",
};

export default async function ActivityPage({ params }: PageProps<"/t/[teamId]/activity">) {
  const { teamId } = await params;
  const [team, events] = await Promise.all([getTeam(teamId), getActivity(teamId)]);
  const zone = team.team.timezone;

  return (
    <>
      <PageIntro eyebrow="Everyone on the same page" title="The latest, all together.">
        What changed and who did it. Newest first.
      </PageIntro>
      <div className="card activity-list">
        {events.length ? (
          events.map((event) => (
            <article key={event.id}>
              <span className="timeline-dot">
                <Icon name={icons[event.kind] ?? "activity"} size={18} />
              </span>
              <div>
                <h2>{event.summary}</h2>
                {event.detail ? <p>{event.detail}</p> : null}
                <small>
                  {formatDay(new Date(event.created_at), zone)} · {formatTime(new Date(event.created_at), zone)}
                  {event.ride_id ? (
                    <>
                      {" · "}
                      <Link href={`/t/${teamId}/rides/${event.ride_id}`}>View ride</Link>
                    </>
                  ) : null}
                </small>
              </div>
            </article>
          ))
        ) : (
          <p className="py-6">Nothing yet. Plan a ride and it shows up here.</p>
        )}
      </div>
    </>
  );
}
