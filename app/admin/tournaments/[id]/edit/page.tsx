import { EventForm } from "@/components/admin/event-form";
import { getEventForForm } from "@/app/admin/tournaments/_data";

export const metadata = {
  title: "Editar Torneio | Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditTournamentPage({ params }: Props) {
  const { id } = await params;
  const event = await getEventForForm(id, "tournament");

  const initialValues = {
    ...event,
    description: event.description ?? "",
    prize: event.prize ?? "",
    registration_deadline: event.registration_deadline ?? "",
    end_date: event.end_date ?? "",
    prize_description: event.prize_description ?? "",
    rules: event.rules ?? "",
    logo_url: event.logo_url ?? "",
    banner_url: event.banner_url ?? "",
  };

  return <EventForm mode="edit" eventId={id} initialValues={initialValues} fixedKind="tournament" />;
}
