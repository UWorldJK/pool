import { PageHeading, Disclosure } from "../presentation";
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
  return <><PageHeading title="Your children">{family.name}</PageHeading>
    {families.data.length > 1 && <nav aria-label="Choose family">{families.data.map((item) => <Link key={item.id} href={`/app/children?family=${item.id}`}>{item.name}</Link>)}</nav>}
    {children.data.length ? children.data.map((child) => <section key={child.id}><h2>{child.display_name}</h2><p>{child.seat_requirement === "booster" ? "Booster seat" : child.seat_requirement === "child-seat" ? "Child seat" : "Standard passenger seat"}</p><Disclosure title={`Edit ${child.display_name}`}><p>Changes apply to future enrollment. Re-save riders on an existing ride to update its details.</p>
      <RideForm command="saveOwnChild" fields={{ family_id: family.id, child_id: child.id, revision: String(child.revision) }} label="Update child">
        <label>Child display name<input name="display_name" defaultValue={child.display_name} required maxLength={80} /></label><SeatField value={child.seat_requirement} />
      </RideForm></Disclosure></section>) : <p>No children saved for this family.</p>}<Disclosure title="Add a child" open={!children.data.length}>
      <RideForm key={family.id} command="saveOwnChild" fields={{ family_id: family.id, child_id: crypto.randomUUID(), revision: "0" }} label="Save child">
      <label>Child display name<input name="display_name" required maxLength={80} /></label><SeatField />
    </RideForm>
    </Disclosure></>;
}
