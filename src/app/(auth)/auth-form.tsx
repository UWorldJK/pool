"use client";

import { useActionState } from "react";
import {
  signIn,
  signUp,
  requestRecovery,
  resetPassword,
  signOut,
  type AuthState,
} from "./actions";

export function AuthForm({
  mode,
  next = "/app",
}: {
  mode: "sign-in" | "sign-up" | "recovery" | "reset" | "sign-out";
  next?: string;
}) {
  const actions = {
    "sign-in": signIn,
    "sign-up": signUp,
    recovery: requestRecovery,
    reset: resetPassword,
    "sign-out": signOut,
  };
  const [state, action, pending] = useActionState<AuthState, FormData>(
    actions[mode],
    {},
  );
  const password = mode === "sign-in" || mode === "sign-up" || mode === "reset";
  const labels = {
    "sign-in": "Sign in",
    "sign-up": "Create account",
    recovery: "Send reset link",
    reset: "Save new password",
    "sign-out": "Sign out",
  };
  return (
    <form action={action} className="auth-form" aria-busy={pending}>
      <input type="hidden" name="next" value={next} />
      {mode !== "reset" && mode !== "sign-out" && (
        <label>
          Email address
          <input
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      )}
      {password && (
        <label>
          {mode === "reset" ? "New password" : "Password"}
          <input
            type="password"
            name="password"
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            minLength={mode === "sign-in" ? undefined : 12}
            maxLength={128}
            required
          />
        </label>
      )}
      {mode === "reset" && (
        <label>
          Confirm new password
          <input
            type="password"
            name="confirmation"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
      )}
      {mode === "sign-up" && (
        <>
          <p>Use 12–128 characters for your password.</p>
          <label className="checkbox-label">
            <input type="checkbox" name="adult" value="yes" required />I am at
            least 18 years old.
          </label>
        </>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {state.message && <p role="status">{state.message}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "Please wait…" : labels[mode]}
      </button>
    </form>
  );
}
