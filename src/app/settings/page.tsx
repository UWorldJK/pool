import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/pool/data";

export default async function SettingsRedirect() {
  const me = await getMe();
  redirect(me.teams.length ? `/t/${me.teams[0].id}/settings` : nextStep(me));
}
