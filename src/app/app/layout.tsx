import { redirect } from "next/navigation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { verifiedUser } from "@/lib/auth/identity";
import { AuthForm } from "../(auth)/auth-form";

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
      <section className="auth-card">
        <p className="brand">pool.</p>
        <p>
          Signed in as <strong>{user.email}</strong>
        </p>
        {children}
        <AuthForm mode="sign-out" />
      </section>
    </main>
  );
}
