import { Shield } from "lucide-react";

import { TeamsTable } from "@/components/admin/teams-table";
import { createClient } from "@/lib/supabase/server";

type TeamRow = {
  id: string;
  name: string;
  logo_url: string | null;
  captain_id: string;
  created_at: string;
  max_members: number;
};

export default async function AdminTeamsPage() {
  const supabase = await createClient();

  const [{ data: teamsRaw }, { data: membersRaw }, { data: captainsRaw }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, logo_url, captain_id, created_at, max_members")
      .order("created_at", { ascending: false })
      .limit(1200),
    supabase.from("team_members").select("team_id"),
    supabase.from("profiles").select("id, display_name, username"),
  ]);

  const teams = (teamsRaw ?? []) as TeamRow[];

  const memberCountMap = new Map<string, number>();
  for (const row of membersRaw ?? []) {
    const teamId = row.team_id as string;
    memberCountMap.set(teamId, (memberCountMap.get(teamId) ?? 0) + 1);
  }

  const captainMap = new Map<string, string>();
  for (const row of captainsRaw ?? []) {
    captainMap.set(row.id as string, (row.display_name as string) || (row.username as string) || "Capitão");
  }

  const rows = teams.map((team) => ({
    id: team.id,
    name: team.name,
    logo_url: team.logo_url,
    captain_id: team.captain_id,
    captain_name: captainMap.get(team.captain_id) ?? "Capitão",
    member_count: memberCountMap.get(team.id) ?? 0,
    max_members: team.max_members ?? 10,
    created_at: team.created_at,
  }));

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Admin</p>
        <h1 className="mt-1 inline-flex items-center gap-2 text-2xl font-bold text-white">
          <Shield className="h-6 w-6 text-cyan-300" />
          Gerenciamento de Equipes
        </h1>
        <p className="mt-2 text-sm text-slate-400">Monitore status, membros e ações de moderação em equipes.</p>
      </header>

      <TeamsTable rows={rows} />
    </section>
  );
}
