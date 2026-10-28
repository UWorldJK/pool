"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";

const items: { path: string; label: string; icon: IconName }[] = [
  { path: "", label: "Today", icon: "home" },
  { path: "/schedule", label: "Schedule", icon: "calendar" },
  { path: "/circle", label: "My circle", icon: "users" },
  { path: "/activity", label: "Activity", icon: "activity" },
];

const titles: Record<string, string> = {
  "": "Today",
  "/schedule": "Schedule",
  "/circle": "My circle",
  "/activity": "Activity",
  "/settings": "Settings",
  "/riders": "Riders",
};

function section(pathname: string, base: string) {
  const rest = pathname.slice(base.length);
  if (rest.startsWith("/rides/")) return "/rides";
  return rest.replace(/\/$/, "");
}

export function SideNav({ teamId, attention }: { teamId: string; attention: number }) {
  const base = `/t/${teamId}`;
  const current = section(usePathname(), base);
  return (
    <nav className="side-nav" aria-label="Primary">
      {items.map((item) => (
        <Link key={item.path} href={base + item.path} aria-current={current === item.path ? "page" : undefined}>
          <Icon name={item.icon} />
          <span>{item.label}</span>
          {item.path === "" && attention > 0 ? (
            <span className="nav-count" aria-label={`${attention} need attention`}>
              {attention}
            </span>
          ) : current === item.path ? (
            <span className="nav-dot" />
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav({ teamId, attention }: { teamId: string; attention: number }) {
  const base = `/t/${teamId}`;
  const current = section(usePathname(), base);
  return (
    <nav className="mobile-nav" aria-label="Mobile primary">
      {items.map((item) => (
        <Link key={item.path} href={base + item.path} aria-current={current === item.path ? "page" : undefined}>
          <Icon name={item.icon} size={21} />
          <span>{item.label}</span>
          {item.path === "" && attention > 0 ? (
            <span className="nav-count" aria-label={`${attention} need attention`}>
              {attention}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export function Breadcrumb({ teamName, teamId }: { teamName: string; teamId: string }) {
  const current = section(usePathname(), `/t/${teamId}`);
  return (
    <div className="breadcrumb">
      {teamName} <span>/</span> <strong>{current === "/rides" ? "Ride" : (titles[current] ?? "Today")}</strong>
    </div>
  );
}
