import { Book } from "lucide-react";
import { getDictionary } from "@/lib/i18n";

export const metadata = {
  title: "Regras",
  description: "Conheça as regras dos campeonatos da Madness Arena",
};

export default async function RegrasPage() {
  const dict = await getDictionary();
  return (
    <main className="page-shell px-6 py-10 lg:px-10">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">{dict.rules.badge}</p>
          <h1 className="mt-1 text-3xl font-bold text-white flex items-center gap-2">
            <Book className="h-8 w-8 text-amber-500" />
            {dict.rules.title}
          </h1>
          <p className="mt-2 text-sm text-slate-400">{dict.rules.desc}</p>
        </div>

        <section className="glass-card soft-ring overflow-hidden rounded-2xl p-6 lg:p-10 prose prose-invert max-w-none">
          <h2>1. Conduta e Fair Play</h2>
          <p>
            Todos os participantes devem manter o respeito. Comportamento tóxico, racismo ou qualquer tipo de discriminação resultará em banimento imediato e permanente.
          </p>

          <h2>2. Inscrições e Equipes</h2>
          <p>
            Capitães são responsáveis por inscrever sua equipe nos eventos. Verifique o tamanho exigido da equipe para cada campeonato (Sloop, Brigantine ou Galleon).
          </p>

          <h2>3. Horários</h2>
          <p>
            Tolerncia máxima de 10 minutos de atraso para check-in. Caso a equipe não esteja pronta, perderá a partida por W.O.
          </p>

          <h2>4. Gravação e Provas</h2>
          <p>
            É obrigatório que pelo menos um jogador de cada tripulação grave a partida, ou transmita na Twitch, para validação de resultados em caso de disputa.
          </p>
          
          <hr className="border-white/10 my-8" />
          <p className="text-sm text-slate-500">
            Estas regras estão sujeitas a atualizações antes do início de cada temporada. Mantenha-se informado através do nosso Discord.
          </p>
        </section>
      </div>
    </main>
  );
}
