import type { Lang } from "./i18n";
import type { ImageTags, Throughline } from "./db";

export interface BoardImageDigest {
  composition: string[];
  mood: string[];
  subject: string[];
  lighting: string[];
  accroche?: string;
  palette: string[];
}

type Streamed<T> = { result?: T; error?: string };

/** Parse the last non-empty line of an NDJSON keepalive stream. */
function parseLast<T>(raw: string): Streamed<T> | null {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const last = lines[lines.length - 1] ?? "";
  if (!last) return null;
  try {
    return JSON.parse(last) as Streamed<T>;
  } catch {
    return null;
  }
}

async function ndjson<T>(path: string, body: unknown, lang: Lang): Promise<T> {
  const en = lang === "en";
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  const parsed = parseLast<T>(raw);
  const invalid = en ? "Invalid response from the server." : "Réponse invalide du serveur.";

  if (!res.ok) {
    const fallback = en ? `Error ${res.status}` : `Erreur ${res.status}`;
    const msg = parsed?.error ? parsed.error : fallback;
    throw new Error(msg);
  }
  if (!parsed) throw new Error(invalid);
  if (parsed.error) throw new Error(parsed.error);
  if (parsed.result !== undefined) return parsed.result;
  throw new Error(invalid);
}

/** /api/tag — vision auto-tag a single image. */
export async function tagImage(args: {
  base64: string;
  mediaType: string;
  lang: Lang;
}): Promise<ImageTags> {
  const r = await ndjson<{
    composition: string[];
    mood: string[];
    subject: string[];
    lighting: string[];
    accroche: string;
  }>("/api/tag", { base64: args.base64, mediaType: args.mediaType, lang: args.lang }, args.lang);
  return {
    composition: r.composition ?? [],
    mood: r.mood ?? [],
    subject: r.subject ?? [],
    lighting: r.lighting ?? [],
    accroche: r.accroche ?? "",
  };
}

/** /api/throughline — name the visual DNA of a board. */
export async function readThroughline(args: {
  brief?: string;
  digests: BoardImageDigest[];
  lang: Lang;
}): Promise<Throughline> {
  const r = await ndjson<{
    nom: string;
    traitement: string;
    principes: string[];
    paletteDominante: string[];
    recurrences: string[];
  }>(
    "/api/throughline",
    { brief: args.brief, digests: args.digests, lang: args.lang },
    args.lang,
  );
  return {
    nom: r.nom ?? "",
    traitement: r.traitement ?? "",
    principes: r.principes ?? [],
    paletteDominante: r.paletteDominante ?? [],
    recurrences: r.recurrences ?? [],
    generatedAt: Date.now(),
  };
}
