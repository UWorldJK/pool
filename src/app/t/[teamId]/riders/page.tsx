import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setTeamChildren } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { PageIntro } from "@/components/bits";
import { getMe, getTeam } from "@/lib/pool/data";

export const metadata: Metadata = { title: "Riders" };

export default async function RidersPage({ params }: PageProps<"/t/[teamId]/riders">) {
  const { teamId } = await params;
  const [me, team] = await Promise.all([getMe(), getTeam(teamId)]);
  if (!me.profile?.display_name || !me.household) redirect("/welcome");
  const household = me.household;
  const onTeam = new Set([...team.children.values()].filter((c) => c.family_id === household.id).map((c) => c.id));

  return (
    <>
      <PageIntro eyebrow={team.team.name} title={`Who rides with ${team.team.name}?`}>
        Families on this team see the children you choose here, so rides can include them.
      </PageIntro>
      <section className="card settings-card max-w-[560px]">
        <ActionForm action={setTeamChildren}>
          <input type="hidden" name="team" value={teamId} />
          <input type="hidden" name="continue" value="yes" />
          <fieldset>
            <legend>Your children</legend>
            <div className="choice-list">
              {household.children.map((child) => (
                <label key={child.id} className="choice">
                  <input type="checkbox" name="child" value={child.id} defaultChecked={onTeam.has(child.id) || onTeam.size === 0} />
                  {child.first_name}
                </label>
              ))}
            </div>
          </fieldset>
          <SubmitButton icon="check">Save riders</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}
