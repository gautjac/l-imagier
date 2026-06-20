import type { Config, Context } from "@netlify/functions";
import { tagImage, type Lang } from "./lib/imagier.ts";

interface Body {
  base64?: string;
  mediaType?: string;
  lang?: Lang;
}

// POST /api/tag — Claude vision auto-tags one uploaded image. Opus + vision can
// run 20–50s, so we stream NDJSON: heartbeats keep the connection alive, then a
// final { result } | { error } line carries the payload.
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

  if (!body.base64) {
    return Response.json(
      { error: en ? "Missing image." : "Image manquante." },
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
        const result = await tagImage(body.base64!, body.mediaType || "image/jpeg", lang);
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

export const config: Config = { path: "/api/tag" };
