import Link from "next/link";
import { Brand } from "../app/presentation";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-container">
      <section className="auth-card">
        <Link href="/" aria-label="Pool home"><Brand /></Link>
        {children}
      </section>
    </main>
  );
}
