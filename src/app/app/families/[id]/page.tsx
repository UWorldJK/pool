import Link from "next/link";
import { PageHeading, Disclosure } from "../../presentation";
import { notFound } from "next/navigation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { verifiedUser } from "@/lib/auth/identity";
import { InviteForm, MembershipForm, NameField } from "../../membership-form";
import { InvitationList } from "../../invitation-list";

export default async function FamilyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();
  const client = await createReadOnlyClient();
  const user = await verifiedUser(client);
  const family = await client.from("families").select("id,name").eq("id", id).maybeSingle();
  if (family.error) throw new Error("Family could not be loaded");
  if (!family.data || !user) notFound();
  const members = await client.from("family_members").select("user_id,role,profiles(display_name)").eq("family_id", id);
  if (members.error) throw new Error("Members could not be loaded");
  const owner = members.data.some((member) => member.user_id === user.id && member.role === "owner");
  return <>
    <PageHeading title={family.data.name} action={<Link className="button secondary" href={`/app/children?family=${id}`}>Your children</Link>} /><h2>Guardians</h2>
    <ul>{members.data.map((member) => <li key={member.user_id}>
      {member.profiles?.display_name} · {member.role}{member.user_id === user.id ? " (you)" : ""}
      {(owner || member.user_id === user.id) && <Disclosure title={member.user_id === user.id ? "Leave family" : "Remove guardian"}><MembershipForm command="remove-guardian" fields={{ family_id: id, user_id: member.user_id }} label={member.user_id === user.id ? "Leave family" : "Remove guardian"}>
        <label className="checkbox-label"><input type="checkbox" name="confirm" value="yes" required />I confirm this membership removal.</label>
      </MembershipForm></Disclosure>}
    </li>)}</ul>

    {owner && <>
      <Disclosure title="Invite a guardian"><p>They can manage this family’s children and rides. Share the invitation link yourself.</p>
      <InviteForm kind="guardian" scopeId={id} /></Disclosure><InvitationList kind="guardian" scopeId={id} />
      <Disclosure title="Create a circle"><p>Your family joins automatically. You coordinate the circle.</p>
      <MembershipForm command="create-circle" fields={{ family_id: id }} label="Create circle"><NameField label="Circle name" /></MembershipForm></Disclosure>
    </>}
  </>;
}
