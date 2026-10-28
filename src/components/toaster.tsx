"use client";

import { useEffect, useState } from "react";

const EVENT = "pool:toast";

/** Shows a short confirmation that survives the form that caused it unmounting. */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

export function Toaster() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (event: Event) => {
      setMessage((event as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(""), 5000);
    };
    window.addEventListener(EVENT, show);
    return () => {
      window.removeEventListener(EVENT, show);
      clearTimeout(timer);
    };
  }, []);

  // The live region stays in the DOM so screen readers announce each change.
  return (
    <div role="status" aria-live="polite" className={message ? "toast" : "sr-only"}>
      {message}
    </div>
  );
}
