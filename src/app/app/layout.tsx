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
      <ApplicationNav account={<details className="account-menu"><summary>Account</summary><p>{user.email}</p><AuthForm mode="sign-out" /></details>} />
      <div className="application-shell">

        <main id="main-content" tabIndex={-1} className="page-content">{children}</main>
      </div>
    </>
  );
}
