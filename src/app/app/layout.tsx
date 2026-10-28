import { redirect } from "next/navigation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { verifiedUser } from "@/lib/auth/identity";
import { AuthForm } from "../(auth)/auth-form";
import { ApplicationNav } from "./application-nav";

export const dynamic = "force-dynamic";

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await verifiedUser(await createReadOnlyClient());
  if (!user) redirect("/sign-in");
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <ApplicationNav />
      <div className="application-shell">
        <header className="topbar"><p>Your family <span aria-hidden="true"> / </span> Pool</p><div className="account-controls"><p className="account-email">Signed in as <strong>{user.email}</strong></p><AuthForm mode="sign-out" /></div></header>
        <main id="main-content" tabIndex={-1} className="page-content">{children}</main>
      </div>
    </>
  );
}
