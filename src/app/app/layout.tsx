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
  const client = await createReadOnlyClient();
  const user = await verifiedUser(client);
  if (!user) redirect("/sign-in");
  const [profile, circles] = await Promise.all([client.from("profiles").select("display_name").eq("id", user.id).maybeSingle(), client.from("circles").select("name").order("name").limit(2)]);
  if (profile.error || circles.error) throw new Error("Account context could not be loaded");
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <ApplicationNav name={profile.data?.display_name || "Your account"} circle={circles.data.length === 1 ? circles.data[0].name : undefined} account={<details className="account-menu"><summary>Account</summary><p>{user.email}</p><AuthForm mode="sign-out" /></details>} />
      <div className="application-shell">

        <main id="main-content" tabIndex={-1} className="page-content">{children}<footer className="page-footer"><span>pool.</span><p>A smoother ride for every family.</p></footer></main>
      </div>
    </>
  );
}
