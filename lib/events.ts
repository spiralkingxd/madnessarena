export const EVENT_STATUS_VALUES = ["draft", "published", "active", "paused", "finished"] as const;
export const EVENT_KIND_VALUES = ["event", "tournament"] as const;
export const TOURNAMENT_FORMAT_VALUES = ["single_elimination", "double_elimination", "round_robin"] as const;
export const SEEDING_METHOD_VALUES = ["random", "manual", "ranking"] as const;
export const TEAM_SIZE_VALUES = [1, 2, 3, 4, 5, 6, 8, 10] as const;

export type EventStatus = (typeof EVENT_STATUS_VALUES)[number];
export type EventKind = (typeof EVENT_KIND_VALUES)[number];
export type TournamentFormat = (typeof TOURNAMENT_FORMAT_VALUES)[number];
export type SeedingMethod = (typeof SEEDING_METHOD_VALUES)[number];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  active: "Ativo",
  paused: "Pausado",
  finished: "Finalizado",
};

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  event: "Evento",
  tournament: "Torneio",
};

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
};

export const SEEDING_METHOD_LABELS: Record<SeedingMethod, string> = {
  random: "Aleatório",
  manual: "Manual",
  ranking: "Ranking",
};

export const REGISTRATION_STATUS_LABELS: Record<"pending" | "approved" | "rejected" | "cancelled", string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
};

export function formatEventStatus(status: string) {
  return EVENT_STATUS_LABELS[status as EventStatus] ?? status;
}

export function formatEventKind(kind: string) {
  return EVENT_KIND_LABELS[kind as EventKind] ?? kind;
}

export function formatTournamentFormat(format: string | null) {
  if (!format) return "-";
  return TOURNAMENT_FORMAT_LABELS[format as TournamentFormat] ?? format;
}

export function formatSeedingMethod(method: string | null) {
  if (!method) return "-";
  return SEEDING_METHOD_LABELS[method as SeedingMethod] ?? method;
}

export function formatTeamSize(size: number | null | undefined) {
  if (!size || size < 1) return "-";
  return `${size}v${size}`;
}

export function isEventVisible(status: string) {
  return status === "published" || status === "active" || status === "finished";
}

export function isEventRegistrable(status: string) {
  return status === "published" || status === "active";
}

export function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}
