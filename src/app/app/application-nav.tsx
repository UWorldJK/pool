"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Brand } from "./presentation";

const destinations = [
  ["/app/attention", "Needs attention", "attention"],
  ["/app/schedule", "Weekly schedule", "schedule"],
  ["/app", "Families and circles", "family"],
  ["/app/driving", "Your driving", "driving"],
] as const;

function NavIcon({ name }: { name: string }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{name === "attention" ? <><circle cx="12" cy="12" r="8" /><path d="M12 7v6m0 4h.01" /></> : name === "schedule" ? <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4m8-4v4M4 10h16m-11 4h.01M12 14h.01M16 14h.01" /></> : name === "family" ? <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-2-4" /></> : <><path d="m5 15 2-7h10l2 7M4 15h16v5h-3v-2H7v2H4zM7 15h.01M17 15h.01" /></>}</svg>;
}

export function ApplicationNav({ account }: { account: React.ReactNode }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => dialog.current?.close();
  useEffect(() => { if (dialog.current?.open) dialog.current.close(); }, [pathname]);
  function links() {
    return <nav aria-label="Application">{destinations.map(([href, label, icon]) => {
      const current = pathname === href || (href === "/app" && /\/app\/(families|circles|children|invitations)(\/|$)/.test(pathname)) || (href === "/app/driving" && pathname === "/app/vehicles");
      return <Link key={href} href={href} aria-current={current ? "page" : undefined} onClick={close}><NavIcon name={icon} />{label}</Link>;
    })}</nav>;
  }
  return <>
    <aside className="sidebar"><Link href="/app" aria-label="Pool home"><Brand /></Link>{links()}<Link className="button primary" href="/app/rides/new">＋ Plan a ride</Link><div className="sidebar-account">{account}</div></aside>
    <div className="mobile-header"><Link href="/app" aria-label="Pool home"><Brand /></Link><button ref={trigger} type="button" className="menu-trigger" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">Menu <span aria-hidden="true">☰</span></button></div>
    <dialog ref={dialog} className="navigation-dialog" aria-labelledby="navigation-title" onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const items = dialog.current?.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),summary");
      const visible = items && [...items].filter((item) => item.getClientRects().length);
      if (!visible?.length) return;
      const first = visible[0], last = visible[visible.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }} onClose={() => { if (trigger.current?.getClientRects().length) trigger.current.focus(); else document.getElementById("main-content")?.focus(); }} onClick={(event) => { if (event.target === dialog.current) close(); }}>
      <div className="dialog-heading"><h2 id="navigation-title">Your Pool</h2><button type="button" onClick={close} autoFocus aria-label="Close navigation">×</button></div>{links()}<div className="mobile-account">{account}</div><Link className="button primary" href="/app/rides/new" onClick={close}>＋ Plan a ride</Link>
    </dialog>
  </>;
}
