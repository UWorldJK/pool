"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Brand } from "./presentation";

const destinations = [
  ["/app/attention", "Needs attention", "◉"],
  ["/app/schedule", "Weekly schedule", "▦"],
  ["/app", "Families and circles", "♧"],
  ["/app/invitations", "Invitations", "↗"],
  ["/app/children", "Child setup", "♡"],
  ["/app/driving", "Your driving", "→"],
  ["/app/vehicles", "Your vehicles", "◇"],
] as const;

export function ApplicationNav() {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => dialog.current?.close();

  useEffect(() => {
    if (dialog.current?.open) dialog.current.close();
  }, [pathname]);

  function links() {
    return <nav aria-label="Application">
      {destinations.map(([href, label, symbol]) => {
        const current = pathname === href || (href === "/app" && /\/app\/(families|circles)\//.test(pathname));
        return <Link key={href} href={href} aria-current={current ? "page" : undefined} onClick={close}>
          <span aria-hidden="true">{symbol}</span>{label}
        </Link>;
      })}
    </nav>;
  }

  return <>
    <aside className="sidebar">
      <Link href="/app" aria-label="Pool home"><Brand /></Link>
      <p className="eyebrow">Your coordination space</p>
      {links()}
      <Link className="button primary" href="/app/rides/new">＋ Plan a ride</Link>
      <div className="sidebar-note">
        <strong>A little coordination.</strong><p>A lot of peace of mind.</p>
        <small>Ride details stay with participating families and the confirmed driver.</small>
      </div>
    </aside>
    <div className="mobile-header">
      <Link href="/app" aria-label="Pool home"><Brand /></Link>
      <button ref={trigger} type="button" className="menu-trigger" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        Menu <span aria-hidden="true">☰</span>
      </button>
    </div>
    <dialog ref={dialog} className="navigation-dialog" aria-labelledby="navigation-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const items = dialog.current?.querySelectorAll<HTMLElement>("a[href],button:not([disabled])");
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }}
      onClose={() => {
        if (trigger.current?.getClientRects().length) trigger.current.focus();
        else document.getElementById("main-content")?.focus();
      }}
      onClick={(event) => { if (event.target === dialog.current) close(); }}>
      <div className="dialog-heading">
        <h2 id="navigation-title">Your Pool</h2>
        <button type="button" onClick={close} autoFocus aria-label="Close navigation">×</button>
      </div>
      {links()}
      <Link className="button primary" href="/app/rides/new" onClick={close}>＋ Plan a ride</Link>
    </dialog>
  </>;
}
