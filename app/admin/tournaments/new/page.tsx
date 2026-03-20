import { EventForm } from "@/components/admin/event-form";

export const metadata = {
  title: "Novo Torneio | Admin",
};

export default function AdminNewTournamentPage() {
  return <EventForm mode="create" fixedKind="tournament" />;
}
