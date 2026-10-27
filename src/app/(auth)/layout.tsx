import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-container">
      <section className="auth-card">
        <Link className="brand" href="/">
          pool.
        </Link>
        {children}
      </section>
    </main>
  );
}
