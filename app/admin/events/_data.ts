import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AdminEventListRow = {
  id: string;
  title: string;
  status: "draft" | "published" | "active" | "paused" | "finished";
  event_kind: "event" | "tournament";
  start_date: string;
  end_date: string | null;
  team_size: number;
  prize_description: string | null;
  created_at: string;
  tournament_format: string | null;
  approved_registrations: number;
  pending_registrations: number;
};

export type EventFormRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  registration_deadline: string | null;
  event_kind: "event" | "tournament";
  team_size: number;
  prize_description: string | null;
  rules: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: "draft" | "published" | "active" | "paused" | "finished";
  scoring_win: number;
  scoring_loss: number;
  scoring_draw: number;
  tournament_format: "single_elimination" | "double_elimination" | "round_robin" | null;
  rounds_count: number | null;
  seeding_method: "random" | "manual" | "ranking" | null;
  max_teams: number | null;
};

export type RegistrationRow = {
  team_id: string;
  team_name: string;
  captain_name: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  source: "self_service" | "wildcard";
  created_at: string;
  rejection_reason: string | null;
};

export type AvailableTeamRow = {
  id: string;
  name: string;
  captain_name: string;
};

export async function getAdminEvents(scope: "event" | "tournament") {
  const supabase = await createClient();
  const [{ data: eventsRaw }, { data: registrationsRaw }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, status, event_kind, start_date, end_date, team_size, prize_description, created_at, tournament_format")
      .eq("event_kind", scope)
      .order("start_date", { ascending: false }),
    supabase.from("registrations").select("event_id, status"),
  ]);

  const countByEvent = new Map<string, { approved: number; pending: number }>();
  for (const row of registrationsRaw ?? []) {
    const eventId = String(row.event_id);
    const current = countByEvent.get(eventId) ?? { approved: 0, pending: 0 };
    if (row.status === "approved") current.approved += 1;
    if (row.status === "pending") current.pending += 1;
    countByEvent.set(eventId, current);
  }

  return ((eventsRaw ?? []) as Omit<AdminEventListRow, "approved_registrations" | "pending_registrations">[]).map((row) => {
    const counters = countByEvent.get(row.id) ?? { approved: 0, pending: 0 };
    return {
      ...row,
      approved_registrations: counters.approved,
      pending_registrations: counters.pending,
    };
  });
}

export async function getEventForForm(eventId: string, expectedKind?: "event" | "tournament") {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle<EventFormRow>();
  if (!data) notFound();
  if (expectedKind && data.event_kind !== expectedKind) notFound();
  return data;
}

export async function getEventRegistrations(eventId: string) {
  const supabase = await createClient();
  const [{ data: event }, { data: registrationsRaw }, { data: teamsRaw }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, status, event_kind, start_date, registration_deadline, max_teams")
      .eq("id", eventId)
      .maybeSingle<{
        id: string;
        title: string;
        status: string;
        event_kind: string;
        start_date: string;
        registration_deadline: string | null;
        max_teams: number | null;
      }>(),
    supabase
      .from("registrations")
      .select("team_id, status, source, created_at, rejection_reason")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
    supabase.from("teams").select("id, name, captain_id"),
  ]);

  if (!event) notFound();

  const captainIds = (teamsRaw ?? []).map((row) => String(row.captain_id));
  const uniqueCaptainIds = [...new Set(captainIds)];
  const { data: profilesRaw } = uniqueCaptainIds.length > 0
    ? await supabase.from("profiles").select("id, display_name, username").in("id", uniqueCaptainIds)
    : { data: [] };

  const captainNameById = new Map<string, string>();
  for (const profile of profilesRaw ?? []) {
    captainNameById.set(String(profile.id), String(profile.display_name ?? profile.username ?? "Usuário"));
  }

  const teamById = new Map<string, { name: string; captain_id: string }>();
  for (const team of teamsRaw ?? []) {
    teamById.set(String(team.id), { name: String(team.name), captain_id: String(team.captain_id) });
  }

  const registrations: RegistrationRow[] = (registrationsRaw ?? []).map((row) => {
    const team = teamById.get(String(row.team_id));
    return {
      team_id: String(row.team_id),
      team_name: team?.name ?? "Equipe removida",
      captain_name: captainNameById.get(team?.captain_id ?? "") ?? "Capitão indisponível",
      status: row.status as RegistrationRow["status"],
      source: row.source as RegistrationRow["source"],
      created_at: String(row.created_at),
      rejection_reason: (row.rejection_reason as string | null) ?? null,
    };
  });

  const registeredTeamIds = new Set(registrations.map((row) => row.team_id));
  const availableTeams: AvailableTeamRow[] = (teamsRaw ?? [])
    .filter((team) => !registeredTeamIds.has(String(team.id)))
    .map((team) => ({
      id: String(team.id),
      name: String(team.name),
      captain_name: captainNameById.get(String(team.captain_id)) ?? "Capitão indisponível",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return {
    event,
    registrations,
    availableTeams,
  };
}
