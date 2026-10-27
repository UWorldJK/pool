import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-xl rounded-3xl border border-[#d5ddcf] bg-white p-8 shadow-sm sm:p-12">
        <p className="mb-12 text-3xl font-bold tracking-tight">pool.</p>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#4b6354]">
          A little coordination. A lot of peace of mind.
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          A smoother ride for every family.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-[#4b6354]">
          We’re building a calmer way for families to share the driving.
        </p>
        <p className="mt-10 border-t border-[#d5ddcf] pt-6 text-sm leading-relaxed text-[#4b6354]">
          Pool is in development. Adult accounts are available; ride planning is coming next.
        </p>
        <nav className="mt-6 flex flex-wrap gap-6" aria-label="Account"><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></nav>
      </section>
    </main>
  );
}
