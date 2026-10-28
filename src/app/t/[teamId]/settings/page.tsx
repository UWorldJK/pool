import type { Metadata } from "next";
import { cookies } from "next/headers";
import { addChild, saveProfile, setTheme, signOut } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { PageIntro } from "@/components/bits";
import { Icon } from "@/components/icon";
import { InviteLink } from "@/components/invite-link";
import { getMe } from "@/lib/pool/data";
import { listNames } from "@/lib/pool/rides";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await getMe();
  const profile = me.profile;
  const theme = (await cookies()).get("pool-theme")?.value ?? "system";

  return (
    <>
      <PageIntro eyebrow="Your family · your choices" title="Settings and privacy.">
        Signed in as {me.email}.
      </PageIntro>

      <section className="card settings-card max-w-[720px]" aria-labelledby="profile-title">
        <h2 id="profile-title">You and your car</h2>
        <p className="mb-5">Team members see this when you drive or offer to.</p>
        <ActionForm action={saveProfile}>
          <label>
            Your name
            <input name="name" required maxLength={80} defaultValue={profile?.display_name ?? ""} autoComplete="name" />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" maxLength={30} defaultValue={profile?.phone ?? ""} autoComplete="tel" />
          </label>
          <div className="form-pair">
            <label>
              Car
              <input name="vehicle" maxLength={80} defaultValue={profile?.vehicle ?? ""} />
            </label>
            <label>
              Last digits of plate
              <input name="plate" maxLength={4} defaultValue={profile?.plate_last3 ?? ""} />
            </label>
          </div>
          <label>
            Passenger seats
            <span className="hint">Seats you can fill with riders and their required car seats or boosters.</span>
            <input name="seats" type="number" min={0} max={8} defaultValue={profile?.seats ?? 0} required />
          </label>
          <div>
            <SubmitButton icon="check">Save</SubmitButton>
          </div>
        </ActionForm>
      </section>

      {me.household ? (
        <section className="card settings-card max-w-[720px]" aria-labelledby="household-title">
          <h2 id="household-title">{me.household.name} household</h2>
          <div className="setting-row">
            <div>
              <h3>Adults</h3>
              <p>{listNames(me.household.adults.map((a) => (a.id === me.id ? `${a.name} (you)` : a.name)))}</p>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <h3>Children</h3>
              <p>{listNames(me.household.children.map((c) => c.first_name)) || "None yet"}</p>
            </div>
          </div>
          <ActionForm action={addChild} className="form mt-4">
            <div className="form-pair">
              <label>
                Add a child
                <input name="first" required maxLength={40} placeholder="First name" />
              </label>
              <label>
                Last name
                <input name="last" maxLength={40} defaultValue={me.household.name} />
              </label>
            </div>
            <div>
              <SubmitButton variant="outline" icon="plus">
                Add child
              </SubmitButton>
            </div>
          </ActionForm>
          <div className="mt-6">
            <h3>Add another adult</h3>
            <p className="mb-3 small">
              A co-parent or guardian can approve drivers and confirm handoffs for your children. This link works once, for 7 days.
            </p>
            <InviteLink kind="family" target={me.household.id} label="Create household link" />
          </div>
        </section>
      ) : null}

      <section className="card settings-card max-w-[720px]" aria-labelledby="appearance-title">
        <h2 id="appearance-title">Appearance</h2>
        <form action={setTheme} className="form">
          <fieldset>
            <legend>Theme</legend>
            <div className="choice-list">
              {[
                ["system", "Match my device"],
                ["light", "Light"],
                ["dark", "Dark, for evening pickups"],
              ].map(([value, label]) => (
                <label key={value} className="choice">
                  <input type="radio" name="theme" value={value} defaultChecked={theme === value} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <button type="submit" className="button secondary">
              Apply
            </button>
          </div>
        </form>
      </section>

      <section className="card settings-card max-w-[720px]" aria-labelledby="privacy-title">
        <h2 id="privacy-title">How sharing works</h2>
        <div className="setting-row">
          <div>
            <h3>Your team sees the plan</h3>
            <p>Members see the team&apos;s rides, riders, drivers, cars and phone numbers. Other teams see nothing.</p>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <h3>You choose drivers for your children</h3>
            <p>Joining a team or receiving an invite never approves anyone to drive your child.</p>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <h3>No location tracking</h3>
            <p>Pool doesn&apos;t use GPS. Ride progress comes from the driver and families confirming each step.</p>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <h3>No notifications yet</h3>
            <p>Pool doesn&apos;t send texts or emails about rides. Check Today for anything that needs you.</p>
          </div>
        </div>
      </section>

      <form action={signOut} className="mb-8">
        <button type="submit" className="button secondary">
          <Icon name="out" size={18} />
          <span>Sign out</span>
        </button>
      </form>
    </>
  );
}
