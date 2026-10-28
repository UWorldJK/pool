import { Disclosure } from "./presentation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { MembershipForm } from "./membership-form";

export async function InvitationList({ kind, scopeId }: { kind: "guardian" | "circle"; scopeId: string }) {
  const client = await createReadOnlyClient();
  const { data, error } = await client.rpc("list_invitations", { p_kind: kind, p_scope_id: scopeId });
  if (error) throw new Error("Invitations could not be loaded");
  return <Disclosure title="Invitation history">
    {!data.length && <p>No invitations have been created here.</p>}
    <ul>{data.map((invitation) => <li key={invitation.id}>
      <strong>{invitation.email}</strong> — {invitation.consumed_at ? "Accepted" : invitation.revoked_at ? "Revoked" : `Expires ${new Date(invitation.expires_at).toISOString().slice(0, 10)} (UTC)`}
      {!invitation.consumed_at && !invitation.revoked_at && <MembershipForm command="revoke-invitation" fields={{ invitation_id: invitation.id }} label="Revoke invitation" />}
    </li>)}</ul>
  </Disclosure>;
}
