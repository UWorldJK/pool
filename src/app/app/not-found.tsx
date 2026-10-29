import Link from "next/link";
export default function UnavailableMembership() {
  return <><h1>Membership unavailable</h1><p>This family or circle is unavailable to your account. A membership may have changed.</p><Link href="/app">Return to your families</Link></>;
}
