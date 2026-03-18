import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, AtSign, Calendar, Clock, Crown, Shield, Swords, Target, Trophy, Users } from "lucide-react";

import { XboxStatusTag } from "@/components/xbox-status-tag";
import { getDictionary, getLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

type PublicProfile = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  xbox_gamertag: string | null;
  custom_status: string | null;
  boat_role: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  rankings?: {
    wins: number;
    losses: number;
    points: number;
  }[];
};

type TeamMembershipRow = {
  team_id: string;
  role: "captain" | "member";
  joined_at: string;
};

type TeamRow = {
  id: string;
  name: string;
  logo_url: string | null;
  max_members: number | null;
};

type TeamRankingRow = {
  team_id: string;
  points: number;
  wins: number;
  losses: number;
  rank_position: number | null;
};

type TeamCard = {
  id: string;
  name: string;
  logo_url: string | null;
  role: "captain" | "member";
  joined_at: string;
  member_count: number;
  max_members: number;
  wins: number;
  losses: number;
  points: number;
  rank_position: number | null;
  tournaments_won: number;
};

type Props = { params: Promise<{ id: string }> };

export default async function PublicProfilePage({ params }: Props) {
  const dict = await getDictionary();
  const locale = await getLocale();
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, xbox_gamertag, custom_status, boat_role, role, created_at, updated_at, rankings(wins, losses, points)")
    .eq("id", id)
    .maybeSingle<PublicProfile>();

  if (!profile) notFound();

  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const memberSince = new Intl.DateTimeFormat(dateLocale, {
    timeZone: "America/Sao_Paulo",
    dateStyle: "medium",
  }).format(new Date(profile.created_at));
  const lastActivity = profile.updated_at
    ? new Intl.DateTimeFormat(dateLocale, {
        timeZone: "America/Sao_Paulo",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(profile.updated_at))
    : "--";

  const { data: membershipsRaw } = await supabase
    .from("team_members")
    .select("team_id, role, joined_at")
    .eq("user_id", id)
    .returns<TeamMembershipRow[]>();

  const memberships = membershipsRaw ?? [];
  const teamIds = Array.from(new Set(memberships.map((membership) => membership.team_id)));

  const [teamsResponse, countsResponse, rankingsResponse, finalWinsResponse] = teamIds.length
    ? await Promise.all([
        supabase.from("teams").select("id, name, logo_url, max_members").in("id", teamIds).returns<TeamRow[]>(),
        supabase.from("team_members").select("team_id").in("team_id", teamIds),
        supabase
          .from("team_rankings")
          .select("team_id, points, wins, losses, rank_position")
          .in("team_id", teamIds)
          .returns<TeamRankingRow[]>(),
        supabase.from("matches").select("event_id, winner_id").in("winner_id", teamIds).is("next_match_id", null),
      ])
    : [
        { data: [] as TeamRow[], error: null },
        { data: [] as Array<{ team_id: string }>, error: null },
        { data: [] as TeamRankingRow[], error: null },
        { data: [] as Array<{ event_id: string; winner_id: string }>, error: null },
      ];

  const teamMap = new Map<string, TeamRow>();
  for (const team of teamsResponse.data ?? []) {
    teamMap.set(String(team.id), team);
  }

  const memberCountMap = new Map<string, number>();
  for (const row of countsResponse.data ?? []) {
    const teamId = String(row.team_id);
    memberCountMap.set(teamId, (memberCountMap.get(teamId) ?? 0) + 1);
  }

  const rankingMap = new Map<string, TeamRankingRow>();
  for (const row of rankingsResponse.data ?? []) {
    rankingMap.set(String(row.team_id), row);
  }

  const tournamentWinMap = new Map<string, number>();
  const uniqueTournamentWins = new Set<string>();
  for (const row of finalWinsResponse.data ?? []) {
    const winnerId = String(row.winner_id);
    const eventId = String(row.event_id);
    tournamentWinMap.set(winnerId, (tournamentWinMap.get(winnerId) ?? 0) + 1);
    uniqueTournamentWins.add(`${winnerId}:${eventId}`);
  }

  const teams: TeamCard[] = memberships
    .map((membership) => {
      const team = teamMap.get(membership.team_id);
      if (!team) return null;

      const ranking = rankingMap.get(membership.team_id);
      return {
        id: team.id,
        name: team.name,
        logo_url: team.logo_url ?? null,
        role: membership.role,
        joined_at: membership.joined_at,
        member_count: memberCountMap.get(team.id) ?? 1,
        max_members: team.max_members ?? 10,
        wins: Number(ranking?.wins ?? 0),
        losses: Number(ranking?.losses ?? 0),
        points: Number(ranking?.points ?? 0),
        rank_position: ranking?.rank_position ?? null,
        tournaments_won: tournamentWinMap.get(team.id) ?? 0,
      } satisfies TeamCard;
    })
    .filter((team): team is TeamCard => Boolean(team))
    .sort((a, b) => {
      const roleA = a.role === "captain" ? 0 : 1;
      const roleB = b.role === "captain" ? 0 : 1;
      if (roleA !== roleB) return roleA - roleB;
      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    });

  const playerRanking = profile.rankings?.[0];
  const boatRoles = profile.boat_role
    ? profile.boat_role.split(",").map((role) => role.trim()).filter(Boolean)
    : [];
  const crewVictories = teams.reduce((sum, team) => sum + team.wins, 0);
  const crewLosses = teams.reduce((sum, team) => sum + team.losses, 0);
  const tournamentsWon = uniqueTournamentWins.size;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-14 text-slate-900 dark:bg-[radial-gradient(ellipse_at_top,_#0f2847_0%,_#0b1826_50%,_#050b12_100%)] dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
          {dict.profile.backHome}
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40">
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600" />

          <div className="relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.12),transparent_30%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative h-28 w-28 overflow-hidden rounded-full bg-slate-200 ring-4 ring-yellow-400/70 ring-offset-2 ring-offset-slate-900 shadow-[0_0_32px_rgba(250,204,21,0.20)] dark:bg-slate-800">
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile.display_name} fill sizes="112px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {profile.display_name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <h1 className="flex flex-wrap items-center gap-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                      <span>{profile.display_name}</span>
                      {profile.role === "owner" ? <Crown className="h-6 w-6 text-yellow-500" /> : null}
                      {profile.role === "admin" ? <Shield className="h-6 w-6 text-cyan-400" /> : null}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <AtSign className="h-4 w-4 text-cyan-400" />@{profile.username}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-cyan-400" />
                        {dict.profile.memberSince}: {memberSince}
                      </span>
                    </div>
                  </div>

                  {profile.custom_status ? (
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {profile.custom_status}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <XboxStatusTag gamertag={profile.xbox_gamertag} />
                    {boatRoles.map((role) => (
                      <span key={role} className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[420px]">
                <StatCard icon={<Target className="h-4 w-4 text-emerald-400" />} label={dict.profile.leaguePoints} value={playerRanking?.points ?? 0} />
                <StatCard icon={<Swords className="h-4 w-4 text-cyan-400" />} label={dict.profile.matchWins} value={playerRanking?.wins ?? 0} />
                <StatCard icon={<Trophy className="h-4 w-4 text-amber-400" />} label={dict.profile.tournamentsWon} value={tournamentsWon} />
                <StatCard icon={<Users className="h-4 w-4 text-violet-400" />} label={dict.profile.crewVictories} value={crewVictories} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 border-t border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-slate-200 dark:border-white/5 dark:sm:divide-white/5">
            <InfoCard icon={<AtSign className="h-4 w-4 text-cyan-400" />} label={dict.profile.username}>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">@{profile.username}</span>
            </InfoCard>
            <InfoCard icon={<Calendar className="h-4 w-4 text-cyan-400" />} label={dict.profile.memberSince}>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{memberSince}</span>
            </InfoCard>
            <InfoCard icon={<Clock className="h-4 w-4 text-cyan-400" />} label={dict.profile.lastActivity}>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{lastActivity}</span>
            </InfoCard>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatPanel icon={<Users className="h-4 w-4 text-cyan-400" />} label={dict.profile.currentTeams} value={teams.length} helper={dict.profile.activeCrews} />
          <StatPanel icon={<Trophy className="h-4 w-4 text-amber-400" />} label={dict.profile.tournamentsWon} value={tournamentsWon} helper={dict.profile.profileTrophiesHelper} />
          <StatPanel icon={<Swords className="h-4 w-4 text-violet-400" />} label={dict.profile.winsLosses} value={`${crewVictories} / ${crewLosses}`} helper={dict.profile.teamResultsHelper} />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-xl dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{dict.profile.currentTeams}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{dict.profile.currentTeamsDesc}</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {teams.length}
            </span>
          </div>

          {teams.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => (
                <Link key={team.id} href={`/teams/${team.id}`} className="group rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-amber-400/40 hover:bg-amber-50 dark:border-white/10 dark:bg-white/4 dark:hover:bg-amber-400/8">
                  <div className="flex items-start gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="h-full w-full object-contain" />
                      ) : (
                        <Users className="h-6 w-6 text-amber-400/70" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{team.name}</p>
                          <span className="mt-1 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
                            {team.role === "captain" ? dict.profile.teamCaptain : dict.profile.teamMember}
                          </span>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-amber-400" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniStat label={dict.profile.teamMembers} value={`${team.member_count}/${team.max_members}`} />
                    <MiniStat label={dict.profile.teamPoints} value={team.points} />
                    <MiniStat label={dict.profile.tournamentsWon} value={team.tournaments_won} />
                    <MiniStat label={dict.profile.winsLosses} value={`${team.wins}/${team.losses}`} />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{dict.profile.teamRank}: {team.rank_position ? `#${team.rank_position}` : "-"}</span>
                    <span>
                      {dict.profile.memberSince}: {new Intl.DateTimeFormat(dateLocale, { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(new Date(team.joined_at))}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-white/10 dark:bg-white/2">
              <Users className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">{dict.profile.noTeamsYet}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{dict.profile.noTeamsDesc}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function InfoCard({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-6 text-center">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-center dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function StatPanel({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-lg dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/20">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-center dark:border-white/10 dark:bg-black/10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
