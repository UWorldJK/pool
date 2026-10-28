import Link from "next/link";
import { Avatar, Brand } from "@/components/bits";
import { Icon } from "@/components/icon";
import { attentionWindow, getMe, getRides, getTeam } from "@/lib/pool/data";
import { attentionItems } from "@/lib/pool/rides";
import { Breadcrumb, MobileNav, SideNav } from "./nav";

export default async function TeamLayout({ children, params }: LayoutProps<"/t/[teamId]">) {
  const { teamId } = await params;
  const [me, team] = await Promise.all([getMe(), getTeam(teamId)]);
  const now = new Date();
  const rides = await getRides(teamId, ...attentionWindow(now));
  const familyId = me.household?.id ?? null;
  const noRiders = !!me.household?.children.length && ![...team.children.values()].some((c) => c.family_id === familyId);
  const attention = attentionItems(rides, { id: me.id, familyId }, team, now).length + (noRiders ? 1 : 0);
  const name = me.profile?.display_name || me.email;
  const otherTeams = me.teams.filter((t) => t.id !== teamId);

  return (
    <>
      <aside className="sidebar">
        <Brand href={`/t/${teamId}`} />
        <Link className="team-card" href={`/t/${teamId}/circle`}>
          <span className="team-icon">
            <Icon name="shield" size={22} />
          </span>
          <span>
            <strong>{team.team.name}</strong>
            {team.team.detail ? <small>{team.team.detail}</small> : null}
          </span>
        </Link>
        <SideNav teamId={teamId} attention={attention} />
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Icon name="leaf" size={29} />
            <p>
              A little coordination.
              <br />A lot of peace of mind.
            </p>
          </div>
          {otherTeams.map((t) => (
            <Link key={t.id} className="side-link" href={`/t/${t.id}`}>
              <Icon name="shield" size={18} />
              Switch to {t.name}
            </Link>
          ))}
          <Link className="side-link" href="/teams/new">
            <Icon name="plus" size={18} />
            Start a team
          </Link>
          <Link className="side-link" href={`/t/${teamId}/settings`}>
            <Icon name="settings" size={18} />
            Settings & privacy
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Breadcrumb teamName={team.team.name} teamId={teamId} />
          <Link className="profile-link" href={`/t/${teamId}/settings`} aria-label={`${name}, settings`}>
            <Avatar id={me.id} name={name} />
            <span>{name}</span>
          </Link>
        </header>
        <main id="main" className="page" tabIndex={-1}>
          {children}
          <footer className="site-footer">
            pool<span>.</span>
            <p>A smoother ride for every family.</p>
          </footer>
        </main>
        <MobileNav teamId={teamId} attention={attention} />
      </div>
    </>
  );
}
