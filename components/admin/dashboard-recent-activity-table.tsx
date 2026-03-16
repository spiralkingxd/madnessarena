"use client";

import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminTable, type AdminTableColumn } from "@/components/admin/admin-table";

type ActivityRow = {
  type: "user" | "team" | "event";
  title: string;
  created_at: string;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

const columns: AdminTableColumn<ActivityRow>[] = [
  {
    key: "type",
    header: "Tipo",
    sortable: true,
    accessor: (row) => row.type,
    render: (row) => {
      if (row.type === "event") return <AdminBadge tone="active">Evento</AdminBadge>;
      if (row.type === "team") return <AdminBadge tone="pending">Equipe</AdminBadge>;
      return <AdminBadge tone="info">Usuário</AdminBadge>;
    },
  },
  {
    key: "title",
    header: "Descrição",
    sortable: true,
    accessor: (row) => row.title,
    render: (row) => <span>{row.title}</span>,
  },
  {
    key: "created_at",
    header: "Data",
    sortable: true,
    accessor: (row) => row.created_at,
    render: (row) => <span className="text-slate-300">{dateFmt.format(new Date(row.created_at))}</span>,
  },
];

export function DashboardRecentActivityTable({ data }: { data: ActivityRow[] }) {
  return <AdminTable data={data} columns={columns} pageSize={6} emptyText="Sem atividades recentes." />;
}
