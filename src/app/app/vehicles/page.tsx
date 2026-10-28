import { PageHeading, ActionDialog, Icon } from "../presentation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { DriverForm, VehicleFields, Confirmation } from "../driver-form";
export default async function Vehicles() {
  const client = await createReadOnlyClient();
  const [vehicles, profiles] = await Promise.all([client.from("vehicles").select("*").order("created_at"),client.auth.getUser()]);
  if (vehicles.error || profiles.error) throw new Error("Vehicles could not be loaded");
  const profile = await client.from("profiles").select("id").eq("id",profiles.data.user!.id).maybeSingle();
  if (profile.error) throw new Error("Driver profile could not be loaded");
  return <><PageHeading title="Your vehicles">Passenger seats exclude you, the driver.</PageHeading>
    {!profile.data ? <p>Create or join a family before setting up a vehicle.</p> : <>
    <div className="people-grid">{vehicles.data.length ? vehicles.data.map((v) => <section className="person-card" key={v.id}><span className="team-icon"><Icon name="car" /></span><h2>{v.label}{v.retired_at ? " (retired)" : ""}</h2><p>{v.passenger_seats} passenger seats</p><ActionDialog title={v.retired_at ? "Restore vehicle" : "Edit vehicle"}>
      <DriverForm command="saveVehicle" fields={{ vehicle_id:v.id, version:String(v.version) }} label={v.retired_at ? "Restore vehicle" : "Update vehicle"}><VehicleFields label={v.label} seats={v.passenger_seats} /></DriverForm>
      {!v.retired_at && <DriverForm command="saveVehicle" fields={{ vehicle_id:v.id, version:String(v.version),label:v.label,passenger_seats:String(v.passenger_seats),retire:"yes" }} label="Retire vehicle"><Confirmation>I confirm retirement of this vehicle.</Confirmation></DriverForm>}
    </ActionDialog></section>) : <p>No registered vehicles yet.</p>}</div>
    <ActionDialog title="Add a vehicle" tone="primary" inline={!vehicles.data.length}><DriverForm command="saveVehicle" fields={{ vehicle_id:crypto.randomUUID(),version:"0" }} label="Save vehicle"><VehicleFields /></DriverForm></ActionDialog>
    </>}
  </>;
}
