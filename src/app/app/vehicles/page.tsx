import { createReadOnlyClient } from "@/lib/supabase/server";
import { DriverForm, VehicleFields, Confirmation } from "../driver-form";
export default async function Vehicles() {
  const client = await createReadOnlyClient();
  const [vehicles, profiles] = await Promise.all([client.from("vehicles").select("*").order("created_at"),client.auth.getUser()]);
  if (vehicles.error || profiles.error) throw new Error("Vehicles could not be loaded");
  const profile = await client.from("profiles").select("id").eq("id",profiles.data.user!.id).maybeSingle();
  if (profile.error) throw new Error("Driver profile could not be loaded");
  return <><h1>Your vehicles</h1><p>Register only vehicles you drive. Passenger seats exclude you. You will separately confirm available seats and required restraints for each proposal.</p>
    {!profile.data ? <p>Create or join a family before setting up a vehicle.</p> : <>
    {vehicles.data.length ? vehicles.data.map((v) => <section key={`${v.id}-${v.version}`}><h2>{v.label}{v.retired_at ? " (retired)" : ""}</h2><p>Version {v.version} · {v.passenger_seats} passenger seats</p>
      <DriverForm command="saveVehicle" fields={{ vehicle_id:v.id, version:String(v.version) }} label={v.retired_at ? "Restore vehicle" : "Update vehicle"}><VehicleFields label={v.label} seats={v.passenger_seats} /></DriverForm>
      {!v.retired_at && <DriverForm command="saveVehicle" fields={{ vehicle_id:v.id, version:String(v.version),label:v.label,passenger_seats:String(v.passenger_seats),retire:"yes" }} label="Retire vehicle"><Confirmation>I confirm retirement of this vehicle.</Confirmation></DriverForm>}
    </section>) : <p>No registered vehicles yet.</p>}
    <h2>Add a vehicle</h2><DriverForm command="saveVehicle" fields={{ vehicle_id:crypto.randomUUID(),version:"0" }} label="Save vehicle"><VehicleFields /></DriverForm>
    <p>Resolve live proposals and assignments before changing a vehicle. Retirement preserves assignment history.</p></>}
  </>;
}
