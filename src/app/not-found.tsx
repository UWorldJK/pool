import Link from "next/link";
import { Brand } from "@/components/bits";

export default function NotFound() {
  return (
    <main id="main" className="center-page">
      <section className="card panel">
        <Brand />
        <p className="eyebrow">Not found</p>
        <h1 className="mt-3">We couldn&apos;t find that.</h1>
        <p>It may have been removed, or it belongs to a team you&apos;re not on.</p>
        <div className="journey-actions">
          <Link className="button primary" href="/">
            Go to Pool
          </Link>
        </div>
      </section>
    </main>
  );
}
