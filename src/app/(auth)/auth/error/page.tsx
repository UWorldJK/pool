import Link from "next/link";

export default function AuthError() {
  return (
    <>
      <h1>This link could not be used</h1>
      <p>
        The link may be invalid, expired, already used, or opened in a different
        browser. Please request a new link and try again.
      </p>
      <nav aria-label="Try again">
        <Link href="/forgot-password">Request a new password reset link</Link>
        <Link href="/sign-up">Request a confirmation by signing up again</Link>
        <Link href="/sign-in">Back to sign in</Link>
      </nav>
    </>
  );
}
