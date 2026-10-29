import Link from "next/link";
import { AuthForm } from "../auth-form";
import { appReturnPath } from "@/lib/auth/paths";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <h1>Sign in to Pool</h1>
      {params.message === "signed-out" && (
        <p role="status">You are signed out.</p>
      )}
      {params.message === "password-updated" && (
        <p role="status">
          Your password has been updated. Sign in with your new password.
        </p>
      )}
      <AuthForm mode="sign-in" next={appReturnPath(params.next)} />
      <nav aria-label="Account help">
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/sign-up">Create an adult account</Link>
      </nav>
    </>
  );
}
