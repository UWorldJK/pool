import Link from "next/link";
import { AuthForm } from "../auth-form";

export default function Recovery() {
  return (
    <>
      <h1>Reset your password</h1>
      <p>We will email you a link to choose a new password.</p>
      <AuthForm mode="recovery" />
      <Link href="/sign-in">Back to sign in</Link>
    </>
  );
}
