import { useLang } from "../i18n";
import type { ImageRecord } from "../db";
import { Swatches } from "./ui";

export default function ImageCard({
  image,
  onOpen,
}: {
  image: ImageRecord;
  onOpen: () => void;
}) {
  const { t } = useLang();
  const ar = image.width && image.height ? image.height / image.width : 0.66;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative mb-3 block w-full overflow-hidden rounded-xl bg-slate-900 shadow-plate ring-1 ring-black/10 transition hover:shadow-plate-lg hover:ring-amber/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
      style={{ breakInside: "avoid" }}
    >
      <div className="relative w-full" style={{ aspectRatio: `1 / ${Math.min(2.2, Math.max(0.5, ar))}` }}>
        <img
          src={image.thumb}
          alt={image.title ?? ""}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {/* status pill */}
        {image.aiStatus === "running" && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2 py-1 font-mono text-[10px] text-amber-glow backdrop-blur">
            <span className="h-1.5 w-1.5 animate-glow rounded-full bg-amber" />
            {t("lecture…", "reading…")}
          </span>
        )}
        {image.aiStatus === "error" && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-deep/80 px-2 py-1 font-mono text-[10px] text-bone backdrop-blur">
            {t("échec", "failed")}
          </span>
        )}

        {/* hover overlay: accroche + swatches */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-3 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          {image.tags.accroche && (
            <p className="mb-2 line-clamp-2 text-left font-display text-[13px] italic leading-snug text-bone">
              “{image.tags.accroche}”
            </p>
          )}
          {image.palette.length > 0 && <Swatches hexes={image.palette} size={14} />}
        </div>
      </div>
    </button>
  );
}
