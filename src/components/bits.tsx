import Link from "next/link";
import { Icon, PoolMark } from "./icon";
import { initials, type Tone } from "@/lib/pool/rides";

// Stable color per person so the same driver always looks the same.
function toneFor(id: string) {
  let sum = 0;
  for (const char of id) sum = (sum + char.charCodeAt(0)) % 4;
  return sum === 0 ? "" : `tone-${sum}`;
}

export function Avatar({ id, name, size }: { id: string; name: string; size?: "small" | "large" }) {
  return (
    <span className={`avatar ${toneFor(id)} ${size ?? ""}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Tag({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`tag ${tone === "green" ? "" : tone}`}>
      <Icon name={tone === "amber" ? "warning" : tone === "muted" ? "info" : "check"} size={14} />
      {label}
    </span>
  );
}

export function Route({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <dl className="route">
      <div>
        <dt>
          <span className="route-dot" />
          Pickup
        </dt>
        <dd>{pickup}</dd>
      </div>
      <div>
        <dt>
          <span className="route-dot end" />
          Drop-off
        </dt>
        <dd>{dropoff}</dd>
      </div>
    </dl>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="Pool home">
      <PoolMark />
      pool<span>.</span>
    </Link>
  );
}

export function Notice({
  tone,
  icon,
  title,
  children,
}: {
  tone: "green" | "amber";
  icon?: Parameters<typeof Icon>[0]["name"];
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`notice ${tone}`}>
      {icon ? <Icon name={icon} /> : null}
      <div>
        <strong>{title}</strong>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        {children ? <p>{children}</p> : null}
      </div>
      {action}
    </div>
  );
}
