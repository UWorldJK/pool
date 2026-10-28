"use client";
import { Disclosure } from "./presentation";
import Link from "next/link";
import { OutcomeFocus } from "./outcome-focus";
import { startTransition, useActionState, useState, useSyncExternalStore } from "react";
import { rideAction } from "./ride-actions";
import type { RideState } from "@/lib/rides";
export function RideForm({ command, fields = {}, label, children }: { command: string; fields?: Record<string, string>; label: string; children?: React.ReactNode }) {
  const [state, action, pending] = useActionState(rideAction, {} as RideState);
  const [requestId] = useState(fields.ride_id);
  const [childId] = useState(fields.child_id);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  // Dispatch explicitly so React does not reset uncontrolled inputs after a
  // resolved validation/transport error. Capture before disabling the fieldset.
  return <form className="auth-form" onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }}>
    <input type="hidden" name="command" value={command} />
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={name === "ride_id" && command === "createRide" ? requestId : name === "child_id" && command === "saveOwnChild" && fields.revision === "0" ? childId : value} />)}
    <fieldset disabled={!ready || pending || Boolean(state.path && (command === "createRide" || (command === "saveOwnChild" && fields.revision === "0")))}>{children}<button type="submit">{pending ? "Saving…" : label}</button></fieldset>
    <OutcomeFocus state={state}>{pending && <p role="status">Saving your change…</p>}
    {!pending && state.error && <p role="alert">{state.error} <a href="">Reload current data</a></p>}
    {!pending && state.message && <p role="status">{state.message}</p>}
    {!pending && state.path && <><Link href={state.path}>Open saved result</Link>
      {command === "createRide" && <button type="button" onClick={() => window.location.reload()}>Plan another ride</button>}
      {command === "saveOwnChild" && fields.revision === "0" && <button type="button" onClick={() => window.location.reload()}>Add another child</button>}
    </>}
    </OutcomeFocus>
  </form>;
}
const subscribe = () => () => {};
export function ChildChoices({ children, selected = [] }: { children: { id: string; display_name: string }[]; selected?: string[] }) {
  return <fieldset><legend>Your family’s riders</legend>{children.length ? children.map((child) => <label className="checkbox-label" key={child.id}>
    <input type="checkbox" name="child_ids" value={child.id} defaultChecked={selected.includes(child.id)} />{child.display_name}
  </label>) : <p>Add a child in child setup before joining a ride.</p>}</fieldset>;
}
export function SeatField({ value = "standard" }: { value?: string }) {
  return <label>Seat requirement<select name="seat_requirement" defaultValue={value} required><option value="standard">Standard passenger seat</option><option value="booster">Booster seat</option><option value="child-seat">Child seat</option></select></label>;
}
export function LocalTimeField({ name, label }: { name: string; label: string }) {
  return <><label>{label}<input type="datetime-local" name={`${name}_local`} required /></label>
    <Disclosure title={`${label}: daylight saving options`}><p>If this hour repeats, choose which occurrence you mean.</p><label>{label} repeated-hour choice<select name={name === "starts" ? "start_occurrence" : "end_occurrence"} defaultValue="reject"><option value="reject">Ask me if the hour repeats</option><option value="earlier">Earlier occurrence</option><option value="later">Later occurrence</option></select></label></Disclosure></>;
}
