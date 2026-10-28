"use client";
import Link from "next/link";
import { OutcomeFocus } from "./outcome-focus";
import { startTransition, useActionState, useState, useSyncExternalStore } from "react";
import { driverAction } from "./driver-actions";
import type { DriverState } from "@/lib/drivers";
const subscribe = () => () => {};
export function DriverForm({ command, fields = {}, label, children }: { command: string; fields?: Record<string,string>; label: string; children?: React.ReactNode }) {
  const [state, action, pending] = useActionState(driverAction, {} as DriverState);
  const [requestId] = useState(fields.proposal_id ?? fields.vehicle_id);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const creates = command === "proposeDriver" || command === "requestReplacement" || (command === "saveVehicle" && fields.version === "0");
  return <form className="auth-form" onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => action(data));
  }}>
    <input type="hidden" name="command" value={command} />
    {Object.entries(fields).map(([name,value]) => <input key={name} type="hidden" name={name} value={creates && (name === "proposal_id" || name === "vehicle_id") ? requestId : value} />)}
    <fieldset disabled={!ready || pending || Boolean(creates && state.path)}>{children}<button type="submit">{pending ? "Saving…" : label}</button></fieldset>
    <OutcomeFocus state={state}>{pending && <p role="status">Saving your reply…</p>}
    {!pending && state.error && <p role="alert">{state.error} <a href="">Reload current data</a></p>}
    {!pending && state.message && <p role="status">{state.message}</p>}
    {!pending && state.path && <><Link href={state.path}>Open saved result</Link>{creates && command === "saveVehicle" && <button type="button" onClick={() => window.location.reload()}>Add another vehicle</button>}</>}
    </OutcomeFocus>
  </form>;
}
export function Confirmation({ children }: { children: React.ReactNode }) {
  return <label className="checkbox-label"><input type="checkbox" name="confirm" value="yes" required />{children}</label>;
}
export function VehicleFields({ label = "", seats = 1 }: { label?: string; seats?: number }) {
  return <><label>Vehicle label<input name="label" maxLength={80} defaultValue={label} required /></label><label>Passenger seats, excluding you<input name="passenger_seats" type="number" min={1} max={50} step={1} defaultValue={seats} required /></label></>;
}

export function UTCDeadline({ value, latest }: { value: string; latest: string }) {
  const [local, setLocal] = useState(value.slice(0, 19));
  return <label>Review deadline in UTC<input type="datetime-local" name="deadline_utc" step="1" required value={local} max={latest.slice(0, 19)} onChange={(event) => setLocal(event.target.value)} /><input type="hidden" name="deadline" value={local ? `${local}Z` : ""} /></label>;
}
