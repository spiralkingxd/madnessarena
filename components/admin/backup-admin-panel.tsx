"use client";

import { useTransition } from "react";
import { DatabaseBackup, Download } from "lucide-react";

import { createBackup } from "@/app/admin/final-actions";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminButton } from "@/components/admin/admin-button";
import { useAdminToast } from "@/components/admin/admin-toast";

type BackupJob = {
  id: string;
  status: string;
  backup_type: string;
  file_name: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
  requested_by_name: string;
};

type Props = {
  jobs: BackupJob[];
};

function statusTone(status: string) {
  if (status === "completed") return "active" as const;
  if (status === "failed") return "danger" as const;
  if (status === "running") return "pending" as const;
  return "inactive" as const;
}

export function BackupAdminPanel({ jobs }: Props) {
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useAdminToast();

  const latest = jobs[0] ?? null;

  function onRequestBackup() {
    startTransition(async () => {
      const res = await createBackup();
      if (res.error) {
        pushToast("error", res.error);
        return;
      }

      pushToast("success", res.success ?? "Backup solicitado com sucesso.");
    });
  }

  function downloadPayload(job: BackupJob) {
    const content = JSON.stringify(job.payload ?? {}, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = job.file_name ?? `backup-${job.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="space-y-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Backups</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Gerenciamento de backup</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crie backups sob demanda e acompanhe o histórico de execução.</p>
          </div>
          <AdminButton disabled={isPending} onClick={onRequestBackup}>
            <DatabaseBackup className="h-4 w-4" />
            {isPending ? "Solicitando..." : "Criar backup manual"}
          </AdminButton>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Último backup</p>
          {latest ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
              <AdminBadge tone={statusTone(latest.status)}>{latest.status}</AdminBadge>
              <span>{new Date(latest.created_at).toLocaleString("pt-BR")}</span>
              <span className="text-slate-500 dark:text-slate-400">Solicitado por {latest.requested_by_name}</span>
              {latest.payload ? (
                <button
                  type="button"
                  onClick={() => downloadPayload(latest)}
                  className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Nenhum backup registrado ainda.</p>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-200 dark:bg-black/40 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Solicitado por</th>
                <th className="px-3 py-2 text-right">Arquivo</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                  <td className="px-3 py-2">{new Date(job.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2">
                    <AdminBadge tone={statusTone(job.status)}>{job.status}</AdminBadge>
                  </td>
                  <td className="px-3 py-2">{job.backup_type}</td>
                  <td className="px-3 py-2">{job.requested_by_name}</td>
                  <td className="px-3 py-2 text-right">
                    {job.payload ? (
                      <button type="button" onClick={() => downloadPayload(job)} className="text-sky-300 hover:text-sky-200">
                        Download
                      </button>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Nenhum job de backup encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
