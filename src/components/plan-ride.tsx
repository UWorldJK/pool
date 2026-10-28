"use client";

import { useState } from "react";
import { planRide } from "@/app/actions";
import { ActionForm, SubmitButton } from "./action-form";
import { CloseButton, Dialog } from "./dialog";

type Props = {
  teamId: string;
  riders: { id: string; name: string; mine: boolean }[];
  defaultStart: string;
  minStart: string;
  seats: number;
  zoneLabel: string;
  variant?: "primary" | "secondary";
};

export function PlanRideDialog({ teamId, riders, defaultStart, minStart, seats, zoneLabel, variant = "primary" }: Props) {
  const [driving, setDriving] = useState(false);
  const [selected, setSelected] = useState(() => new Set(riders.filter((r) => r.mine).map((r) => r.id)));
  const tooMany = driving && selected.size > seats;

  return (
    <Dialog label="Plan a ride" icon="plus" variant={variant} eyebrow="Plan with your circle" title="One more ride, sorted.">
      <ActionForm action={planRide} className="form" closeOnSuccess>
        <input type="hidden" name="team" value={teamId} />
        <label>
          Ride name
          <input name="title" required maxLength={60} defaultValue="To practice" />
        </label>
        <div className="form-pair">
          <label>
            Day and pickup time
            <span className="hint">{zoneLabel}</span>
            <input name="start" type="datetime-local" required defaultValue={defaultStart} min={minStart} />
          </label>
          <label>
            Repeat
            <span className="hint">Each week becomes its own ride.</span>
            <select name="weeks" defaultValue="1">
              <option value="1">Just this once</option>
              {[2, 4, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  Weekly for {n} weeks
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Pickup point
          <input name="pickup" required maxLength={100} placeholder="Maple Grove · family pickup point" />
        </label>
        <label>
          Drop-off
          <input name="dropoff" required maxLength={100} placeholder="Meadow Park · North entrance" />
        </label>
        <fieldset>
          <legend>Riders</legend>
          {riders.length === 0 ? (
            <p className="small">No children are on this team yet. Add riders from My circle.</p>
          ) : (
            <div className="choice-list">
              {riders.map((r) => (
                <label key={r.id} className="choice">
                  <input
                    type="checkbox"
                    name="child"
                    value={r.id}
                    checked={selected.has(r.id)}
                    onChange={(event) => {
                      const next = new Set(selected);
                      if (event.target.checked) next.add(r.id);
                      else next.delete(r.id);
                      setSelected(next);
                    }}
                  />
                  {r.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <label>
          Driver
          <select name="driver" defaultValue="" onChange={(event) => setDriving(event.target.value === "me")}>
            <option value="">Find a driver later</option>
            <option value="me">I&apos;ll drive</option>
          </select>
        </label>
        {driving ? (
          <label className="check-row">
            <input type="checkbox" name="seats" required />
            I have {selected.size} passenger {selected.size === 1 ? "seat" : "seats"} and can fit every rider&apos;s required car seat or booster.
          </label>
        ) : null}
        {tooMany ? (
          <p className="form-error">
            Your profile lists {seats} passenger seats. Choose fewer riders or update your seats in Settings.
          </p>
        ) : null}
        <p className="footnote">
          If you drive and a family hasn&apos;t approved you, they&apos;ll be asked for each ride. You&apos;re only assigned once they say yes.
        </p>
        <div className="form-actions">
          <CloseButton />
          <SubmitButton icon="check">Save ride</SubmitButton>
        </div>
      </ActionForm>
    </Dialog>
  );
}
