"use client";

import { useActionState } from "react";
import { sendMagicLink } from "@/app/actions";
import { Icon } from "@/components/icon";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, null);

  if (state?.ok) {
    return (
      <div role="status">
        <p className="eyebrow">Check your email</p>
        <h1 className="mt-3" tabIndex={-1}>
          We sent you a link.
        </h1>
        <p className="mt-3">
          Open the email we sent to <strong className="text-ink">{state.message}</strong> and tap{" "}
          <strong className="text-ink">Sign in to Pool</strong>. The link works once, on any device, for an hour.
        </p>
        <p className="footnote">No email after a minute? Check spam, or reload this page to send another.</p>
      </div>
    );
  }

  return (
    <>
      <p className="eyebrow">Welcome</p>
      <h1 className="mt-3">Sign in with your email.</h1>
      <p className="mt-3">We&apos;ll email you a link. No password needed, and new families start here too.</p>
      <form action={action} className="form mt-7">
        <input type="hidden" name="next" value={next} />
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required maxLength={200} placeholder="you@example.com" />
        </label>
        {state && !state.ok ? (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        ) : null}
        <button type="submit" className="button primary full" disabled={pending}>
          <span>{pending ? "Sending…" : "Email me a sign in link"}</span>
          <Icon name="arrow" size={18} />
        </button>
      </form>
    </>
  );
}
