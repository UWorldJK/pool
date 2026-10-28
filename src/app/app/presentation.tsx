import Link from "next/link";

export function Brand() {
  return <span className="brand"><svg aria-hidden="true" width="26" height="29" viewBox="0 0 26 29" fill="none"><path d="M4 23V8a5 5 0 0 1 10 0v15M12 23V8a5 5 0 0 1 10 0v15M2 27h22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg><span>pool.</span></span>;
}
export function PageHeading({ eyebrow, title, children, action }: { eyebrow?: string; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return <header className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{children && <p className="page-description">{children}</p>}</div>{action}</header>;
}
export function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "attention" | "positive" }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}
export function RouteSummary({ pickup, destination }: { pickup: string; destination: string }) {
  return <dl className="route-summary"><div><dt>Pickup</dt><dd>{pickup}</dd></div><div><dt>Destination</dt><dd>{destination}</dd></div></dl>;
}
export function EmptyState({ title, children, href, action }: { title: string; children: React.ReactNode; href?: string; action?: string }) {
  return <div className="empty-state"><span aria-hidden="true" className="empty-symbol">↗</span><h3>{title}</h3><p>{children}</p>{href && <Link className="button secondary" href={href}>{action}</Link>}</div>;
}

export { Disclosure } from "./disclosure";
