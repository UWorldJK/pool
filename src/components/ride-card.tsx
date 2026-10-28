import Link from "next/link";
import type { RideWithDetails, TeamData } from "@/lib/pool/data";
import { firstName, listNames, rideTag } from "@/lib/pool/rides";
import { dateTile, formatTime } from "@/lib/pool/time";
import { Avatar, Route, Tag } from "./bits";
import { Icon } from "./icon";

export function riderNames(ride: RideWithDetails, team: TeamData) {
  return listNames(ride.riders.map((r) => team.children.get(r.child_id)?.first_name ?? "A rider"));
}

export function RideCard({ ride, team, meId }: { ride: RideWithDetails; team: TeamData; meId: string }) {
  const zone = team.team.timezone;
  const start = new Date(ride.starts_at);
  const tile = dateTile(start, zone);
  const tag = rideTag(ride);
  const driver = ride.driver_id ? team.people.get(ride.driver_id) : null;
  const proposed = ride.request?.effectiveStatus === "pending" ? team.people.get(ride.request.proposed_driver) : null;

  return (
    <article className="ride-card card">
      <div className="ride-top">
        <div className="date-tile">
          <span>{tile.weekday}</span>
          <strong>{tile.day}</strong>
        </div>
        <div>
          <h3>{ride.title}</h3>
          <p>{formatTime(start, zone)} pickup</p>
        </div>
        <Tag {...tag} />
      </div>
      <Route pickup={ride.pickup} dropoff={ride.dropoff} />
      <p className="riders-line">
        <Icon name="users" size={16} /> {riderNames(ride, team)}
      </p>
      <div className="ride-bottom">
        <div className="row">
          {driver ? (
            <>
              <Avatar id={driver.id} name={driver.name} size="small" />
              <span>
                {driver.name}
                {driver.id === meId ? " · you" : ""}
              </span>
            </>
          ) : (
            <>
              <span className="empty-avatar">
                <Icon name="car" size={18} />
              </span>
              <span>{proposed ? `${firstName(proposed.name)} is proposed` : "Your circle can help"}</span>
            </>
          )}
        </div>
        <Link
          className="button plain"
          href={`/t/${team.team.id}/rides/${ride.id}`}
          aria-label={`Details for ${ride.title}, ${tile.weekday} ${tile.day}`}
        >
          <span>Details</span>
          <Icon name="chevron" size={18} />
        </Link>
      </div>
    </article>
  );
}
