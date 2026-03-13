import Link from "next/link";
import { CalendarDays, Gamepad2, ShieldCheck, Trophy, Users } from "lucide-react";

import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminCard } from "@/components/admin/admin-card";
import { DashboardRecentActivityTable } from "@/components/admin/dashboard-recent-activity-table";
import { createClient } from "@/lib/supabase/server";

type ActivityItem = {
  type: "user" | "team" | "event";
  title: string;
  created_at: string;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 29);
  cutoff.setHours(0, 0, 0, 0);

  const [
    { count: usersCount },
    { count: teamsCount },
    { count: eventsCount },
    { count: activeEventsCount },
    { data: registrationsRaw },
    { data: recentUsersRaw },
    { data: recentTeamsRaw },
    { data: recentEventsRaw },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("registrations")
      .select("created_at")
      .gte("created_at", cutoff.toISOString()),
    supabase
      .from("profiles")
      .select("display_name, username, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("teams")
      .select("name, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("events")
      .select("title, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const chartMap = new Map<string, number>();
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(cutoff);
    d.setDate(cutoff.getDate() + i);
    chartMap.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of registrationsRaw ?? []) {
    const key = String(row.created_at).slice(0, 10);
    chartMap.set(key, (chartMap.get(key) ?? 0) + 1);
  }

  const registrationsChart = Array.from(chartMap.entries()).map(([iso, total]) => ({
    iso,
    total,
  }));

  const maxChart = Math.max(...registrationsChart.map((item) => item.total), 1);

  const recentUsers = (recentUsersRaw ?? []).map((user) => ({
    type: "user" as const,
    title: `Novo usuário: ${(user.display_name as string) || (user.username as string) || "Usuário"}`,
    created_at: user.created_at as string,
  }));

  const recentTeams = (recentTeamsRaw ?? []).map((team) => ({
    type: "team" as const,
    title: `Nova equipe: ${(team.name as string) || "Equipe"}`,
    created_at: team.created_at as string,
  }));

  const recentEvents = (recentEventsRaw ?? []).map((event) => ({
    type: "event" as const,
    title: `Novo evento: ${(event.title as string) || "Evento"}`,
    created_at: event.created_at as string,
  }));

  const recentActivity: ActivityItem[] = [...recentUsers, ...recentTeams, ...recentEvents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 18);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Visão Geral</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Dashboard Administrativo</h1>
        <p className="mt-2 text-sm text-slate-400">
          Panorama operacional do MadnessArena com métricas em tempo real do banco.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminCard label="Total de Usuários" value={String(usersCount ?? 0)} helper="Perfis cadastrados" icon={<Users className="h-5 w-5" />} />
        <AdminCard label="Total de Equipes" value={String(teamsCount ?? 0)} helper="Tripulações ativas" icon={<ShieldCheck className="h-5 w-5" />} />
        <AdminCard label="Total de Torneios" value={String(eventsCount ?? 0)} helper="Eventos cadastrados" icon={<Trophy className="h-5 w-5" />} />
        <AdminCard label="Eventos Ativos" value={String(activeEventsCount ?? 0)} helper="Em andamento" icon={<Gamepad2 className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Inscrições nos últimos 30 dias</h2>
            <AdminBadge tone="info">Dados reais</AdminBadge>
          </div>
          <div className="mt-5 flex h-56 items-end gap-1 overflow-hidden rounded-xl border border-white/10 bg-black/20 px-2 pb-2 pt-4">
            {registrationsChart.map((point) => {
              const height = Math.max(6, Math.round((point.total / maxChart) * 190));
              return (
                <div key={point.iso} className="group relative flex flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-cyan-500/70 to-cyan-300/80 transition group-hover:from-amber-500/80 group-hover:to-amber-300/90"
                    style={{ height }}
                    title={`${dateFmt.format(new Date(point.iso))}: ${point.total} inscrição(ões)`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
          <h2 className="text-lg font-semibold text-white">Ações Rápidas</h2>
          <div className="mt-4 space-y-2">
            <form action="/admin/events">
              <AdminButton className="w-full justify-start" type="submit">
                <CalendarDays className="h-4 w-4" />
                Gerenciar eventos
              </AdminButton>
            </form>
            <form action="/admin/tournaments">
              <AdminButton className="w-full justify-start" type="submit" variant="ghost">
                <Trophy className="h-4 w-4" />
                Gerenciar torneios
              </AdminButton>
            </form>
            <form action="/admin/teams">
              <AdminButton className="w-full justify-start" type="submit" variant="ghost">
                <ShieldCheck className="h-4 w-4" />
                Gerenciar equipes
              </AdminButton>
            </form>
            <form action="/admin/members">
              <AdminButton className="w-full justify-start" type="submit" variant="ghost">
                <Users className="h-4 w-4" />
                Gerenciar membros
              </AdminButton>
            </form>
            <form action="/admin/matches">
              <AdminButton className="w-full justify-start" type="submit" variant="ghost">
                <Gamepad2 className="h-4 w-4" />
                Gerenciar partidas
              </AdminButton>
            </form>
            <form action="/admin/results">
              <AdminButton className="w-full justify-start" type="submit" variant="ghost">
                <Trophy className="h-4 w-4" />
                Ver resultados
              </AdminButton>
            </form>
            <Link href="/events" className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10">
              Ver portal público
            </Link>
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Atividades recentes</h2>
        <DashboardRecentActivityTable data={recentActivity} />
      </section>
    </section>
  );
}
