import Link from "next/link";
import { PageHeading, EmptyState, Disclosure } from "./presentation";
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
    <PageHeading title={families.data.length ? "Your Pool" : "Welcome to Pool"}>{!families.data.length && "Start with your family, then bring your circle together."}</PageHeading>
    <div className="dashboard-grid">
      <section className="panel"><h2>Your families</h2>
        {families.data.length ? <ul className="link-list">{families.data.map((family) => <li key={family.id}><Link href={`/app/families/${family.id}`}>{family.name}<span aria-hidden="true">›</span></Link></li>)}</ul> : <EmptyState title="Start with your family">Create a family or accept an invitation.</EmptyState>}
        <Disclosure title="Create a family" open={!families.data.length}><MembershipForm command="create-family" label="Create family"><NameField /><NameField label="Your display name" name="display_name" /></MembershipForm></Disclosure>
      </section>
      <section className="panel"><h2>Your circles</h2>
        {circles.data.length ? <ul className="link-list">{circles.data.map((circle) => <li key={circle.id}><Link href={`/app/circles/${circle.id}`}>{circle.name}<span aria-hidden="true">›</span></Link></li>)}</ul> : <EmptyState title="Share the driving">Create a circle from your family, or join one by invitation.</EmptyState>}
        <Link className="text-link" href="/app/invitations">Accept an invitation <span aria-hidden="true">↗</span></Link>
      </section>
    </div>
    {!!families.data.length && <Link className="text-link" href="/app/children">Manage your children <span aria-hidden="true">›</span></Link>}
  </>;
}
