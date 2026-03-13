import { ShieldCheck } from "lucide-react";

import { BackupAdminPanel } from "@/components/admin/backup-admin-panel";
import { createClient } from "@/lib/supabase/server";

type BackupRow = {
  id: string;
  status: string;
  backup_type: string;
  file_name: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
  requested_by_name: string;
};

export default async function AdminBackupPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("backup_jobs")
    .select("id, status, backup_type, file_name, payload, created_at, completed_at, requested_by")
    .order("created_at", { ascending: false })
    .limit(100);

  const requesterIds = Array.from(new Set((jobs ?? []).map((row) => String(row.requested_by)).filter(Boolean)));
  const { data: requesters } = requesterIds.length
    ? await supabase.from("profiles").select("id, display_name, username").in("id", requesterIds)
    : { data: [] as Array<{ id: string; display_name: string | null; username: string | null }> };

  const requesterMap = new Map<string, string>();
  for (const row of requesters ?? []) {
    requesterMap.set(String(row.id), String(row.display_name ?? row.username ?? "Admin"));
  }

  const rows: BackupRow[] = (jobs ?? []).map((row) => ({
    id: String(row.id),
    status: String(row.status),
    backup_type: String(row.backup_type),
    file_name: row.file_name ? String(row.file_name) : null,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    created_at: String(row.created_at),
    completed_at: row.completed_at ? String(row.completed_at) : null,
    requested_by_name: requesterMap.get(String(row.requested_by)) ?? "Admin",
  }));

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Admin</p>
        <div className="mt-2 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-300" />
          <h1 className="text-2xl font-bold text-white">Backups e Continuidade</h1>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Faça backups manuais e acompanhe histórico de execução para garantir recuperação operacional.
        </p>
      </header>

      <BackupAdminPanel jobs={rows} />
    </section>
  );
}
