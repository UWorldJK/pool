import { PageHeading, Disclosure } from "../../presentation";
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
    <PageHeading title={currentCircle.name} />
    <h2>Families in this circle</h2>
    <ul>{roster.data.map((family) => <li key={family.family_id}>
      {family.family_name}{family.family_id === currentCircle.coordinator_family_id ? " (coordinating family)" : ""}
      {(coordinator || owned.data.some((member) => member.family_id === family.family_id)) && family.family_id !== currentCircle.coordinator_family_id && <Disclosure title={coordinator ? "Remove family" : "Leave circle"}><MembershipForm command="remove-family" fields={{ circle_id: id, family_id: family.family_id }} label={coordinator ? "Remove family from circle" : "Leave circle"}>
        <label className="checkbox-label"><input type="checkbox" name="confirm" value="yes" required />I confirm this family’s removal from the circle.</label>
      </MembershipForm></Disclosure>}
    </li>)}</ul>

    {coordinator && <>
      <Disclosure title="Invite another family"><p>Invite an adult to join this circle with their own family. Share the invitation link yourself.</p>
      <InviteForm kind="circle" scopeId={id} /></Disclosure><InvitationList kind="circle" scopeId={id} />
    </>}
  </>;
}
