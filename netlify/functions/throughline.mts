import type { Config, Context } from "@netlify/functions";
import { throughline, type BoardImageDigest, type Lang } from "./lib/imagier.ts";

interface Body {
  brief?: string;
  digests?: BoardImageDigest[];
  lang?: Lang;
}

// POST /api/throughline — Claude names the visual DNA of a board. Opus call
// behind an NDJSON keepalive stream.
export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lang: Lang = body.lang === "en" ? "en" : "fr";
  const en = lang === "en";

  const digests = Array.isArray(body.digests) ? body.digests : [];
  if (digests.length < 2) {
    return Response.json(
      { error: en ? "Add at least 2 images to read a throughline." : "Ajoute au moins 2 images pour lire une ligne directrice." },
      { status: 400 },
    );
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let done = false;
      const beat = setInterval(() => {
        if (!done) {
          try {
            controller.enqueue(enc.encode("\n"));
          } catch {
            /* closed */
          }
        }
      }, 3000);

      try {
        const result = await throughline((body.brief ?? "").trim(), digests, lang);
        done = true;
        clearInterval(beat);
        controller.enqueue(enc.encode(JSON.stringify({ result }) + "\n"));
      } catch (err) {
        done = true;
        clearInterval(beat);
        const message =
          err instanceof Error ? err.message : en ? "Unknown error" : "Erreur inconnue";
        controller.enqueue(enc.encode(JSON.stringify({ error: message }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
};

export const config: Config = { path: "/api/throughline" };
