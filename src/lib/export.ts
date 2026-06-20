import { toPng } from "html-to-image";
import type { BoardRecord, ImageRecord } from "../db";

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "planche"
  );
}

/**
 * Render a DOM node to a high-res PNG and download it. We do NOT hide the node
 * (opacity:0 hangs html-to-image) and pass fontEmbedCSS: "" to skip the slow,
 * sometimes-hanging external font embedding.
 */
export async function exportNodeToPng(node: HTMLElement, name: string): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    fontEmbedCSS: "",
    backgroundColor: "#100d0a",
  });
  download(dataUrl, `imagier-${slug(name)}.png`);
}

/** Export a board (with its throughline write-up + image tags) as JSON. */
export function exportBoardJson(board: BoardRecord, images: ImageRecord[]): void {
  const payload = {
    app: "l-imagier",
    exportedAt: new Date().toISOString(),
    board: {
      title: board.title,
      brief: board.brief ?? null,
      throughline: board.throughline ?? null,
    },
    images: images.map((img) => ({
      title: img.title ?? null,
      source: img.source ?? null,
      palette: img.palette,
      tags: img.tags,
      manualTags: img.manualTags,
      dimensions: { width: img.width, height: img.height },
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  download(url, `imagier-${slug(board.title)}.json`);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
