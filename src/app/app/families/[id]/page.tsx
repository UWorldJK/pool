import Link from "next/link";
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
    <h1>{family.data.name}</h1><Link href={`/app/children?family=${id}`}>Set up this family’s children</Link><h2>Guardians</h2>
    <ul>{members.data.map((member) => <li key={member.user_id}>
      {member.profiles?.display_name} · {member.role}{member.user_id === user.id ? " (you)" : ""}
      {(owner || member.user_id === user.id) && <MembershipForm command="remove-guardian" fields={{ family_id: id, user_id: member.user_id }} label={member.user_id === user.id ? "Leave family" : "Remove guardian"}>
        <label className="checkbox-label"><input type="checkbox" name="confirm" value="yes" required />I confirm this membership removal.</label>
      </MembershipForm>}
    </li>)}</ul>
    <p>The last owner must remain. Guardians can leave; only owners can remove other guardians.</p>
    {owner && <>
      <h2>Invite a guardian to this family</h2><p>A guardian invitation joins this family. It grants no ownership. Copy and deliver the link manually.</p>
      <InviteForm kind="guardian" scopeId={id} /><InvitationList kind="guardian" scopeId={id} />
      <h2>Create a circle</h2><p>Your family joins automatically and you become its coordinator.</p>
      <MembershipForm command="create-circle" fields={{ family_id: id }} label="Create circle"><NameField label="Circle name" /></MembershipForm>
    </>}
  </>;
}
