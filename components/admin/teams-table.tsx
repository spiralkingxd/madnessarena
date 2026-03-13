"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, ShieldAlert, Users } from "lucide-react";

import { dissolveTeam, editTeam } from "@/app/admin/team-actions";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminTable, type AdminTableColumn } from "@/components/admin/admin-table";
import { useAdminToast } from "@/components/admin/admin-toast";

type TeamRow = {
  id: string;
  name: string;
  logo_url: string | null;
  captain_name: string;
  captain_id: string;
  member_count: number;
  max_members: number;
  created_at: string;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function TeamsTable({ rows }: { rows: TeamRow[] }) {
  const router = useRouter();
  const { pushToast } = useAdminToast();
  const [search, setSearch] = useState("");
  const [sizeFilter, setSizeFilter] = useState<"all" | "full" | "available">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7" | "30">("all");
  const [pageSize, setPageSize] = useState(25);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (sizeFilter === "full" && row.member_count < row.max_members) return false;
      if (sizeFilter === "available" && row.member_count >= row.max_members) return false;
      if (dateFilter !== "all") {
        const days = Number(dateFilter);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        if (new Date(row.created_at) < cutoff) return false;
      }
      if (!query) return true;
      return row.name.toLowerCase().includes(query) || row.captain_name.toLowerCase().includes(query);
    });
  }, [rows, search, sizeFilter, dateFilter]);

  const columns: AdminTableColumn<TeamRow>[] = [
    {
      key: "logo",
      header: "Logo",
      render: (row) => (
        row.logo_url ? (
          <img src={row.logo_url} alt={row.name} className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] font-semibold text-slate-300">
            {row.name.slice(0, 1).toUpperCase()}
          </span>
        )
      ),
    },
    {
      key: "name",
      header: "Equipe",
      sortable: true,
      accessor: (row) => row.name,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-100">{row.name}</p>
          <p className="text-xs text-slate-400">Capitão: {row.captain_name}</p>
        </div>
      ),
    },
    {
      key: "members",
      header: "Membros",
      sortable: true,
      accessor: (row) => row.member_count,
      render: (row) => (
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {row.member_count}/{row.max_members}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (row) => (row.member_count >= row.max_members ? "full" : "open"),
      render: (row) =>
        row.member_count >= row.max_members ? (
          <AdminBadge tone="danger">Lotada</AdminBadge>
        ) : (
          <AdminBadge tone="active">Ativa</AdminBadge>
        ),
    },
    {
      key: "created",
      header: "Criação",
      sortable: true,
      accessor: (row) => row.created_at,
      render: (row) => <span className="text-xs">{dateFmt.format(new Date(row.created_at))}</span>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <Link href={`/admin/teams/${row.id}`} className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs hover:bg-white/10">
            Ver
          </Link>
          <button
            type="button"
            className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-300/20"
            onClick={() => {
              const name = window.prompt("Novo nome da equipe:", row.name)?.trim();
              if (!name) return;
              startTransition(async () => {
                const result = await editTeam(row.id, { name, logo_url: row.logo_url });
                pushToast(result.error ? "error" : "success", result.error ?? result.success ?? "Ação concluída.");
                router.refresh();
              });
            }}
          >
            <Edit3 className="mr-1 inline h-3 w-3" />
            Editar
          </button>
          <button
            type="button"
            className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-2 py-1 text-xs text-rose-100 hover:bg-rose-300/20"
            onClick={() => {
              const ok = window.confirm(`Dissolver equipe ${row.name}? Esta ação é irreversível.`);
              if (!ok) return;
              startTransition(async () => {
                const result = await dissolveTeam(row.id);
                pushToast(result.error ? "error" : "success", result.error ?? result.success ?? "Ação concluída.");
                router.refresh();
              });
            }}
            disabled={isPending}
          >
            <ShieldAlert className="mr-1 inline h-3 w-3" />
            Dissolver
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs uppercase tracking-[0.12em] text-slate-400">
          Buscar
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome da equipe ou capitão"
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.12em] text-slate-400">
          Status
          <select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value as typeof sizeFilter)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100">
            <option value="all">Todos</option>
            <option value="full">Lotadas</option>
            <option value="available">Com vagas</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.12em] text-slate-400">
          Data
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100">
            <option value="all">Todas</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.12em] text-slate-400">
          Página
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100">
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>

      <AdminTable data={filtered} columns={columns} pageSize={pageSize} emptyText="Nenhuma equipe encontrada." />
    </section>
  );
}
