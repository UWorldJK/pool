import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/bits";
import { getSession } from "@/lib/pool/data";
import { safeNextPath } from "@/lib/pool/paths";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const { user } = await getSession();
  if (user) redirect(next);

  return (
    <main id="main" className="center-page">
      <section className="card panel">
        <Brand />
        {params.error ? (
          <p className="form-error mb-5" role="alert">
            That sign in link has expired or was already used. Send yourself a new one.
          </p>
        ) : null}
        <LoginForm next={next} />
      </section>
    </main>
  );
}
