import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getTournamentBracketData } from "@/app/admin/matches/_data";
import { TournamentBracketBoard } from "@/components/admin/tournament-bracket-board";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminTournamentBracketPage({ params }: Props) {
  const { id } = await params;
  const { event, matches } = await getTournamentBracketData(id);

  return (
    <section className="space-y-4">
      <Link href="/admin/tournaments" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        Voltar para torneios
      </Link>

      <TournamentBracketBoard eventId={event.id} eventTitle={event.title} matches={matches} />
    </section>
  );
}
