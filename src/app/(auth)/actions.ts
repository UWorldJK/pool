"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifiedUser } from "@/lib/auth/identity";
import { appReturnPath, emailLinkType, validTokenHash } from "@/lib/auth/paths";

export type AuthState = { error?: string; message?: string };
const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const emailAddress = (data: FormData) =>
  field(data, "email").trim().toLowerCase();
const validEmail = (email: string) =>
  email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validPassword = (password: string) =>
  password.length >= 12 && password.length <= 128;

export async function signIn(_: AuthState, data: FormData): Promise<AuthState> {
  const email = emailAddress(data);
  const password = field(data, "password");
  if (!validEmail(email) || !password || password.length > 128)
    return { error: "Enter your email and password." };
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error)
    return {
      error:
        "Unable to sign in. Check your email and password and confirm your email first, or try again shortly.",
    };
  if (!(await verifiedUser(client)))
    return { error: "Confirm your email before signing in." };
  redirect(appReturnPath(data.get("next")));
}

export async function signUp(_: AuthState, data: FormData): Promise<AuthState> {
  const email = emailAddress(data);
  const password = field(data, "password");
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (!validPassword(password))
    return { error: "Use a password between 12 and 128 characters." };
  if (data.get("adult") !== "yes")
    return {
      error: "Pool accounts are for adults. Confirm that you are at least 18.",
    };
  const client = await createClient();
  // Mail templates use Supabase's configured Site URL, never a caller's Host,
  // Origin, forwarded header or user-provided absolute redirect URL.
  const { error } = await client.auth.signUp({ email, password });
  if (error)
    return {
      error:
        "Unable to create your account right now. Try again shortly, or sign in if you already have an account.",
    };
  return {
    message:
      "Check your email for a confirmation link. If you already have an account, sign in or reset your password.",
  };
}

export async function requestRecovery(
  _: AuthState,
  data: FormData,
): Promise<AuthState> {
  const email = emailAddress(data);
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  const client = await createClient();
  const { error } = await client.auth.resetPasswordForEmail(email);
  if (error)
    return {
      error:
        "Unable to send a recovery email right now. Please try again shortly.",
    };
  return {
    message:
      "If an account matches that email, a password reset link is on its way. Check your inbox.",
  };
}

export async function resetPassword(
  _: AuthState,
  data: FormData,
): Promise<AuthState> {
  const password = field(data, "password");
  if (!validPassword(password))
    return { error: "Use a password between 12 and 128 characters." };
  if (password !== field(data, "confirmation"))
    return { error: "The passwords do not match." };
  const client = await createClient();
  if (!(await verifiedUser(client))) redirect("/auth/error");
  const { error } = await client.auth.updateUser({ password });
  if (error)
    return {
      error:
        "Unable to update the password. Choose a different password or request a new recovery link.",
    };
  const { error: signOutError } = await client.auth.signOut({
    scope: "global",
  });
  if (signOutError)
    return {
      error:
        "Your password changed, but sign-out failed. Try signing out again before leaving this device.",
    };
  redirect("/sign-in?message=password-updated");
}

export async function signOut(): Promise<AuthState> {
  const client = await createClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) return { error: "Unable to sign out. Please try again." };
  redirect("/sign-in?message=signed-out");
}

export async function confirmEmail(data: FormData) {
  const tokenHash = data.get("token_hash");
  const type = emailLinkType(data.get("type"));
  if (!validTokenHash(tokenHash) || !type) redirect("/auth/error");
  const client = await createClient();
  const { error } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error || !(await verifiedUser(client))) redirect("/auth/error");
  redirect(
    type === "recovery" ? "/reset-password" : appReturnPath(data.get("next")),
  );
}
