import Link from "next/link";
import { Brand } from "./app/presentation";
export default function Home() {
  return <main className="landing"><Brand /><section className="panel"><h1>A smoother ride for every family.</h1><p>Share the driving. Stay clear on the plan. Confirm every child’s handoff.</p><nav aria-label="Account"><Link className="button primary" href="/sign-in">Sign in</Link><Link className="button secondary" href="/sign-up">Create account</Link></nav><p className="notice">Pool is in development. Pickup, arrival and receipt are reported by adults.</p></section></main>;
}
