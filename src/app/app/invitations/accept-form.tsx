"use client";
import { useActionState, useEffect, useState } from "react";
import { membershipAction } from "../membership-actions";
import { NameField, Outcome } from "../membership-form";
import { SubmitButton } from "../../(auth)/submit-button";
import type { MembershipState } from "@/lib/membership";

export function AcceptInvitation({ families }: { families: { id: string; name: string }[] }) {
  const [link, setLink] = useState("");
  const [kind, setKind] = useState("");
  const [token, setToken] = useState("");
  function readLink(value: string) {
    setLink(value);
    try {
      const parsed = new URL(value, window.location.origin);
      const fragment = new URLSearchParams(parsed.hash.slice(1));
      const nextKind = fragment.get("kind") || "";
      const nextToken = fragment.get("token") || "";
      setKind(["guardian", "circle"].includes(nextKind) ? nextKind : "");
      setToken(/^[a-f0-9]{64}$/.test(nextToken) ? nextToken : "");
    } catch { setToken(""); setKind(""); }
  }
  useEffect(() => {
    // Reading a fragment does not preview or consume it. It never reaches HTTP
    // request URLs/referers/logs. A separate POST checks the verified recipient.
    const syncFragment = () => {
      if (!window.location.hash) return;
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      setLink(window.location.href); setKind(fragment.get("kind") || ""); setToken(fragment.get("token") || "");
      window.history.replaceState(null, "", window.location.pathname);
    };
    const frame = requestAnimationFrame(syncFragment);
    window.addEventListener("hashchange", syncFragment);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", syncFragment); };
  }, []);
  return <>
    <p>Sign in with the invited email, then open your link or paste it here. Opening a link does not accept it.</p>
    <label className="auth-form">Invitation link<input type="text" value={link} onChange={(event) => readLink(event.target.value)} autoComplete="off" /></label>
    <InvitationDecision key={`${kind}-${token}`} kind={kind} token={token} families={families} />
  </>;
}

function InvitationDecision({ kind, token, families }: { kind: string; token: string; families: { id: string; name: string }[] }) {
  const [choice, setChoice] = useState(families[0]?.id || "new");
  const [preview, previewAction] = useActionState(membershipAction, {} as MembershipState);
  const [accepted, acceptAction] = useActionState(membershipAction, {} as MembershipState);
  return <>
    <form className="auth-form" action={previewAction}>
      <input type="hidden" name="command" value="preview-invitation" /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="token" value={token} />
      <SubmitButton>Check invitation</SubmitButton><Outcome state={preview} />
    </form>
    {preview.preview && <form className="auth-form" action={acceptAction} key={token}>
      <h2>{kind === "guardian" ? "Join family" : "Join circle"}: {preview.preview.name}</h2>
      <p>Expires {new Date(preview.preview.expires).toISOString().slice(0, 10)} (UTC).</p>
      <input type="hidden" name="command" value="accept-invitation" /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="token" value={token} />
      <NameField name="display_name" label="Your display name" />
      {kind === "circle" && <>
        <label>Family to join the circle<select name="family_choice" value={choice} onChange={(event) => setChoice(event.target.value)}>
          {families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}<option value="new">Create a new family</option>
        </select></label>
        {choice === "new" && <NameField />}
        <p>Only families you own are available. This does not join the inviter’s family or grant driver approval.</p>
      </>}
      <label className="checkbox-label"><input type="checkbox" name="accept" value="yes" required />I explicitly accept this {kind === "guardian" ? "family guardian" : "circle family"} membership.</label>
      <SubmitButton>Accept invitation</SubmitButton><Outcome state={accepted} />
    </form>}
  </>;
}
