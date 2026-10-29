import { redirect } from "next/navigation";
import Link from "next/link";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { verifiedUser } from "@/lib/auth/identity";
import { AuthForm } from "../auth-form";

export default async function ResetPassword() {
  if (!(await verifiedUser(await createReadOnlyClient())))
    redirect("/auth/error");
  return (
    <>
      <h1>Choose a new password</h1>
      <p>
        Saving signs out your sessions. Sign in again with your new password.
      </p>
      <AuthForm mode="reset" />
      <Link href="/app">Back to your account</Link>
    </>
  );
}
