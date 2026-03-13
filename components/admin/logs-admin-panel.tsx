"use client";

import { useMemo, useState, useTransition } from "react";
import { Download } from "lucide-react";

import { exportLogs } from "@/app/admin/final-actions";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminTable } from "@/components/admin/admin-table";
import { useAdminToast } from "@/components/admin/admin-toast";

type LogRow = {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;
  created_at: string;
  actor_name: string;
};

type Props = {
  rows: LogRow[];
};

export function LogsAdminPanel({ rows }: Props) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useAdminToast();

  const actions = useMemo(() => {
    return ["all", ...Array.from(new Set(rows.map((row) => row.action))).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (action !== "all" && row.action !== action) return false;
      if (!term) return true;
      return (
        row.actor_name.toLowerCase().includes(term) ||
        row.action.toLowerCase().includes(term) ||
        (row.resource_type ?? "").toLowerCase().includes(term) ||
        (row.details ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, action, query]);

  function onExport() {
    startTransition(async () => {
      const res = await exportLogs({ action: action === "all" ? undefined : action, search: query.trim() || undefined });
      if (res.error) {
        pushToast("error", res.error);
        return;
      }

      const blob = new Blob([res.data?.csv ?? ""], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admin-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      pushToast("success", "Logs exportados com sucesso.");
    });
  }

  return (
    <>
      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-52 space-y-1 text-xs uppercase tracking-[0.16em] text-slate-400">
            <span>Ação</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
            >
              {actions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry === "all" ? "Todas" : entry}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-72 flex-1 space-y-1 text-xs uppercase tracking-[0.16em] text-slate-400">
            <span>Buscar</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ator, recurso, detalhes..."
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
            />
          </label>
          <AdminButton disabled={isPending} onClick={onExport}>
            <Download className="h-4 w-4" />
            {isPending ? "Exportando..." : "Exportar CSV"}
          </AdminButton>
        </div>

        <AdminTable
          data={filtered}
          columns={[
            {
              key: "created_at",
              header: "Data",
              render: (row) => new Date(row.created_at).toLocaleString("pt-BR"),
            },
            {
              key: "actor",
              header: "Admin",
              render: (row) => row.actor_name,
            },
            {
              key: "action",
              header: "Ação",
              render: (row) => <AdminBadge tone="info">{row.action}</AdminBadge>,
            },
            {
              key: "resource",
              header: "Recurso",
              render: (row) => (row.resource_type ? `${row.resource_type}${row.resource_id ? ` #${row.resource_id.slice(0, 8)}` : ""}` : "-"),
            },
            {
              key: "details",
              header: "Detalhes",
              render: (row) => row.details ?? "-",
            },
          ]}
          emptyText="Nenhum log encontrado para os filtros selecionados."
          pageSize={12}
        />
      </section>
    </>
  );
}
