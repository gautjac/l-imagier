import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8"; // depth + vision

export type Lang = "fr" | "en";

function client(): Anthropic {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("Server missing CLAUDE_API_KEY");
  return new Anthropic({ apiKey, baseURL: "https://api.anthropic.com" });
}

const VOICE_FR = `Tu es « l'Imagier » — l'œil aiguisé d'un directeur photo et d'un monteur, au service d'un cinéaste-poète québécois. Tu lis une image comme une planche de tournage : cadre, lumière, matière, ce qui accroche le regard. Tu écris en français québécois soigné, concret, sensoriel, jamais pompeux. Tu nommes ce que tu vois sans jargon creux. Tu ne flattes pas : tu décris juste.`;

const VOICE_EN = `You are "l'Imagier" — the sharp eye of a cinematographer and an editor, in service of a Québécois filmmaker-poet. You read an image like a shot card: frame, light, material, what catches the eye. You write in concrete, sensory, unpretentious English. You name what you see without hollow jargon. You don't flatter; you describe truly.`;

function voice(lang: Lang): string {
  return lang === "en" ? VOICE_EN : VOICE_FR;
}

type SafeMedia = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
function safeMediaType(m?: string): SafeMedia {
  if (m === "image/png" || m === "image/webp" || m === "image/gif") return m;
  return "image/jpeg";
}

// ── /api/tag — vision auto-tag a single image (opus, structured) ────────────

export interface TagResult {
  composition: string[];
  mood: string[];
  subject: string[];
  lighting: string[];
  accroche: string;
}

const TAG_TOOL: Anthropic.Tool = {
  name: "tag_image",
  description: "Return structured visual tags for the image, for a film mood-board library.",
  input_schema: {
    type: "object",
    required: ["composition", "mood", "subject", "lighting", "accroche"],
    properties: {
      composition: {
        type: "array",
        items: { type: "string" },
        description:
          "3–6 short composition tags in the requested language: shot size (gros plan / wide shot…), leading lines, balance, symmetry/asymmetry, framing, depth, negative space, angle. Lowercase short phrases, no sentences.",
      },
      mood: {
        type: "array",
        items: { type: "string" },
        description:
          "3–6 mood / atmosphere words in the requested language (e.g. mélancolique, tendu, onirique / nostalgic, foreboding, serene). Single evocative words or two-word phrases.",
      },
      subject: {
        type: "array",
        items: { type: "string" },
        description:
          "3–6 concrete subject / content tags in the requested language (what is literally in the frame: visage, fenêtre, route, forêt… / face, window, road, forest…).",
      },
      lighting: {
        type: "array",
        items: { type: "string" },
        description:
          "2–5 lighting tags in the requested language: quality (douce/dure), direction (contre-jour, latérale), key/fill, contrast, time of day, source (néon, lumière naturelle). Short phrases.",
      },
      accroche: {
        type: "string",
        description:
          "ONE evocative sentence in the requested language naming what catches the eye in this image — the single thing a filmmaker would steal. « Pourquoi ça accroche » / why it catches the eye. No preamble.",
      },
    },
  },
};

export async function tagImage(
  base64: string,
  mediaType: string,
  lang: Lang,
): Promise<TagResult> {
  const instruction =
    lang === "en"
      ? "Read this image as a cinematographer building a reference library. Tag its composition, mood, subject, and lighting, and name in one sentence what catches the eye. Be specific and concrete. Answer only by calling tag_image."
      : "Lis cette image comme un directeur photo qui se bâtit une banque de références. Tague sa composition, son ambiance, son sujet et sa lumière, et nomme en une phrase ce qui accroche le regard. Sois précis et concret. Réponds uniquement en appelant tag_image.";

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 900,
    system: voice(lang),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: safeMediaType(mediaType), data: base64 },
          },
          { type: "text", text: instruction },
        ],
      },
    ],
    tools: [TAG_TOOL],
    tool_choice: { type: "tool", name: "tag_image" },
  });

  const tool = res.content.find((b) => b.type === "tool_use");
  if (!tool || tool.type !== "tool_use") {
    throw new Error(lang === "en" ? "No tags returned." : "Aucun tag renvoyé.");
  }
  const input = tool.input as Partial<TagResult>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
  return {
    composition: arr(input.composition),
    mood: arr(input.mood),
    subject: arr(input.subject),
    lighting: arr(input.lighting),
    accroche: String(input.accroche ?? "").trim(),
  };
}

// ── /api/throughline — name the visual DNA of a board (opus, structured) ────

export interface BoardImageDigest {
  composition: string[];
  mood: string[];
  subject: string[];
  lighting: string[];
  accroche?: string;
  palette: string[]; // real hexes
}

export interface ThroughlineResult {
  nom: string;
  traitement: string;
  principes: string[];
  paletteDominante: string[];
  recurrences: string[];
}

const THROUGHLINE_TOOL: Anthropic.Tool = {
  name: "name_throughline",
  description: "Name the recurring visual DNA of a moodboard and write a short treatment.",
  input_schema: {
    type: "object",
    required: ["nom", "traitement", "principes", "paletteDominante", "recurrences"],
    properties: {
      nom: {
        type: "string",
        description:
          "A short, vivid NAME for the board's visual DNA in the requested language (2–5 words). Evocative, like a look's codename.",
      },
      traitement: {
        type: "string",
        description:
          "A treatment paragraph (4–7 sentences) in the requested language describing the LOOK this board points to: palette, light, texture, framing, the feeling it conjures. Written for a director's treatment — concrete and cinematic, flowing prose, no lists.",
      },
      principes: {
        type: "array",
        items: { type: "string" },
        description:
          "3–5 bullet 'visual principles' the board embodies, in the requested language. Each is one imperative or declarative line a DP could shoot to (e.g. « Toujours une source de lumière dans le cadre » / 'Keep a practical light in frame').",
      },
      paletteDominante: {
        type: "array",
        items: { type: "string" },
        description:
          "4–6 hex colours that dominate the board, CHOSEN ONLY from the provided per-image palettes. Do NOT invent new colours — pick the recurring real hexes. Return them as #RRGGBB strings.",
      },
      recurrences: {
        type: "array",
        items: { type: "string" },
        description:
          "3–6 short tags naming the recurring moods, subjects, and compositional habits across the board, in the requested language.",
      },
    },
  },
};

export async function throughline(
  brief: string,
  digests: BoardImageDigest[],
  lang: Lang,
): Promise<ThroughlineResult> {
  const allHexes = Array.from(new Set(digests.flatMap((d) => d.palette))).slice(0, 60);

  const lines = digests
    .map((d, i) => {
      const parts = [
        `composition: ${d.composition.join(", ")}`,
        `mood: ${d.mood.join(", ")}`,
        `subject: ${d.subject.join(", ")}`,
        `lighting: ${d.lighting.join(", ")}`,
        d.accroche ? `accroche: ${d.accroche}` : "",
        `palette: ${d.palette.join(" ")}`,
      ].filter(Boolean);
      return `[${i + 1}] ${parts.join(" | ")}`;
    })
    .join("\n");

  const briefBlock = brief
    ? lang === "en"
      ? `\n\nThe board's stated intent / brief:\n"${brief.slice(0, 600)}"\n`
      : `\n\nL'intention / le brief de la planche :\n« ${brief.slice(0, 600)} »\n`
    : "";

  const instruction =
    lang === "en"
      ? `Here are the tags and real palettes of ${digests.length} images on one moodboard.${briefBlock}\nDigests:\n${lines}\n\nThe only colours that exist on this board are these real hexes:\n${allHexes.join(" ")}\n\nName the recurring visual DNA: the dominant palette (chosen ONLY from the real hexes above), the compositional habits, the recurring moods and subjects. Write a short director's treatment of the look, and list 3–5 visual principles the board embodies. Answer only by calling name_throughline.`
      : `Voici les tags et les palettes réelles de ${digests.length} images d'une même planche d'ambiance.${briefBlock}\nFiches :\n${lines}\n\nLes seules couleurs qui existent sur cette planche sont ces vrais codes hexadécimaux :\n${allHexes.join(" ")}\n\nNomme la ligne directrice visuelle : la palette dominante (choisie UNIQUEMENT parmi les vrais hex ci-dessus), les habitudes de cadre, les ambiances et sujets récurrents. Rédige un court traitement du « look » pour un dossier de réalisation, et liste 3 à 5 principes visuels que la planche incarne. Réponds uniquement en appelant name_throughline.`;

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: voice(lang),
    messages: [{ role: "user", content: instruction }],
    tools: [THROUGHLINE_TOOL],
    tool_choice: { type: "tool", name: "name_throughline" },
  });

  const tool = res.content.find((b) => b.type === "tool_use");
  if (!tool || tool.type !== "tool_use") {
    throw new Error(lang === "en" ? "No throughline returned." : "Aucune ligne directrice renvoyée.");
  }
  const input = tool.input as Partial<ThroughlineResult>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];

  // Re-pin the palette to colours that actually exist on the board.
  const realSet = new Set(allHexes.map((h) => h.toUpperCase()));
  const proposed = arr(input.paletteDominante).map((h) => h.toUpperCase());
  let paletteDominante = proposed.filter((h) => realSet.has(h));
  if (paletteDominante.length < 4) {
    // Fallback: take the most common real hexes from the digests.
    const freq = new Map<string, number>();
    for (const d of digests) for (const h of d.palette) {
      const k = h.toUpperCase();
      freq.set(k, (freq.get(k) ?? 0) + 1);
    }
    const ranked = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([h]) => h);
    for (const h of ranked) {
      if (paletteDominante.length >= 5) break;
      if (!paletteDominante.includes(h)) paletteDominante.push(h);
    }
  }

  return {
    nom: String(input.nom ?? "").trim() || (lang === "en" ? "Untitled look" : "Look sans titre"),
    traitement: String(input.traitement ?? "").trim(),
    principes: arr(input.principes),
    paletteDominante: paletteDominante.slice(0, 6),
    recurrences: arr(input.recurrences),
  };
}
