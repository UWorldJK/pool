import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { acceptInvite, createHousehold, createTeam, saveProfile, signOut } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Brand } from "@/components/bits";
import { ChildFields } from "./child-fields";
import { TimezoneSelect } from "@/components/timezone-select";
import { getMe } from "@/lib/pool/data";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const me = await getMe();
  const step = !me.profile?.display_name ? 1 : !me.household ? 2 : me.teams.length === 0 ? 3 : 4;
  if (step === 4) redirect(`/t/${me.teams[0].id}`);

  return (
    <main id="main" className="center-page">
      <section className="card panel">
        <Brand />
        <div className="steps" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= step ? "done" : ""} />
          ))}
        </div>

        {step === 1 ? (
          <>
            <p className="eyebrow">Step 1 of 3 · About you</p>
            <h1 className="mt-3">Nice to meet you.</h1>
            <p>Other families see your name. They see your car and seats when you offer to drive.</p>
            <ActionForm action={saveProfile} className="form mt-7">
              <label>
                Your name
                <input name="name" required maxLength={80} autoComplete="name" placeholder="Alex Morgan" />
              </label>
              <label>
                Phone
                <span className="hint">So the driver or a parent can reach you on ride day.</span>
                <input name="phone" type="tel" maxLength={30} autoComplete="tel" />
              </label>
              <div className="form-pair">
                <label>
                  Car
                  <input name="vehicle" maxLength={80} placeholder="Green Toyota RAV4" />
                </label>
                <label>
                  Last digits of plate
                  <input name="plate" maxLength={4} placeholder="382" />
                </label>
              </div>
              <label>
                Passenger seats
                <span className="hint">Seats you can fill with riders and their required restraints. Use 0 if you won&apos;t drive.</span>
                <input name="seats" type="number" min={0} max={8} defaultValue={3} required />
              </label>
              <SubmitButton icon="arrow">Continue</SubmitButton>
            </ActionForm>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="eyebrow">Step 2 of 3 · Your household</p>
            <h1 className="mt-3">Who rides with you?</h1>
            <p>Your household decides who may drive your children. Any adult in it can approve drivers and confirm handoffs.</p>
            <ActionForm action={createHousehold} className="form mt-7">
              <label>
                Family name
                <input name="family" required maxLength={60} placeholder="Morgan" />
              </label>
              <ChildFields />
              <SubmitButton icon="arrow">Save household</SubmitButton>
            </ActionForm>
            <details className="mt-7">
              <summary className="text-button">Another adult already set up your household?</summary>
              <ActionForm action={acceptInvite} className="form mt-4">
                <label>
                  Household invite link
                  <input name="token" required placeholder="Paste the link they sent you" />
                </label>
                <SubmitButton variant="outline">Join household</SubmitButton>
              </ActionForm>
            </details>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="eyebrow">Step 3 of 3 · Your team</p>
            <h1 className="mt-3">Join your team&apos;s circle.</h1>
            <p>Paste the invite link from your team organizer. If nobody has started one yet, start it yourself.</p>
            <ActionForm action={acceptInvite} className="form mt-7">
              <label>
                Team invite link
                <input name="token" required placeholder="https://…/invite/…" />
              </label>
              <SubmitButton icon="arrow">Join team</SubmitButton>
            </ActionForm>
            <details className="mt-7">
              <summary className="text-button">Start a new team instead</summary>
              <ActionForm action={createTeam} className="form mt-4">
                <label>
                  Team name
                  <input name="name" required maxLength={60} placeholder="Northside FC" />
                </label>
                <label>
                  Group or age
                  <input name="detail" maxLength={80} placeholder="U12 · The Wolves" />
                </label>
                <TimezoneSelect />
                <fieldset>
                  <legend>Who rides with this team?</legend>
                  <div className="choice-list">
                    {me.household!.children.map((child) => (
                      <label key={child.id} className="choice">
                        <input type="checkbox" name="child" value={child.id} defaultChecked />
                        {child.first_name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <SubmitButton variant="outline">Start team</SubmitButton>
              </ActionForm>
            </details>
          </>
        ) : null}

        <form action={signOut} className="mt-8">
          <button type="submit" className="text-button small">
            Not {me.email}? Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
