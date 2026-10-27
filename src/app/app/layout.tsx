import { redirect } from "next/navigation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { verifiedUser } from "@/lib/auth/identity";
import { AuthForm } from "../(auth)/auth-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await verifiedUser(await createReadOnlyClient());
  if (!user) redirect("/sign-in");
  return (
    <main className="auth-container">
      <section className="auth-card membership-card">
        <p className="brand">pool.</p>
        <p>
          Signed in as <strong>{user.email}</strong>
        </p>
        <nav aria-label="Application"><Link href="/app">Families and circles</Link><Link href="/app/invitations">Invitations</Link><Link href="/app/children">Child setup</Link><Link href="/app/rides/new">Plan a ride</Link><Link href="/app/schedule">Weekly schedule</Link><Link href="/app/vehicles">Your vehicles</Link><Link href="/app/driving">Your driving</Link><Link href="/app/attention">Needs attention</Link></nav>
        {children}
        <AuthForm mode="sign-out" />
      </section>
    </main>
  );
}
