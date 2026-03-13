import { CalendarDays } from "lucide-react";

import { EventsTable } from "@/components/admin/events-table";
import { getAdminEvents } from "@/app/admin/events/_data";

export default async function AdminEventsPage() {
  const rows = await getAdminEvents("event");

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Admin</p>
        <div className="mt-2 flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-cyan-300" />
          <h1 className="text-2xl font-bold text-white">Gerenciamento de Eventos</h1>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Crie, publique, pause e acompanhe inscrições dos eventos da plataforma.
        </p>
      </header>

      <EventsTable rows={rows} scope="events" />
    </section>
  );
}
