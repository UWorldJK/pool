import Link from "next/link";
import { AuthForm } from "../auth-form";

export default function SignUp() {
  return (
    <>
      <h1>Create your Pool account</h1>
      <p>
        Pool accounts are for adults. Confirm your email before using the app.
      </p>
      <AuthForm mode="sign-up" />
      <Link href="/sign-in">Already have an account? Sign in</Link>
    </>
  );
}
