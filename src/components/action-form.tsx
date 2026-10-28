"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/pool/action-result";
import { useDialog } from "./dialog";
import { Icon, type IconName } from "./icon";
import { toast } from "./toaster";

type Action = (previous: ActionResult, formData: FormData) => Promise<ActionResult>;

type Props = {
  action: Action;
  children: React.ReactNode;
  className?: string;
  /** Inside a Dialog, close it after a successful submission. */
  closeOnSuccess?: boolean;
  id?: string;
};

// Wraps a Server Action form. Errors show inline next to the form; success shows
// as a toast, because a successful action often removes the form that sent it.
export function ActionForm({ action, children, className = "form", closeOnSuccess, id }: Props) {
  const dialog = useDialog();
  const announced = useCallback<Action>(
    async (previous, formData) => {
      const result = await action(previous, formData);
      if (result?.ok) {
        toast(result.message);
        if (closeOnSuccess) dialog?.close();
      }
      return result;
    },
    [action, closeOnSuccess, dialog],
  );
  const [state, formAction, pending] = useActionState(announced, null);
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state && !state.ok) messageRef.current?.focus();
  }, [state]);

  const error = state && !state.ok ? state.message : "";

  return (
    <form action={formAction} className={className} aria-busy={pending} id={id}>
      {children}
      <p ref={messageRef} tabIndex={-1} role="alert" className={error ? "form-error" : "sr-only"}>
        {error}
      </p>
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  icon,
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "plain" | "danger";
  icon?: IconName;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  // The label stays the same while pending so the button keeps its accessible name;
  // the form is marked aria-busy and the button is disabled instead.
  return (
    <button type="submit" className={`button ${variant}`} disabled={pending} name={name} value={value}>
      {icon ? <Icon name={icon} size={18} /> : null}
      <span>{children}</span>
    </button>
  );
}
