"use server";

import { createEvent, updateEvent, type EventMutationInput, type ActionResult } from "@/app/admin/event-actions";

export type TournamentMutationInput = EventMutationInput;

export async function createTournament(payload: TournamentMutationInput): Promise<ActionResult<{ id: string }>> {
  return createEvent(payload);
}

export async function updateTournament(eventId: string, payload: TournamentMutationInput): Promise<ActionResult> {
  return updateEvent(eventId, payload);
}
