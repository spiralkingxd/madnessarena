import { EventForm } from "@/components/admin/event-form";
import { getEventForForm } from "@/app/admin/events/_data";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditEventPage({ params }: Props) {
  const { id } = await params;
  const event = await getEventForForm(id, "event");

  return <EventForm mode="edit" eventId={id} initialValues={event} fixedKind="event" />;
}
