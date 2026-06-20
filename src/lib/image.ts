import type { RGB } from "./color";
import { paletteHexes } from "./color";

export interface PreparedImage {
  /** Full-ish image re-encoded as a compact JPEG, stored as a blob. */
  blob: Blob;
  /** Small JPEG data-URL thumbnail for fast grid rendering. */
  thumb: string;
  /** base64 (no data: prefix) of a downscaled JPEG, for the vision call. */
  base64: string;
  mediaType: string;
  /** Real dominant hexes, pinned from the pixels. */
  palette: string[];
  width: number;
  height: number;
}

async function loadBitmap(src: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(src);
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(src);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image illisible. / Unreadable image."));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function dims(b: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  if ("naturalWidth" in b) return { w: b.naturalWidth, h: b.naturalHeight };
  return { w: b.width, h: b.height };
}

function drawScaled(
  bitmap: ImageBitmap | HTMLImageElement,
  maxEdge: number,
  readFreq = false,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number } {
  const { w: bw, h: bh } = dims(bitmap);
  const scale = Math.min(1, maxEdge / Math.max(bw, bh));
  const w = Math.max(1, Math.round(bw * scale));
  const h = Math.max(1, Math.round(bh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", readFreq ? { willReadFrequently: true } : undefined);
  if (!ctx) throw new Error("Canvas indisponible. / Canvas unavailable.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
      type,
      quality,
    ),
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Prepare a dropped/pasted/fetched image: extract its real palette, build a
 * stored JPEG + thumbnail, and produce a downscaled base64 for the vision call.
 */
export async function prepareImage(source: Blob): Promise<PreparedImage> {
  const bitmap = await loadBitmap(source);
  const { w: bw, h: bh } = dims(bitmap);

  // 1) palette — sample a small render of the image
  const { ctx: pctx, w: pw, h: ph } = drawScaled(bitmap, 240, true);
  const { data } = pctx.getImageData(0, 0, pw, ph);
  const pixels: RGB[] = [];
  for (let i = 0; i < data.length; i += 8) {
    const a = data[i + 3];
    if (a < 125) continue;
    pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  const palette = paletteHexes(pixels, 6);

  // 2) stored JPEG (kept reasonably crisp for the look-book) + thumbnail
  const { canvas: storeCanvas } = drawScaled(bitmap, 1400, false);
  const blob = await canvasToBlob(storeCanvas, "image/jpeg", 0.85);

  const { canvas: thumbCanvas } = drawScaled(bitmap, 360, false);
  const thumb = thumbCanvas.toDataURL("image/jpeg", 0.72);

  // 3) base64 for vision (smaller — fast + cheap)
  const { canvas: visionCanvas } = drawScaled(bitmap, 1024, false);
  const visionBlob = await canvasToBlob(visionCanvas, "image/jpeg", 0.82);
  const base64 = await blobToBase64(visionBlob);

  if ("close" in bitmap) bitmap.close();

  return {
    blob,
    thumb,
    base64,
    mediaType: "image/jpeg",
    palette,
    width: bw,
    height: bh,
  };
}

/** Read a stored blob back into a base64 payload for a (re)tag vision call. */
export async function blobToVisionBase64(blob: Blob): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await loadBitmap(blob);
  const { canvas } = drawScaled(bitmap, 1024, false);
  if ("close" in bitmap) bitmap.close();
  const vb = await canvasToBlob(canvas, "image/jpeg", 0.82);
  const base64 = await blobToBase64(vb);
  return { base64, mediaType: "image/jpeg" };
}

/** A stable object URL for a blob, cached so we don't leak on every render. */
const urlCache = new WeakMap<Blob, string>();
export function blobUrl(blob: Blob): string {
  const hit = urlCache.get(blob);
  if (hit) return hit;
  const url = URL.createObjectURL(blob);
  urlCache.set(blob, url);
  return url;
}
