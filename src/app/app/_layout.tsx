import { Redirect, Slot, usePathname } from "expo-router";
import { useSession } from "@/services/session";
import { ApplicationShell } from "@/ui/shell";
import { Paragraph } from "@/ui/elements";
export default function AppLayout() {
  const { user, ready, ended } = useSession();
  const pathname = usePathname();
  if (!ready)
    return <Paragraph role="status">Checking your session…</Paragraph>;
  if (!user)
    return (
      <Redirect
        href={{
          pathname: "/sign-in",
          params: ended ? { message: ended } : { next: pathname },
        }}
      />
    );
  return (
    <ApplicationShell>
      <Slot />
    </ApplicationShell>
  );
}
