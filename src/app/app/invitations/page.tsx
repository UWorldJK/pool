import { redirect } from "next/navigation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { verifiedUser } from "@/lib/auth/identity";
import { AcceptInvitation } from "./accept-form";
export default async function InvitationsPage() {
  const client = await createReadOnlyClient();
  const user = await verifiedUser(client);
  if (!user) redirect("/sign-in?next=/app/invitations");
  const { data, error } = await client.from("family_members").select("families(id,name)").eq("user_id", user.id).eq("role", "owner");
  if (error) throw new Error("Families could not be loaded");
  return <><h1>Accept an invitation</h1><AcceptInvitation families={data.flatMap((member) => member.families ? [member.families] : [])} /></>;
}
