"use client";

import {
  cancelRequest,
  cancelRide,
  claimRide,
  confirmHandoff,
  decideRequest,
  markArrived,
  markPickedUp,
  proposeDriver,
  releaseRide,
  respondToRequest,
  skipRide,
} from "@/app/actions";
import { ActionForm, SubmitButton } from "./action-form";
import { CloseButton, Dialog } from "./dialog";

type Ids = { teamId: string; rideId: string };

function Hidden({ teamId, rideId, childId, requestId }: Ids & { childId?: string; requestId?: string }) {
  return (
    <>
      <input type="hidden" name="team" value={teamId} />
      <input type="hidden" name="ride" value={rideId} />
      {childId ? <input type="hidden" name="child" value={childId} /> : null}
      {requestId ? <input type="hidden" name="request" value={requestId} /> : null}
    </>
  );
}

export function ClaimDialog({
  ids,
  title,
  riders,
  riderCount,
  seats,
  asking,
  label = "I can drive",
  variant = "outline",
}: {
  ids: Ids;
  title: string;
  riders: string;
  riderCount: number;
  seats: number;
  /** Families that would be asked, e.g. "the Chen and Brooks families". Empty when none. */
  asking: string;
  label?: string;
  variant?: "primary" | "outline";
}) {
  return (
    <Dialog label={label} icon="car" variant={variant} eyebrow="Offer to drive" title="A little lift goes a long way.">
      <p>
        <strong className="text-ink">{title}</strong> with {riders}.
      </p>
      {seats < riderCount ? (
        <p className="form-error mt-4">
          Your profile lists {seats} passenger {seats === 1 ? "seat" : "seats"}. This ride has {riderCount} riders. Update your seats in
          Settings first.
        </p>
      ) : null}
      <p className="mt-4">
        {asking
          ? `You'll be assigned once ${asking} approve you for this ride. Until then, nothing changes.`
          : "Every family on this ride has approved you, so you'll be assigned right away."}
      </p>
      <ActionForm action={claimRide} className="form mt-5" closeOnSuccess>
        <Hidden {...ids} />
        <label className="check-row">
          <input type="checkbox" name="seats" required />
          I have {riderCount} passenger {riderCount === 1 ? "seat" : "seats"} and can fit every rider&apos;s required car seat or booster.
        </label>
        <div className="form-actions">
          <CloseButton />
          <SubmitButton icon="check">{asking ? "Send my offer" : "Confirm I'm driving"}</SubmitButton>
        </div>
      </ActionForm>
    </Dialog>
  );
}

export function ProposeDialog({
  ids,
  candidates,
  hasDriver,
}: {
  ids: Ids;
  candidates: { id: string; name: string; note: string }[];
  hasDriver: boolean;
}) {
  return (
    <Dialog
      label={hasDriver ? "Suggest another driver" : "Ask someone to drive"}
      icon="users"
      variant="outline"
      eyebrow="Driver plan"
      title={hasDriver ? "Suggest a swap." : "Ask a driver."}
    >
      <p>
        {hasDriver
          ? "The current driver stays assigned until the new driver accepts and every family that hasn't approved them says yes."
          : "They'll be assigned once they accept and every family that hasn't approved them says yes."}
      </p>
      {candidates.length === 0 ? (
        <p className="form-error mt-4">Nobody else on the team has enough seats for this ride yet.</p>
      ) : (
        <ActionForm action={proposeDriver} className="form mt-5" closeOnSuccess>
          <Hidden {...ids} />
          <fieldset>
            <legend>Who should we ask?</legend>
            <div className="choice-list">
              {candidates.map((c) => (
                <label key={c.id} className="choice">
                  <input type="radio" name="driver" value={c.id} required />
                  <span>
                    {c.name} <span className="muted small">· {c.note}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-actions">
            <CloseButton />
            <SubmitButton icon="arrow">Send request</SubmitButton>
          </div>
        </ActionForm>
      )}
    </Dialog>
  );
}

export function RespondForm({ ids, requestId, riderCount }: { ids: Ids; requestId: string; riderCount: number }) {
  return (
    <ActionForm action={respondToRequest} className="form mt-4">
      <Hidden {...ids} requestId={requestId} />
      <label className="check-row">
        <input type="checkbox" name="seats" />
        I have {riderCount} passenger {riderCount === 1 ? "seat" : "seats"} and can fit every rider&apos;s required car seat or booster.
      </label>
      <div className="form-actions">
        <SubmitButton variant="secondary" name="answer" value="decline">
          I can&apos;t drive
        </SubmitButton>
        <SubmitButton icon="check" name="answer" value="accept">
          Accept ride
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DecideForm({ ids, requestId, driverName, childNames }: { ids: Ids; requestId: string; driverName: string; childNames: string }) {
  return (
    <ActionForm action={decideRequest} className="form mt-4">
      <Hidden {...ids} requestId={requestId} />
      <p className="small">
        Your answer covers {childNames} on this ride only. To approve {driverName} for every ride, use My circle.
      </p>
      <div className="form-actions">
        <SubmitButton variant="secondary" name="answer" value="decline">
          Decline
        </SubmitButton>
        <SubmitButton icon="check" name="answer" value="approve">
          Approve {driverName}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CancelRequestForm({ ids, requestId }: { ids: Ids; requestId: string }) {
  return (
    <ActionForm action={cancelRequest} className="form mt-3">
      <Hidden {...ids} requestId={requestId} />
      <div>
        <SubmitButton variant="plain">Cancel this request</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function StepButton({
  ids,
  childId,
  step,
  childName,
}: {
  ids: Ids;
  childId: string;
  step: "pickup" | "arrived" | "skip";
  childName: string;
}) {
  const action = step === "pickup" ? markPickedUp : step === "arrived" ? markArrived : skipRide;
  const label = step === "pickup" ? `${childName} is in the car` : step === "arrived" ? `Arrived with ${childName}` : `${childName} isn't riding`;
  return (
    <ActionForm action={action} className="inline-block">
      <Hidden {...ids} childId={childId} />
      <SubmitButton variant={step === "skip" ? "plain" : "outline"} icon={step === "skip" ? undefined : "check"}>
        {label}
      </SubmitButton>
    </ActionForm>
  );
}

export function HandoffDialog({
  ids,
  childId,
  childName,
  driverName,
}: {
  ids: Ids;
  childId: string;
  childName: string;
  driverName: string;
}) {
  return (
    <Dialog label="Confirm handoff" icon="check" variant="primary" eyebrow={`${childName}'s handoff`} title={`Is ${childName} with you?`}>
      <p>
        {driverName} reported arrival. Confirm only once {childName} is with you. This completes {childName}&apos;s ride.
      </p>
      <ActionForm action={confirmHandoff} className="form mt-5" closeOnSuccess>
        <Hidden {...ids} childId={childId} />
        <label className="check-row">
          <input type="checkbox" name="confirm" required />
          I confirm {childName} is with me now.
        </label>
        <div className="form-actions">
          <CloseButton label="Not yet" />
          <SubmitButton icon="check">Confirm handoff</SubmitButton>
        </div>
      </ActionForm>
    </Dialog>
  );
}

export function ReleaseDialog({ ids }: { ids: Ids }) {
  return (
    <Dialog label="I can't drive" variant="plain" eyebrow="Driver plan" title="Step off this ride?">
      <p>The ride will show as needing a driver, and the families will see it in Needs attention. You can&apos;t undo this.</p>
      <ActionForm action={releaseRide} className="form mt-5" closeOnSuccess>
        <Hidden {...ids} />
        <div className="form-actions">
          <CloseButton label="Keep driving" />
          <SubmitButton variant="danger">I can&apos;t drive</SubmitButton>
        </div>
      </ActionForm>
    </Dialog>
  );
}

export function CancelRideDialog({ ids }: { ids: Ids }) {
  return (
    <Dialog label="Cancel ride" variant="plain" eyebrow="Ride" title="Cancel this ride?">
      <p>Everyone on the team will see it as cancelled. Open driver requests are cancelled too.</p>
      <ActionForm action={cancelRide} className="form mt-5" closeOnSuccess>
        <Hidden {...ids} />
        <div className="form-actions">
          <CloseButton label="Keep ride" />
          <SubmitButton variant="danger">Cancel ride</SubmitButton>
        </div>
      </ActionForm>
    </Dialog>
  );
}
