import { addImage, emptyTags, uid, updateImage, type ImageRecord } from "../db";
import { blobToVisionBase64, prepareImage } from "./image";
import { tagImage } from "../api";
import type { Lang } from "../i18n";

/**
 * Capture one image blob into the library: prepare (palette + thumb + blob),
 * persist immediately (so it shows up at once), then auto-tag via vision in the
 * background, updating the record when tags arrive.
 */
export async function captureBlob(
  source: Blob,
  meta: { title?: string; source?: string },
  lang: Lang,
): Promise<string> {
  const prepared = await prepareImage(source);
  const id = uid("img");
  const rec: ImageRecord = {
    id,
    blob: prepared.blob,
    thumb: prepared.thumb,
    palette: prepared.palette,
    tags: emptyTags(),
    manualTags: [],
    aiStatus: "running",
    width: prepared.width,
    height: prepared.height,
    title: meta.title,
    source: meta.source,
    createdAt: Date.now(),
  };
  await addImage(rec);

  // Fire-and-forget vision tagging.
  void (async () => {
    try {
      const tags = await tagImage({
        base64: prepared.base64,
        mediaType: prepared.mediaType,
        lang,
      });
      await updateImage(id, { tags, aiStatus: "done", aiError: undefined });
    } catch (err) {
      await updateImage(id, {
        aiStatus: "error",
        aiError: err instanceof Error ? err.message : "tag failed",
      });
    }
  })();

  return id;
}

/** Re-run vision tagging on an existing stored image. */
export async function retag(rec: ImageRecord, lang: Lang): Promise<void> {
  await updateImage(rec.id, { aiStatus: "running", aiError: undefined });
  try {
    const { base64, mediaType } = await blobToVisionBase64(rec.blob);
    const tags = await tagImage({ base64, mediaType, lang });
    await updateImage(rec.id, { tags, aiStatus: "done", aiError: undefined });
  } catch (err) {
    await updateImage(rec.id, {
      aiStatus: "error",
      aiError: err instanceof Error ? err.message : "tag failed",
    });
  }
}

/** Capture many files (drop / paste / file-picker). Returns created ids. */
export async function captureFiles(files: File[], lang: Lang): Promise<string[]> {
  const ids: string[] = [];
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    try {
      const id = await captureBlob(f, { source: f.name, title: cleanName(f.name) }, lang);
      ids.push(id);
    } catch {
      /* skip unreadable file */
    }
  }
  return ids;
}

function cleanName(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

/** Fetch an image from a URL and capture it. Throws on failure (CORS, 404…). */
export async function captureUrl(url: string, lang: Lang): Promise<string> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) throw new Error("not-image");
  let host = url;
  try {
    host = new URL(url).hostname;
  } catch {
    /* ignore */
  }
  return captureBlob(blob, { source: host, title: host }, lang);
}
