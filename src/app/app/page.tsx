import Link from "next/link";
import { PageHeading, EmptyState, ActionDialog, Avatar, Icon } from "./presentation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { MembershipForm, NameField } from "./membership-form";

export default async function Application() {
  const client = await createReadOnlyClient();
  const [families, circles] = await Promise.all([
    client.from("families").select("id,name").order("name"),
    client.from("circles").select("id,name").order("name"),
  ]);
  if (families.error || circles.error) throw new Error("Membership could not be loaded");
  return <>
    <PageHeading eyebrow="SHARE THE DRIVING" title={families.data.length ? "Your family, your circle." : "Welcome to Pool"} action={<Link className="button secondary" href="/app/attention">Today’s rides →</Link>}>{!families.data.length && "Start with your family, then bring your circle together."}</PageHeading>
    <div className="dashboard-grid">
      <section className="panel"><h2>Your families</h2>
        {families.data.length ? <ul className="link-list">{families.data.map((family) => <li key={family.id}><Link href={`/app/families/${family.id}`}><Avatar name={family.name} />{family.name}<span aria-hidden="true">›</span></Link></li>)}</ul> : <EmptyState title="Start with your family">Create a family or accept an invitation.</EmptyState>}
        <ActionDialog title="Create a family" inline={!families.data.length}><MembershipForm command="create-family" label="Create family"><NameField /><NameField label="Your display name" name="display_name" /></MembershipForm></ActionDialog>
      </section>
      <section className="panel"><h2>Your circles</h2>
        {circles.data.length ? <ul className="link-list">{circles.data.map((circle) => <li key={circle.id}><Link href={`/app/circles/${circle.id}`}><span className="team-icon"><Icon name="shield" /></span>{circle.name}<span aria-hidden="true">›</span></Link></li>)}</ul> : <EmptyState title="Share the driving">Create a circle from your family, or join one by invitation.</EmptyState>}
        <Link className="text-link" href="/app/invitations">Accept an invitation <span aria-hidden="true">↗</span></Link>
      </section>
    </div>
    {Boolean(families.data.length) && <div className="setup-cards"><Link href="/app/children"><Icon name="users" /><strong>Your children</strong><span>Riders and seat requirements →</span></Link><Link href="/app/vehicles"><Icon name="car" /><strong>Your vehicles</strong><span>Registered passenger capacity →</span></Link></div>}
  </>;
}
