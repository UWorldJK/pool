"use client";

import { useActionState } from "react";
import { setDriverApproval } from "@/app/actions";

export function ApprovalToggle({
  teamId,
  childId,
  childName,
  driverId,
  driverName,
  approved,
}: {
  teamId: string;
  childId: string;
  childName: string;
  driverId: string;
  driverName: string;
  approved: boolean;
}) {
  const [state, action, pending] = useActionState(setDriverApproval, null);
  return (
    <form action={action} className="approval-toggle">
      <input type="hidden" name="team" value={teamId} />
      <input type="hidden" name="child" value={childId} />
      <input type="hidden" name="driver" value={driverId} />
      <input type="hidden" name="approve" value={approved ? "false" : "true"} />
      <span>
        Can drive {childName}
        {state && !state.ok ? (
          <span className="block text-amber" role="alert">
            {state.message}
          </span>
        ) : null}
      </span>
      <button
        type="submit"
        className="switch"
        role="switch"
        aria-checked={approved}
        aria-label={`${driverName} can drive ${childName}`}
        disabled={pending}
      >
        <span />
      </button>
    </form>
  );
}
