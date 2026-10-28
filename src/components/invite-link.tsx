"use client";

import { useActionState, useState } from "react";
import { createInvite } from "@/app/actions";
import { Icon } from "./icon";

export function InviteLink({ kind, target, label }: { kind: "team" | "family"; target: string; label: string }) {
  const [state, action, pending] = useActionState(createInvite, null);
  const [copied, setCopied] = useState(false);
  const link = state?.ok && state.data ? `${window.location.origin}${state.data}` : null;

  return (
    <form action={action} className="form">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="target" value={target} />
      {link ? (
        <div>
          <label htmlFor={`invite-${kind}`}>{state?.message}</label>
          <div className="copy-field">
            <input id={`invite-${kind}`} readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
            <button
              type="button"
              className="button secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
            >
              <Icon name={copied ? "check" : "link"} size={18} />
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button type="submit" className="button primary" disabled={pending}>
            <Icon name="link" size={18} />
            <span>{pending ? "Creating…" : label}</span>
          </button>
        </div>
      )}
      {state && !state.ok ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
