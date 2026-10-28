import type { Metadata } from "next";
import Link from "next/link";
import { createTeam } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Brand } from "@/components/bits";
import { TimezoneSelect } from "@/components/timezone-select";
import { getMe } from "@/lib/pool/data";

export const metadata: Metadata = { title: "Start a team" };

export default async function NewTeamPage() {
  const me = await getMe();
  return (
    <main id="main" className="center-page">
      <section className="card panel">
        <Brand />
        <p className="eyebrow">New team</p>
        <h1 className="mt-3">Start another team.</h1>
        <p>You&apos;ll be its organizer. Invite families from My circle once it exists.</p>
        <ActionForm action={createTeam} className="form mt-7">
          <label>
            Team name
            <input name="name" required maxLength={60} />
          </label>
          <label>
            Group or age
            <input name="detail" maxLength={80} />
          </label>
          <TimezoneSelect />
          {me.household?.children.length ? (
            <fieldset>
              <legend>Who rides with this team?</legend>
              <div className="choice-list">
                {me.household.children.map((child) => (
                  <label key={child.id} className="choice">
                    <input type="checkbox" name="child" value={child.id} />
                    {child.first_name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="form-actions">
            <Link className="button secondary" href="/">
              Cancel
            </Link>
            <SubmitButton icon="check">Start team</SubmitButton>
          </div>
        </ActionForm>
      </section>
    </main>
  );
}
