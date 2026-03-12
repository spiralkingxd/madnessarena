import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AtSign, Calendar, Users } from "lucide-react";

import { upsertProfileFromOAuth } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { XboxStatusTag } from "@/components/xbox-status-tag";

type ProfileRow = {
  id: string;
  display_name: string;
  username: string;
  xbox_gamertag: string | null;
  avatar_url: string | null;
  created_at: string;
};

type TeamRow = {
  id: string;
  name: string;
  logo_url: string | null;
};

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/profile/me");
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, xbox_gamertag, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profile) {
    await upsertProfileFromOAuth();

    const { data: recoveredProfile } = await supabase
      .from("profiles")
      .select("id, display_name, username, xbox_gamertag, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    profile = recoveredProfile;
  }

  if (!profile) {
    redirect("/");
  }

  // Fetch teams: where user is captain, or a member via team_members table
  const [{ data: captainTeams }, { data: memberLinks }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("captain_id", user.id),
    supabase
      .from("team_members")
      .select("teams(id, name, logo_url)")
      .eq("profile_id", user.id),
  ]);

  // Merge and deduplicate by team id
  const teamsMap = new Map<string, TeamRow>();
  for (const t of (captainTeams ?? []) as TeamRow[]) {
    teamsMap.set(t.id, t);
  }
  for (const link of memberLinks ?? []) {
    const teamData = (link as unknown as { teams: TeamRow[] | null }).teams;
    const t = Array.isArray(teamData) ? teamData[0] : teamData;
    if (t) teamsMap.set(t.id, t);
  }
  const teams = Array.from(teamsMap.values());

  const memberSince = new Date(profile.created_at).toLocaleDateString("pt-BR");

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[radial-gradient(ellipse_at_top,_#0f2847_0%,_#0b1826_50%,_#050b12_100%)] px-4 py-16 text-slate-100">
      <div className="mx-auto w-full max-w-2xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/40 backdrop-blur-sm">
          {/* Gold accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600" />

          {/* Avatar + Name header */}
          <div className="flex flex-col items-center gap-4 px-8 pb-8 pt-10">
            {/* Avatar with golden ring */}
            <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-yellow-400/70 ring-offset-2 ring-offset-slate-900 shadow-[0_0_32px_rgba(250,204,21,0.20)]">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-3xl font-bold text-yellow-400">
                  {profile.display_name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            {/* Display name */}
            <h1 className="text-2xl font-bold tracking-wide text-white">
              {profile.display_name}
            </h1>

            {/* Xbox status */}
            <XboxStatusTag gamertag={profile.xbox_gamertag} />
          </div>

          {/* Divider */}
          <div className="mx-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-white/5">
            <InfoCard
              icon={<AtSign className="h-4 w-4 text-cyan-400" />}
              label="Username"
            >
              <span className="text-sm font-semibold text-slate-100">
                @{profile.username}
              </span>
            </InfoCard>

            {/* Teams cell */}
            <InfoCard
              icon={<Users className="h-4 w-4 text-cyan-400" />}
              label="Equipe"
            >
              {teams.length > 0 ? (
                <div className="flex flex-col items-center gap-1">
                  {teams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="text-sm font-semibold text-yellow-300 transition-colors hover:text-yellow-200 hover:underline"
                    >
                      {team.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-500">Sem equipe</span>
              )}
            </InfoCard>

            <InfoCard
              icon={<Calendar className="h-4 w-4 text-cyan-400" />}
              label="Membro desde"
            >
              <span className="text-sm font-semibold text-slate-100">
                {memberSince}
              </span>
            </InfoCard>
          </div>

          <div className="pb-8" />
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-6 text-center">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}