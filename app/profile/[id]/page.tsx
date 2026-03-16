import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, UserRound, Trophy, Target, Clock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type PublicProfile = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  xbox_gamertag: string | null;
  created_at: string;
  updated_at: string;
  rankings?: {
    wins: number;
    points: number;
  }[];
};

type Props = { params: Promise<{ id: string }> };

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, xbox_gamertag, created_at, updated_at, rankings(wins, points)")
    .eq("id", id)
    .maybeSingle<PublicProfile>();

  if (!profile) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[radial-gradient(ellipse_at_top,_#0f2847_0%,_#0b1826_50%,_#050b12_100%)] px-4 py-14 text-slate-900 dark:text-slate-100">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 transition hover:text-slate-900 dark:hover:text-slate-200"
        >
          ← Voltar para equipes
        </Link>

        <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/65 p-8 shadow-xl dark:shadow-2xl dark:shadow-black/35">
          <div className="flex flex-wrap items-center gap-5">
            <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/10">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <UserRound className="h-7 w-7 text-slate-400 dark:text-slate-500" />
              )}
            </span>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.display_name}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">@{profile.username}</p>
              {profile.xbox_gamertag ? (
                <p className="mt-1 text-sm text-cyan-700 dark:text-cyan-300">Xbox: {profile.xbox_gamertag}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <p className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Na arena desde {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(new Date(profile.created_at))}
                </p>
                {profile.updated_at && (
                  <p className="inline-flex items-center gap-1.5" title="Última atividade registrada">
                    <Clock className="h-4 w-4" />
                    Visto por último: {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(profile.updated_at))}
                  </p>
                )}
              </div>
            </div>

            {/* Stats section */}
            <div className="flex flex-col sm:flex-row gap-3 ml-auto mt-4 sm:mt-0 w-full sm:w-auto">
              <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/80 px-4 py-3 rounded-2xl flex-1 sm:flex-none">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">
                    {profile.rankings?.[0]?.points || 0}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Pontos</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/80 px-4 py-3 rounded-2xl flex-1 sm:flex-none">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl text-amber-600 dark:text-amber-500">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">
                    {profile.rankings?.[0]?.wins || 0}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Torneios Ganhos</div>
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}

