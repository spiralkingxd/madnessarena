import { FileText } from "lucide-react";

import { LogsAdminPanel } from "@/components/admin/logs-admin-panel";
import { createClient } from "@/lib/supabase/server";

type LogRow = {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;
  created_at: string;
  actor_name: string;
};

export default async function AdminLogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("admin_action_logs")
    .select("id, action, target_type, target_id, details, created_at, admin_user_id")
    .order("created_at", { ascending: false })
    .limit(300);

  const actorIds = Array.from(new Set((logs ?? []).map((row) => String(row.admin_user_id)).filter(Boolean)));
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, display_name, username").in("id", actorIds)
    : { data: [] as Array<{ id: string; display_name: string | null; username: string | null }> };

  const actorMap = new Map<string, string>();
  for (const profile of profiles ?? []) {
    actorMap.set(String(profile.id), String(profile.display_name ?? profile.username ?? "Admin"));
  }

  const rows: LogRow[] = (logs ?? []).map((row) => ({
    id: String(row.id),
    action: String(row.action),
    resource_type: row.target_type ? String(row.target_type) : null,
    resource_id: row.target_id ? String(row.target_id) : null,
    details: row.details ? JSON.stringify(row.details) : null,
    created_at: String(row.created_at),
    actor_name: actorMap.get(String(row.admin_user_id)) ?? "Admin",
  }));

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Admin</p>
        <div className="mt-2 flex items-center gap-3">
          <FileText className="h-6 w-6 text-indigo-300" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Logs e Auditoria</h1>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Monitore ações administrativas, filtre por operação e exporte evidências para análise externa.
        </p>
      </header>

      <LogsAdminPanel rows={rows} />
    </section>
  );
}
