"use client";
import { useEffect, useRef } from "react";

// Keep a saved result or failure discoverable after a keyboard submission.
export function OutcomeFocus({ state, children }: { state: { error?: string; message?: string }; children: React.ReactNode }) {
  const outcome = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error || state.message) outcome.current?.focus();
  }, [state]);
  return <div className="form-outcome" ref={outcome} tabIndex={-1}>{children}</div>;
}
