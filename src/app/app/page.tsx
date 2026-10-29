import Link from "next/link";
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
    <h1>Welcome to Pool</h1>
    <p>Create a family, add guardians and coordinate with other families in circles.</p>
    <h2>Your families</h2>
    {families.data.length ? <ul>{families.data.map((family) => <li key={family.id}><Link href={`/app/families/${family.id}`}>{family.name}</Link></li>)}</ul> : <p>You have no families yet. Create one or accept a guardian invitation.</p>}
    <h2>Create a family</h2>
    <MembershipForm command="create-family" label="Create family"><NameField /><NameField label="Your display name" name="display_name" /></MembershipForm>
    <h2>Your circles</h2>
    {circles.data.length ? <ul>{circles.data.map((circle) => <li key={circle.id}><Link href={`/app/circles/${circle.id}`}>{circle.name}</Link></li>)}</ul> : <p>No circles yet. Open an owned family to create a circle, or use an invitation to join one.</p>}
    <Link href="/app/invitations">Accept an invitation</Link>
    <p>Circle membership does not approve anyone to drive. Plan rides with your own children, nominate a driver and explicitly consent for each child.</p>
  </>;
}
