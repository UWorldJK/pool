import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/bits";
import { getMe, getSession, nextStep } from "@/lib/pool/data";

export default async function Home() {
  const { user } = await getSession();
  if (user) {
    redirect(nextStep(await getMe()));
  }

  return (
    <main id="main" className="center-page">
      <section className="card panel">
        <Brand />
        <p className="eyebrow">A little coordination. A lot of peace of mind.</p>
        <h1 className="mt-3">A smoother ride for every family.</h1>
        <p>
          Plan the week with your team, choose who can drive your child, and confirm every pickup and handoff.
        </p>
        <div className="journey-actions">
          <Link className="button primary" href="/login">
            Sign in or get started
          </Link>
        </div>
        <p className="footnote">Start a team for your carpool, or join one with the invite link an organizer sent you.</p>
      </section>
    </main>
  );
}
