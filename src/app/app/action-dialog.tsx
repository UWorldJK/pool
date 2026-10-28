"use client";

import { useEffect, useId, useRef, useState } from "react";

/** A focused v3 action; closing retains edits and saved/error results. */
export function ActionDialog({ title, children, label = title, tone = "secondary", inline = false, initialOpen = false }: {
  title: string; children: React.ReactNode; label?: string; tone?: "primary" | "secondary" | "plain"; inline?: boolean; initialOpen?: boolean;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // Keep the initial onboarding form mounted through its first saved result.
  const [showInline] = useState(inline);
  useEffect(() => { if (initialOpen && !dialog.current?.open) dialog.current?.showModal(); }, [initialOpen]);
  if (showInline) return <div className="inline-action"><h3>{title}</h3>{children}</div>;
  return <div className="action-dialog">
    <button type="button" ref={trigger} className={`button ${tone}`} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{label}</button>
    <dialog ref={dialog} className="action-modal" aria-labelledby={id} onClose={() => trigger.current?.focus()} onClick={(event) => {
      if (event.target !== dialog.current) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current.close();
    }} onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const nodes = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),summary,[tabindex="0"]')].filter((node) => node.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <header className="dialog-head"><div><p className="eyebrow">YOUR POOL</p><h2 id={id}>{title}</h2></div><button type="button" className="icon-button" aria-label={`Close ${title}`} autoFocus onClick={() => dialog.current?.close()}>×</button></header>
      <div className="dialog-body">{children}</div>
      <footer className="dialog-foot"><button type="button" className="button secondary" onClick={() => dialog.current?.close()}>Done</button></footer>
    </dialog>
  </div>;
}
