"use client";
import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import { membershipAction } from "./membership-actions";
import { SubmitButton } from "../(auth)/submit-button";
import type { MembershipState } from "@/lib/membership";

export function MembershipForm({ command, fields = {}, label, children }: {
  command: string; fields?: Record<string, string>; label: string; children?: React.ReactNode;
}) {
  const [state, action] = useActionState(membershipAction, {} as MembershipState);
  const hydrated = useSyncExternalStore(subscribeOrigin, clientReady, serverPending);
  return <form className="auth-form" action={action}>
    <input type="hidden" name="command" value={command} />
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <fieldset disabled={!hydrated}>{children}<SubmitButton>{label}</SubmitButton></fieldset><Outcome state={state} />
  </form>;
}
export function Outcome({ state }: { state: MembershipState }) {
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(subscribeOrigin, browserOrigin, serverOrigin);
  const link = state.token ? `${origin}/app/invitations#kind=${state.kind}&token=${state.token}` : "";
  return <>
    {state.error && <p role="alert">{state.error}</p>}
    {state.message && <p role="status">{state.message}</p>}
    {state.path && <Link href={state.path}>Open saved membership</Link>}
    {link && <div className="invitation-link">
      <label>Manual invitation link<input readOnly value={link} onFocus={(event) => event.target.select()} /></label>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
      }}>{copied ? "Copied" : "Copy invitation link"}</button>
      <p>Only the invited email can accept. Keep this link private. It is shown once; create a replacement if lost.</p>
    </div>}
  </>;
}
const subscribeOrigin = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => "";
const clientReady = () => true;
const serverPending = () => false;
export function NameField({ label = "Family name", name = "name" }: { label?: string; name?: string }) {
  return <label>{label}<input name={name} required maxLength={80} autoComplete={name === "display_name" ? "nickname" : "off"} /></label>;
}
export function InviteForm({ kind, scopeId }: { kind: "guardian" | "circle"; scopeId: string }) {
  return <MembershipForm command="create-invitation" fields={{ kind, scope_id: scopeId }} label={kind === "guardian" ? "Create guardian invitation" : "Create circle invitation"}>
    <label>Recipient email<input type="email" name="email" required maxLength={254} autoComplete="off" /></label>
  </MembershipForm>;
}
