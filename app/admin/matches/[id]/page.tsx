import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getMatchDetail } from "@/app/admin/matches/_data";
import { MatchDetailEditor } from "@/components/admin/match-detail-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminMatchDetailPage({ params }: Props) {
  const { id } = await params;
  const { detail, history } = await getMatchDetail(id);

  return (
    <section className="space-y-4">
      <Link href="/admin/matches" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        Voltar para partidas
      </Link>

      <MatchDetailEditor detail={detail} history={history} />
    </section>
  );
}
