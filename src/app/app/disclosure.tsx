"use client";
import { useState } from "react";

export function Disclosure({ title, children, open = false, className = "" }: { title: string; children: React.ReactNode; open?: boolean; className?: string }) {
  // Retain the adult's open section across a saved reply. Revalidation may
  // change the suggested default, but must not hide the result or an error.
  const [expanded, setExpanded] = useState(open);
  return <details className={`disclosure ${className}`} open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}><summary>{title}</summary><div className="disclosure-content">{children}</div></details>;
}
