import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLang } from "../i18n";
import { allTagsOf, db, type ImageRecord } from "../db";
import { colorFamily, colorFamilyLabel } from "../lib/color";
import Capture from "./Capture";
import ImageCard from "./ImageCard";
import ImageDetail from "./ImageDetail";
import { Chip, Empty, cx } from "./ui";

export default function Library() {
  const { t, lang } = useLang();
  const images = useLiveQuery(
    () => db.images.orderBy("createdAt").reverse().toArray(),
    [],
    undefined,
  ) as ImageRecord[] | undefined;

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // top tags across the library (for the quick filter rail)
  const topTags = useMemo(() => {
    if (!images) return [];
    const freq = new Map<string, number>();
    for (const img of images) for (const tg of allTagsOf(img)) {
      const k = tg.toLowerCase();
      freq.set(k, (freq.get(k) ?? 0) + 1);
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([tg]) => tg);
  }, [images]);

  const colorFamilies = useMemo(() => {
    if (!images) return [];
    const set = new Set<string>();
    for (const img of images) for (const h of img.palette) set.add(colorFamily(h));
    return Array.from(set);
  }, [images]);

  const filtered = useMemo(() => {
    if (!images) return [];
    const q = query.trim().toLowerCase();
    return images.filter((img) => {
      if (q) {
        const hay = [
          img.title ?? "",
          img.tags.accroche,
          ...allTagsOf(img),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (activeTag) {
        if (!allTagsOf(img).some((tg) => tg.toLowerCase() === activeTag)) return false;
      }
      if (activeColor) {
        if (!img.palette.some((h) => colorFamily(h) === activeColor)) return false;
      }
      return true;
    });
  }, [images, query, activeTag, activeColor]);

  const open = images?.find((i) => i.id === openId) ?? null;
  const loading = images === undefined;

  return (
    <div className="flex flex-col gap-6">
      <Capture />

      {!loading && images.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Cherche un tag, une ambiance, un sujet…", "Search a tag, mood, subject…")}
              className="min-w-[200px] flex-1 rounded-xl border border-ink/15 bg-bone-pale px-4 py-2 text-sm text-ink outline-none placeholder:text-ink-faint/70 focus:border-amber dark:border-bone/15 dark:bg-slate-800 dark:text-bone dark:placeholder:text-bone/30"
            />
            <span className="font-mono text-[11px] text-ink-faint dark:text-bone/45">
              {filtered.length}/{images.length}
            </span>
          </div>

          {(topTags.length > 0 || colorFamilies.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {topTags.map((tg) => (
                <Chip
                  key={tg}
                  tone="neutral"
                  active={activeTag === tg}
                  onClick={() => setActiveTag(activeTag === tg ? null : tg)}
                >
                  {tg}
                </Chip>
              ))}
              {colorFamilies.map((fam) => {
                const sampleHex = images
                  .flatMap((i) => i.palette)
                  .find((h) => colorFamily(h) === fam);
                return (
                  <button
                    key={fam}
                    onClick={() => setActiveColor(activeColor === fam ? null : fam)}
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 font-mono text-[11px] transition",
                      activeColor === fam
                        ? "bg-cyan/20 text-cyan-deep ring-2 ring-cyan/60 dark:text-cyan-soft"
                        : "bg-ink/5 text-ink-soft hover:brightness-105 dark:bg-bone/10 dark:text-bone/70",
                    )}
                  >
                    <span
                      style={{ background: sampleHex }}
                      className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15"
                    />
                    {colorFamilyLabel(sampleHex ?? "#888888", lang)}
                  </button>
                );
              })}
              {(activeTag || activeColor || query) && (
                <button
                  onClick={() => {
                    setActiveTag(null);
                    setActiveColor(null);
                    setQuery("");
                  }}
                  className="font-mono text-[11px] text-amber-deep underline underline-offset-2 dark:text-amber-soft"
                >
                  {t("tout effacer", "clear all")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <span className="inline-block h-5 w-5 animate-glow rounded-full bg-amber" />
        </div>
      ) : images.length === 0 ? (
        <Empty
          icon="🎞"
          title={t("La table est vide", "The table is empty")}
          body={t(
            "Dépose tes premières images ci-dessus. Claude les taguera et en extraira la palette.",
            "Drop your first images above. Claude will tag them and pull out their palette.",
          )}
        />
      ) : filtered.length === 0 ? (
        <Empty
          icon="🔍"
          title={t("Rien ne correspond", "Nothing matches")}
          body={t("Ajuste ta recherche ou tes filtres.", "Adjust your search or filters.")}
        />
      ) : (
        <div className="[column-fill:_balance] gap-3 [column-count:2] sm:[column-count:3] lg:[column-count:4]">
          {filtered.map((img) => (
            <ImageCard key={img.id} image={img} onOpen={() => setOpenId(img.id)} />
          ))}
        </div>
      )}

      {open && <ImageDetail image={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
