import { notFound } from "next/navigation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { verifiedUser } from "@/lib/auth/identity";
import { InviteForm, MembershipForm } from "../../membership-form";
import { InvitationList } from "../../invitation-list";

export default async function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();
  const client = await createReadOnlyClient();
  const user = await verifiedUser(client);
  const circle = await client.from("circles").select("*").eq("id", id).maybeSingle();
  if (circle.error) throw new Error("Circle could not be loaded");
  if (!circle.data || !user) notFound();
  const currentCircle = circle.data;
  const [roster, owned] = await Promise.all([
    client.rpc("circle_roster", { p_circle_id: id }),
    client.from("family_members").select("family_id").eq("user_id", user.id).eq("role", "owner"),
  ]);
  if (roster.error || owned.error) throw new Error("Roster could not be loaded");
  const coordinator = currentCircle.coordinator_id === user.id;
  return <>
    <h1>{currentCircle.name}</h1><p>A circle coordinates families. Membership never grants driver approval or authority over another family.</p>
    <h2>Families in this circle</h2>
    <ul>{roster.data.map((family) => <li key={family.family_id}>
      {family.family_name}{family.family_id === currentCircle.coordinator_family_id ? " (coordinating family)" : ""}
      {(coordinator || owned.data.some((member) => member.family_id === family.family_id)) && <MembershipForm command="remove-family" fields={{ circle_id: id, family_id: family.family_id }} label={coordinator ? "Remove family from circle" : "Leave circle"}>
        <label className="checkbox-label"><input type="checkbox" name="confirm" value="yes" required />I confirm this family’s removal from the circle.</label>
      </MembershipForm>}
    </li>)}</ul>
    <p>The coordinating family must remain.</p>
    {coordinator && <>
      <h2>Invite another family</h2><p>Invite a verified adult by email. They choose a family they own or create one. They do not join your family.</p>
      <InviteForm kind="circle" scopeId={id} /><InvitationList kind="circle" scopeId={id} />
    </>}
  </>;
}
