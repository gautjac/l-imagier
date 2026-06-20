import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLang } from "../i18n";
import { addToBoard, allTagsOf, db, removeFromBoard, type ImageRecord } from "../db";
import { Button, Empty, Modal, cx } from "./ui";

export default function AddImagesModal({
  boardId,
  memberIds,
  onClose,
}: {
  boardId: string;
  memberIds: Set<string>;
  onClose: () => void;
}) {
  const { t } = useLang();
  const images = useLiveQuery(
    () => db.images.orderBy("createdAt").reverse().toArray(),
    [],
    undefined,
  ) as ImageRecord[] | undefined;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!images) return [];
    const q = query.trim().toLowerCase();
    if (!q) return images;
    return images.filter((img) =>
      [img.title ?? "", img.tags.accroche, ...allTagsOf(img)].join(" ").toLowerCase().includes(q),
    );
  }, [images, query]);

  return (
    <Modal onClose={onClose} wide>
      <div className="flex max-h-[88vh] flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-semibold text-ink dark:text-bone">
            {t("Épingler des images", "Pin images")}
          </h3>
          <button onClick={onClose} aria-label={t("Fermer", "Close")} className="text-ink-faint dark:text-bone/50">
            ✕
          </button>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Filtrer la bibliothèque…", "Filter the library…")}
          className="mb-3 rounded-xl border border-ink/15 bg-bone-pale px-4 py-2 text-sm text-ink outline-none focus:border-amber dark:border-bone/15 dark:bg-slate-700 dark:text-bone"
        />

        <div className="thin-scroll flex-1 overflow-y-auto">
          {!images || images.length === 0 ? (
            <Empty
              icon="🎞"
              title={t("Bibliothèque vide", "Empty library")}
              body={t("Capture des images d'abord, sous l'onglet Table.", "Capture images first, in the Table tab.")}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {filtered.map((img) => {
                const on = memberIds.has(img.id);
                return (
                  <button
                    key={img.id}
                    onClick={() => (on ? removeFromBoard(boardId, img.id) : addToBoard(boardId, img.id))}
                    className={cx(
                      "group relative aspect-square overflow-hidden rounded-lg ring-1 transition",
                      on ? "ring-2 ring-amber" : "ring-black/10 hover:ring-amber/50",
                    )}
                  >
                    <img src={img.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <span
                      className={cx(
                        "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold transition",
                        on
                          ? "bg-amber text-slate-950"
                          : "bg-slate-950/60 text-bone opacity-0 group-hover:opacity-100",
                      )}
                    >
                      {on ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>{t("Terminé", "Done")}</Button>
        </div>
      </div>
    </Modal>
  );
}
