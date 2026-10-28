import Link from "next/link";
import { Brand } from "./app/presentation";
export default function Home() {
  return <main className="landing"><Brand /><section className="panel"><p className="eyebrow">A little coordination. A lot of peace of mind.</p><h1>A smoother ride for every family.</h1><p>Bring your circle together. Plan the ride, confirm who’s driving, and make every child’s handoff explicit.</p><nav aria-label="Account"><Link className="button primary" href="/sign-in">Sign in</Link><Link className="button secondary" href="/sign-up">Create account</Link></nav><p className="notice">Pool is in development. Adults coordinate rides and report pickup, arrival and receipt themselves.</p></section></main>;
}
