import Link from "next/link";
import { PageHeading, EmptyState } from "./presentation";
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
    <PageHeading eyebrow="Your family, together" title="Welcome to Pool" action={<Link className="button primary" href="/app/rides/new">＋ Plan a ride</Link>}>Create a family, add guardians and coordinate with other families in circles.</PageHeading>
    <div className="dashboard-grid">
      <section className="panel"><h2>Your families</h2>
        {families.data.length ? <ul>{families.data.map((family) => <li key={family.id}><Link href={`/app/families/${family.id}`}>{family.name}<span aria-hidden="true" style={{ marginLeft: "auto" }}>↗</span></Link></li>)}</ul> : <EmptyState title="Start with your family">You have no families yet. Create one or accept a guardian invitation.</EmptyState>}
        <h2>Create a family</h2><MembershipForm command="create-family" label="Create family"><NameField /><NameField label="Your display name" name="display_name" /></MembershipForm>
      </section>
      <section className="panel"><h2>Your circles</h2>
        {circles.data.length ? <ul>{circles.data.map((circle) => <li key={circle.id}><Link href={`/app/circles/${circle.id}`}>{circle.name}<span aria-hidden="true" style={{ marginLeft: "auto" }}>↗</span></Link></li>)}</ul> : <EmptyState title="Build your circle">No circles yet. Open an owned family to create a circle, or use an invitation to join one.</EmptyState>}
        <Link className="button secondary" href="/app/invitations">Accept an invitation</Link>
      </section>
    </div>
    <p className="notice">Circle membership does not approve anyone to drive. Plan rides with your own children, nominate a driver and explicitly consent for each child.</p>
  </>;
}
