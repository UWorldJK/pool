import type { Metadata } from "next";
import Link from "next/link";
import { ApprovalToggle } from "@/components/approval-toggle";
import { Avatar, Notice, PageIntro, Tag } from "@/components/bits";
import { Icon } from "@/components/icon";
import { InviteLink } from "@/components/invite-link";
import { getMe, getTeam } from "@/lib/pool/data";
import { firstName, listNames } from "@/lib/pool/rides";

export const metadata: Metadata = { title: "My circle" };

export default async function CirclePage({ params }: PageProps<"/t/[teamId]/circle">) {
  const { teamId } = await params;
  const [me, team] = await Promise.all([getMe(), getTeam(teamId)]);
  const familyId = me.household?.id ?? null;
  const myChildren = [...team.children.values()].filter((c) => c.family_id === familyId);
  const myNames = listNames(myChildren.map((c) => c.first_name));
  const people = [...team.people.values()].sort((a, b) => (a.id === me.id ? -1 : b.id === me.id ? 1 : a.name.localeCompare(b.name)));

  return (
    <>
      <PageIntro
        eyebrow={`${team.team.name}${team.team.detail ? ` · ${team.team.detail}` : ""}`}
        title="Good people. Shared journeys."
        action={
          <Link className="button secondary" href={`/t/${teamId}/riders`}>
            <Icon name="users" size={18} />
            <span>Your riders</span>
          </Link>
        }
      >
        {myChildren.length
          ? `You choose who can drive ${myNames}. Joining the team doesn't grant that.`
          : "Add your children to this team to choose who can drive them."}
      </PageIntro>

      <Notice tone="green" icon="shield" title="Approval belongs to each family.">
        Turning on a driver here approves them for every ride with that child. Families who haven&apos;t approved a driver are asked
        ride by ride. Approval is a parent&apos;s choice, not a background check.
      </Notice>

      {team.role === "organizer" ? (
        <section className="card settings-card mt-6">
          <h2>Invite families</h2>
          <p className="mb-4">
            Share one link in your team chat. Anyone with it can join for 7 days. Joining shows them the schedule, never your approvals.
          </p>
          <InviteLink kind="team" target={teamId} label="Create invite link" />
        </section>
      ) : null}

      <div className="people-grid">
        {people.map((person) => {
          const family = person.familyId ? team.families.get(person.familyId) : null;
          const theirChildren = [...team.children.values()].filter((c) => c.family_id === person.familyId);
          const isMe = person.id === me.id;
          const sameFamily = !!familyId && person.familyId === familyId;
          const approvedFor = myChildren.filter((c) => team.approvals.get(c.id)?.has(person.id));
          return (
            <article key={person.id} className="card person-card">
              <Avatar id={person.id} name={person.name} size="large" />
              <h2>{person.name}</h2>
              <p>
                {family ? `${family.name} family` : "No household yet"}
                {theirChildren.length ? ` · ${listNames(theirChildren.map((c) => c.first_name))}` : ""}
                {isMe ? " · you" : ""}
                {person.role === "organizer" ? " · organizer" : ""}
              </p>
              {sameFamily ? (
                <Tag label="Your household" tone="green" />
              ) : myChildren.length ? (
                approvedFor.length ? (
                  <Tag label={`Approved for ${listNames(approvedFor.map((c) => c.first_name))}`} tone="green" />
                ) : (
                  <Tag label="Not approved by you" tone="muted" />
                )
              ) : null}
              <div className="person-meta">
                <span>
                  <Icon name="car" size={17} />
                  {person.vehicle ?? "Car not listed"}
                  {person.plateLast3 ? ` · plate ending ${person.plateLast3}` : ""}
                </span>
                <span>
                  <Icon name="users" size={17} />
                  {person.seats} passenger {person.seats === 1 ? "seat" : "seats"}
                </span>
                {person.phone && !isMe ? (
                  <span>
                    <Icon name="phone" size={17} />
                    <a href={`tel:${person.phone}`}>{person.phone}</a>
                  </span>
                ) : null}
              </div>
              {!sameFamily && myChildren.length ? (
                <div className="approval-list" aria-label={`Your approvals for ${firstName(person.name)}`}>
                  {myChildren.map((child) => (
                    <ApprovalToggle
                      key={child.id}
                      teamId={teamId}
                      childId={child.id}
                      childName={child.first_name}
                      driverId={person.id}
                      driverName={person.name}
                      approved={!!team.approvals.get(child.id)?.has(person.id)}
                    />
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <p className="footnote">
        Removing an approval takes that driver off upcoming rides with your child, unless your family approved that specific ride.
      </p>
    </>
  );
}
