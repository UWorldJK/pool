import type { Metadata } from "next";
import Link from "next/link";
import { acceptInvite } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Brand, Notice } from "@/components/bits";
import { getMe, requireUser } from "@/lib/pool/data";
import { inviteToken } from "@/lib/pool/form";

export const metadata: Metadata = { title: "Invitation" };

type Preview = { kind: "team" | "family"; name: string; detail: string; invited_by: string } | null;

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token: raw } = await params;
  const token = inviteToken(raw);
  const { supabase } = await requireUser();
  const me = await getMe();
  const { data } = token ? await supabase.rpc("invite_preview", { p_token: token }) : { data: null };
  const preview = data as Preview;

  return (
    <main id="main" className="center-page">
      <section className="card panel">
        <Brand />
        {!preview ? (
          <>
            <p className="eyebrow">Invitation</p>
            <h1 className="mt-3">This link no longer works.</h1>
            <p>Invite links expire after 7 days, and household links work once. Ask the person who sent it for a new one.</p>
            <div className="journey-actions">
              <Link className="button secondary" href="/">
                Go to Pool
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">{preview.invited_by} invited you</p>
            <h1 className="mt-3">
              {preview.kind === "team" ? `Join ${preview.name}.` : `Join the ${preview.name} household.`}
            </h1>
            <p>
              {preview.kind === "team"
                ? `${preview.detail ? preview.detail + ". " : ""}You'll see the team's schedule and can offer rides.`
                : "You'll share their children, approvals and handoffs as another adult in the household."}
            </p>
            {preview.kind === "team" ? (
              <Notice tone="green" icon="shield" title="Joining doesn't grant driver approval.">
                Each family still chooses who may drive their child.
              </Notice>
            ) : me.household ? (
              <Notice tone="amber" icon="warning" title={`You're already in the ${me.household.name} household.`}>
                A person can belong to one household.
              </Notice>
            ) : null}
            <ActionForm action={acceptInvite} className="form mt-6">
              <input type="hidden" name="token" value={token ?? ""} />
              <SubmitButton icon="arrow">{preview.kind === "team" ? "Join team" : "Join household"}</SubmitButton>
            </ActionForm>
          </>
        )}
      </section>
    </main>
  );
}
