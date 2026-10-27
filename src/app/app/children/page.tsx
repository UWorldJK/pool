import Link from "next/link";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { RideForm, SeatField } from "../ride-form";
export default async function ChildrenPage({ searchParams }: { searchParams: Promise<{ family?: string }> }) {
  const query = await searchParams;
  const client = await createReadOnlyClient();
  const families = await client.from("families").select("id,name").order("name");
  if (families.error) throw new Error("Families could not be loaded");
  const family = families.data.find((item) => item.id === query.family) ?? (!query.family ? families.data[0] : undefined);
  if (!family) return <><h1>Child setup</h1><p>Select one of your families or create a family first.</p><Link href="/app">Families and circles</Link></>;
  const children = await client.from("children").select("*").eq("family_id", family.id).order("display_name");
  if (children.error) throw new Error("Children could not be loaded");
  return <><h1>Child setup</h1><p>Private to {family.name}. Ride enrollment shares a name and seat requirement snapshot only. Updating a child here does not change saved ride snapshots; re-save enrollment to update them.</p>
    <nav aria-label="Choose family">{families.data.map((item) => <Link key={item.id} href={`/app/children?family=${item.id}`}>{item.name}</Link>)}</nav>
    <h2>Add a child</h2><RideForm key={family.id} command="saveOwnChild" fields={{ family_id: family.id, child_id: crypto.randomUUID(), revision: "0" }} label="Save child">
      <label>Child display name<input name="display_name" required maxLength={80} /></label><SeatField />
    </RideForm>
    <h2>Your children</h2>{children.data.length ? children.data.map((child) => <section key={child.id}><h3>{child.display_name}</h3>
      <RideForm command="saveOwnChild" fields={{ family_id: family.id, child_id: child.id, revision: String(child.revision) }} label="Update child">
        <label>Child display name<input name="display_name" defaultValue={child.display_name} required maxLength={80} /></label><SeatField value={child.seat_requirement} />
      </RideForm></section>) : <p>No children saved for this family.</p>}</>;
}
