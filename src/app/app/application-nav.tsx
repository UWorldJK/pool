"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Avatar, Brand, Icon } from "./presentation";

const destinations = [
  ["/app/attention", "Today", "home"],
  ["/app/schedule", "Schedule", "calendar"],
  ["/app", "My circle", "users"],
  ["/app/driving", "Driving", "activity"],
] as const;
const setup = [["/app/children", "Children", "users"], ["/app/vehicles", "Vehicles", "car"], ["/app/invitations", "Invitations", "shield"]] as const;

export function ApplicationNav({ account, name, circle }: { account: React.ReactNode; name: string; circle?: string }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => dialog.current?.close();
  useEffect(() => { if (dialog.current?.open) dialog.current.close(); }, [pathname]);
  const current = (href: string) => pathname === href || (href === "/app" && /\/app\/(families|circles)(\/|$)/.test(pathname));
  const location = destinations.find(([href]) => current(href))?.[1] || setup.find(([href]) => current(href))?.[1] || (pathname.endsWith("/new") ? "Plan a ride" : "Ride details");
  function links(mobile = false) {
    return <nav aria-label={mobile ? "Phone navigation" : "Application"} className={mobile ? "mobile-nav" : undefined}>{destinations.map(([href, label, icon]) =>
      <Link key={href} href={href} aria-current={current(href) ? "page" : undefined} onClick={close}><Icon name={icon} />{label}{!mobile && current(href) && <span className="nav-dot" />}</Link>
    )}</nav>;
  }
  function setupLinks() {
    return <nav aria-label="Family setup" className="setup-navigation">{setup.map(([href, label, icon]) => <Link key={href} href={href} aria-current={current(href) ? "page" : undefined} onClick={close}><Icon name={icon} />{label}</Link>)}</nav>;
  }
  return <>
    <aside className="sidebar"><Link href="/app/attention" aria-label="Pool home"><Brand /></Link>
      <Link href="/app" className="team"><span className="team-icon"><Icon name="shield" /></span><span><strong>{circle || "Your circles"}</strong><small>Share the driving</small></span></Link>
      {links()}{setupLinks()}
      <div className="sidebar-bottom"><div className="sidebar-note"><Icon name="leaf" size={26} /><p>A little coordination.<br />A lot of peace of mind.</p></div><Link className="text-link" href="/app/rides/new">＋ Plan a ride</Link></div>
    </aside>
    <header className="topbar"><div className="breadcrumb">Your family <span>/</span><strong>{location}</strong></div><div className="topbar-right"><div className="profile"><Avatar name={name} /><span>{name}</span>{account}</div><button ref={trigger} type="button" className="menu-trigger" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" aria-label="Menu">☰</button></div></header>
    {links(true)}
    <dialog ref={dialog} className="navigation-dialog" aria-labelledby="navigation-title" onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const visible = [...event.currentTarget.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),summary")].filter((item) => item.getClientRects().length);
      const first = visible[0], last = visible.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onClose={() => { if (trigger.current?.getClientRects().length) trigger.current.focus(); else document.getElementById("main-content")?.focus(); }}>
      <div className="dialog-heading"><h2 id="navigation-title">Your Pool</h2><button type="button" className="icon-button" onClick={close} autoFocus aria-label="Close navigation">×</button></div>{links()}{setupLinks()}<Link className="button primary" href="/app/rides/new" onClick={close}>＋ Plan a ride</Link>
    </dialog>
  </>;
}
