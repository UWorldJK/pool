"use client";
import { startTransition, useActionState, useSyncExternalStore } from "react";
import { handoffAction } from "./handoff-actions";
import type { HandoffState } from "@/lib/handoffs";
const subscribe = () => () => {};
export function HandoffForm({ command, fields, label, children }: { command: string; fields: Record<string,string>; label: string; children?: React.ReactNode }) {
  const [state, action, pending] = useActionState(async (previous: HandoffState, data: FormData) => {
    const result = await handoffAction(previous,data);
    if (!result.error) requestAnimationFrame(() => document.getElementById(`journey-${fields.ride_id}-${fields.child_id}`)?.focus());
    return result;
  }, {} as HandoffState);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return <form className="auth-form" onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => action(data));
  }}>
    <input type="hidden" name="command" value={command} />
    {Object.entries(fields).map(([name,value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <fieldset disabled={!ready || pending}>{children}<button type="submit">{pending ? "Saving…" : label}</button></fieldset>
    {pending && <p role="status">Saving your report…</p>}
    {!pending && state.error && <p role="alert">{state.error} <a href="">Reload current data</a></p>}
    {!pending && state.message && <p role="status">{state.message}</p>}
  </form>;
}
