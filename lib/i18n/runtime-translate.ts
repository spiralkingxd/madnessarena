type GoogleTranslateResponse = Array<Array<[string, string, unknown, unknown]>>;

const GOOGLE_TRANSLATE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const MAX_CHUNK_SIZE = 900;

function splitLargeText(input: string): string[] {
  const text = input.trim();
  if (!text) return [""];

  const chunks: string[] = [];
  const paragraphs = text.split(/(\n\n+)/);

  for (const paragraph of paragraphs) {
    if (!paragraph) continue;

    if (paragraph.length <= MAX_CHUNK_SIZE) {
      chunks.push(paragraph);
      continue;
    }

    const words = paragraph.split(" ");
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= MAX_CHUNK_SIZE) {
        current = next;
      } else {
        if (current) chunks.push(current);
        current = word;
      }
    }

    if (current) chunks.push(current);
  }

  return chunks.length > 0 ? chunks : [text];
}

async function translateChunkToEnglish(chunk: string): Promise<string> {
  if (!chunk.trim()) return chunk;

  const params = new URLSearchParams({
    client: "gtx",
    sl: "pt",
    tl: "en",
    dt: "t",
    q: chunk,
  });

  const response = await fetch(`${GOOGLE_TRANSLATE_ENDPOINT}?${params.toString()}`, {
    method: "GET",
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(7000),
  });

  if (!response.ok) {
    throw new Error("Failed to translate chunk");
  }

  const data = (await response.json()) as GoogleTranslateResponse;
  const translated = data?.[0]?.map((part) => part?.[0] ?? "").join("") ?? "";
  return translated || chunk;
}

export async function translatePtToEnOnTheFly(text: string): Promise<string> {
  if (!text.trim()) return text;

  const chunks = splitLargeText(text);
  const translatedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        return await translateChunkToEnglish(chunk);
      } catch {
        return chunk;
      }
    }),
  );

  return translatedChunks.join("");
}
