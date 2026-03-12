import Link from "next/link";
import { Anchor, Calendar, Coins, Skull, Sword, Trophy, Users } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type ActiveEventRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: "draft" | "active" | "finished";
  prize_pool: number;
};

type FinishedEventRow = {
  id: string;
  title: string;
  end_date: string | null;
  prize_pool: number;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Em andamento",
  draft: "Em breve",
  finished: "Finalizado",
};

async function getHomeData() {
  if (!isSupabaseConfigured()) {
    return { featuredEvent: null, finishedEvents: [], teamCount: 0, eventCount: 0 };
  }

  const supabase = await createClient();

  const [
    { data: activeEvents },
    { data: finishedEvents },
    { count: teamCount },
    { count: eventCount },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, description, start_date, end_date, status, prize_pool")
      .in("status", ["active", "draft"])
      .order("start_date", { ascending: true })
      .limit(1),
    supabase
      .from("events")
      .select("id, title, end_date, prize_pool")
      .eq("status", "finished")
      .order("end_date", { ascending: false })
      .limit(6),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
  ]);

  return {
    featuredEvent: (activeEvents?.[0] as ActiveEventRow) ?? null,
    finishedEvents: (finishedEvents ?? []) as FinishedEventRow[],
    teamCount: teamCount ?? 0,
    eventCount: eventCount ?? 0,
  };
}

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });
const fmtMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function Home() {
  const { featuredEvent, finishedEvents, teamCount, eventCount } = await getHomeData();

  return (
    <main className="min-h-screen bg-[#050b12] text-slate-100">

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,#0d2640_0%,#050b12_65%)]">
        {/* Grid de fundo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Brilhos */}
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-600/8 blur-[130px]" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/4 h-64 w-80 rounded-full bg-amber-500/6 blur-[100px]" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-24 text-center lg:px-10 lg:py-36">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-amber-400/25 bg-amber-400/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-amber-300">
            <Skull className="h-3.5 w-3.5" />
            Sea of Thieves · Temporada Competitiva
          </div>

          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
            A arena dos mares.
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
              Prove seu valor.
            </span>
          </h1>

          <p className="max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
            Competições oficiais de Sea of Thieves. Monte sua tripulação,
            participe de torneios e conquiste o topo dos mares.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-7 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-900/30 transition hover:bg-amber-300"
            >
              <Trophy className="h-4 w-4" />
              Ver Torneios
            </Link>
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-7 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <Anchor className="h-4 w-4" />
              Criar Equipe
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-6 flex flex-wrap justify-center gap-0 divide-x divide-white/8 rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
            <div className="px-8 py-4 text-center">
              <p className="text-3xl font-extrabold text-white">{eventCount}</p>
              <p className="mt-0.5 text-xs text-slate-500">Torneios</p>
            </div>
            <div className="px-8 py-4 text-center">
              <p className="text-3xl font-extrabold text-white">{teamCount}</p>
              <p className="mt-0.5 text-xs text-slate-500">Equipes</p>
            </div>
            <div className="px-8 py-4 text-center">
              <p className="text-3xl font-extrabold text-white">🏴‍☠️</p>
              <p className="mt-0.5 text-xs text-slate-500">Mar dos Ladrões</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl space-y-20 px-6 py-16 lg:px-10">

        {/* ─── Torneio em Destaque ─────────────────────────────── */}
        {featuredEvent ? (
          <section>
            <SectionHeader eyebrow="Próximo Torneio" title="Destaque da Arena" />
            <article className="relative mt-6 overflow-hidden rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-amber-950/25 via-slate-900/60 to-[#050b12] p-8 shadow-2xl lg:p-10">
              <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-amber-500/6 blur-[80px]" />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={featuredEvent.status} />
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {fmt.format(new Date(featuredEvent.start_date))}
                    </span>
                    {featuredEvent.end_date && (
                      <span className="text-xs text-slate-500">
                        até {fmt.format(new Date(featuredEvent.end_date))}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold text-white lg:text-4xl">{featuredEvent.title}</h2>
                  {featuredEvent.description && (
                    <p className="max-w-2xl text-sm leading-7 text-slate-300">
                      {featuredEvent.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-start gap-4 lg:items-end">
                  {featuredEvent.prize_pool > 0 && (
                    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/8 px-6 py-4 text-center">
                      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/70">
                        Premiação
                      </p>
                      <p className="mt-1.5 text-3xl font-extrabold text-amber-300">
                        {fmtMoney.format(featuredEvent.prize_pool)}
                      </p>
                    </div>
                  )}
                  <Link
                    href={`/events/${featuredEvent.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
                  >
                    <Trophy className="h-4 w-4" />
                    Ver detalhes
                  </Link>
                </div>
              </div>
            </article>
          </section>
        ) : (
          <section className="rounded-[2rem] border border-dashed border-white/10 px-8 py-16 text-center">
            <Trophy className="mx-auto h-12 w-12 text-slate-600" />
            <h2 className="mt-4 text-xl font-bold text-slate-300">Nenhum torneio ativo no momento</h2>
            <p className="mt-2 text-sm text-slate-500">Fique de olho — novos torneios são anunciados em breve.</p>
            <Link
              href="/events"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-300 transition hover:bg-white/8"
            >
              Ver histórico de torneios
            </Link>
          </section>
        )}

        {/* ─── Como Participar ─────────────────────────────────── */}
        <section>
          <SectionHeader eyebrow="Guia" title="Como Participar" />
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: <Users className="h-6 w-6" />,
                step: "01",
                title: "Forme sua equipe",
                desc: "Crie uma equipe na plataforma e convide seus aliados para embarcar na aventura.",
                href: "/teams",
                cta: "Criar equipe",
              },
              {
                icon: <Anchor className="h-6 w-6" />,
                step: "02",
                title: "Inscreva-se no torneio",
                desc: "Escolha um torneio aberto e registre sua equipe antes do prazo de inscrição.",
                href: "/events",
                cta: "Ver torneios",
              },
              {
                icon: <Sword className="h-6 w-6" />,
                step: "03",
                title: "Compita e conquiste",
                desc: "Enfrente outras tripulações, acumule pontos e escale o ranking dos mares.",
                href: "/ranking",
                cta: "Ver ranking",
              },
            ].map(({ icon, step, title, desc, href, cta }) => (
              <div key={step} className="flex flex-col rounded-2xl border border-white/8 bg-white/3 p-6">
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/8 text-cyan-400">
                    {icon}
                  </span>
                  <span className="text-4xl font-black text-white/5">{step}</span>
                </div>
                <h3 className="mt-4 font-bold text-white">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{desc}</p>
                <Link href={href} className="mt-5 self-start text-xs font-semibold text-cyan-300 transition hover:text-cyan-200">
                  {cta} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Últimos Torneios ─────────────────────────────────── */}
        <section>
          <div className="flex items-end justify-between">
            <SectionHeader eyebrow="Histórico" title="Últimos Torneios" />
            <Link
              href="/events?status=finished"
              className="mb-1 shrink-0 text-sm text-cyan-300 transition hover:text-cyan-200"
            >
              Ver todos →
            </Link>
          </div>

          {finishedEvents.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {finishedEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group flex flex-col rounded-2xl border border-white/8 bg-white/3 p-5 transition hover:border-amber-400/25 hover:bg-amber-400/4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-100 group-hover:text-white">{event.title}</h3>
                    <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/50" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    {event.end_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fmt.format(new Date(event.end_date))}
                      </span>
                    )}
                    {event.prize_pool > 0 && (
                      <span className="flex items-center gap-1 text-amber-300/60">
                        <Coins className="h-3 w-3" />
                        {fmtMoney.format(event.prize_pool)}
                      </span>
                    )}
                  </div>
                  <span className="mt-4 self-start text-xs font-medium text-cyan-300/60 transition group-hover:text-cyan-300">
                    Detalhes →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
              <p className="text-sm text-slate-500">Nenhum torneio finalizado ainda. O primeiro está por vir.</p>
            </div>
          )}
        </section>

        {/* ─── CTA Final ───────────────────────────────────────── */}
        <section className="overflow-hidden rounded-[2rem] border border-cyan-400/12 bg-gradient-to-br from-cyan-950/20 to-[#050b12] p-8 text-center lg:p-14">
          <Users className="mx-auto h-10 w-10 text-cyan-400/50" />
          <h2 className="mt-4 text-2xl font-bold text-white lg:text-3xl">Pronto para a batalha?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-400">
            Forme sua tripulação, inscreva-se nos torneios e comprove quem domina os mares.
            Cada partida conta para o ranking.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              <Anchor className="h-4 w-4" />
              Criar equipe
            </Link>
            <Link
              href="/ranking"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <Trophy className="h-4 w-4" />
              Ver ranking
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300/70">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold text-white">{title}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "active" && "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        status === "draft" && "border border-amber-400/30 bg-amber-400/10 text-amber-300",
        status === "finished" && "border border-slate-400/30 bg-slate-400/10 text-slate-300",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
