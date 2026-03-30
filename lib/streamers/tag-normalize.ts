export function normalizeForCompare(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

export function normalizeTagList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
}

export function hasMadnessArenaTag(tags: string[]) {
  const target = normalizeForCompare("madnessarena");
  return tags.some((tag) => normalizeForCompare(tag) === target);
}
