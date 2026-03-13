import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Gamepad2, Shield } from "lucide-react";

import { TeamDetailMemberActions } from "@/components/admin/team-detail-member-actions";
import { AdminBadge } from "@/components/admin/admin-badge";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function AdminTeamDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, logo_url, captain_id, created_at, max_members")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      name: string;
      logo_url: string | null;
      captain_id: string;
      created_at: string;
      max_members: number;
    }>();

  if (!team) notFound();

  const [{ data: membersRaw }, { data: profilesRaw }, { data: registrationsRaw }, { data: matchesRaw }, { data: logsRaw }] = await Promise.all([
    supabase
      .from("team_members")
      .select("user_id, role, joined_at")
      .eq("team_id", team.id)
      .order("joined_at", { ascending: true }),
    supabase.from("profiles").select("id, display_name, username, xbox_gamertag"),
    supabase
      .from("registrations")
      .select("id, status, created_at, events(title)")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("matches")
      .select("id, event_id, score_a, score_b, winner_id, created_at, team_a_id, team_b_id")
      .or(`team_a_id.eq.${team.id},team_b_id.eq.${team.id}`)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("admin_action_logs")
      .select("id, action, created_at, details")
      .eq("target_type", "team")
      .eq("target_id", team.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const profileMap = new Map<string, { display_name: string; username: string; xbox_gamertag: string | null }>();
  for (const profile of profilesRaw ?? []) {
    profileMap.set(profile.id as string, {
      display_name: (profile.display_name as string) || "Usuário",
      username: (profile.username as string) || "desconhecido",
      xbox_gamertag: (profile.xbox_gamertag as string | null) ?? null,
    });
  }

  const members = (membersRaw ?? []).map((member) => {
    const userId = member.user_id as string;
    const profile = profileMap.get(userId);
    return {
      user_id: userId,
      role: (member.role as "captain" | "member") || (userId === team.captain_id ? "captain" : "member"),
      joined_at: member.joined_at as string,
      display_name: profile?.display_name ?? "Usuário",
      username: profile?.username ?? "desconhecido",
      xbox_gamertag: profile?.xbox_gamertag ?? null,
    };
  });

  const matchesPlayed = (matchesRaw ?? []).length;
  const wins = (matchesRaw ?? []).filter((m) => (m.winner_id as string | null) === team.id).length;
  const losses = Math.max(matchesPlayed - wins, 0);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        <Link href="/admin/teams" className="text-sm text-cyan-200 hover:text-cyan-100">← Voltar para equipes</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{team.name}</h1>
        <p className="text-sm text-slate-400">Criada em {dateFmt.format(new Date(team.created_at))}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
            <Shield className="h-4 w-4" />
            Estatísticas
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li>Membros: {members.length}/{team.max_members}</li>
            <li>Partidas: {matchesPlayed}</li>
            <li>Vitórias: {wins}</li>
            <li>Derrotas: {losses}</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 lg:col-span-2">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
            <Gamepad2 className="h-4 w-4" />
            Membros
          </h2>
          <ul className="mt-3 space-y-2">
            {members.map((member) => (
              <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-100">{member.display_name}</p>
                  <p className="text-xs text-slate-400">@{member.username} · Xbox: {member.xbox_gamertag ?? "-"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AdminBadge tone={member.user_id === team.captain_id ? "active" : "inactive"}>
                    {member.user_id === team.captain_id ? "Capitão" : "Membro"}
                  </AdminBadge>
                  <TeamDetailMemberActions
                    teamId={team.id}
                    userId={member.user_id}
                    isCaptain={member.user_id === team.captain_id}
                    displayName={member.display_name}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
            <Calendar className="h-4 w-4" />
            Torneios
          </h2>
          <ul className="mt-3 space-y-2">
            {(registrationsRaw ?? []).map((reg) => {
              const event = Array.isArray(reg.events) ? reg.events[0] : reg.events;
              return (
                <li key={reg.id as string} className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-slate-200">
                  <p>{(event as { title?: string } | null)?.title ?? "Evento"}</p>
                  <p className="text-xs text-slate-400">{String(reg.status)} · {dateFmt.format(new Date(String(reg.created_at)))}</p>
                </li>
              );
            })}
            {(registrationsRaw ?? []).length === 0 ? <li className="text-sm text-slate-500">Sem inscrições.</li> : null}
          </ul>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Histórico de mudanças</h2>
          <ul className="mt-3 space-y-2">
            {(logsRaw ?? []).map((log) => (
              <li key={log.id as string} className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-slate-300">
                <p className="font-semibold">{String(log.action)}</p>
                <p>{dateFmt.format(new Date(String(log.created_at)))}</p>
                <p className="text-slate-500">{log.details ? JSON.stringify(log.details) : "-"}</p>
              </li>
            ))}
            {(logsRaw ?? []).length === 0 ? <li className="text-sm text-slate-500">Sem logs.</li> : null}
          </ul>
        </article>
      </div>
    </section>
  );
}
