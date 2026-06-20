import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLang } from "../i18n";
import { createBoard, db, type BoardRecord, type MembershipRecord } from "../db";
import { Button, Empty, cx } from "./ui";

function BoardThumbs({ boardId }: { boardId: string }) {
  const mems = useLiveQuery(
    () => db.memberships.where("boardId").equals(boardId).sortBy("ordre"),
    [boardId],
  ) as MembershipRecord[] | undefined;
  const imgs = useLiveQuery(async () => {
    if (!mems) return [];
    const out = await Promise.all(mems.slice(0, 4).map((m) => db.images.get(m.imageId)));
    return out.filter(Boolean);
  }, [mems]);

  const count = mems?.length ?? 0;
  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg bg-slate-900">
        {Array.from({ length: 4 }).map((_, i) => {
          const img = imgs?.[i];
          return (
            <div key={i} className="aspect-[4/3] bg-slate-800">
              {img && (
                <img src={img.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
            </div>
          );
        })}
      </div>
      <span className="absolute bottom-1.5 right-1.5 rounded-full bg-slate-950/75 px-2 py-0.5 font-mono text-[10px] text-bone backdrop-blur">
        {count}
      </span>
    </div>
  );
}

export default function Boards({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useLang();
  const boards = useLiveQuery(
    () => db.boards.orderBy("updatedAt").reverse().toArray(),
    [],
    undefined,
  ) as BoardRecord[] | undefined;

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");

  async function submit() {
    const ti = title.trim();
    if (!ti) return;
    const id = await createBoard(ti, brief.trim() || undefined);
    setTitle("");
    setBrief("");
    setCreating(false);
    onOpen(id);
  }

  const loading = boards === undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink dark:text-bone">
            {t("Tes planches", "Your boards")}
          </h2>
          <p className="text-sm text-ink-faint dark:text-bone/50">
            {t(
              "Assemble tes images en planches d'ambiance, puis lis leur ligne directrice.",
              "Assemble images into moodboards, then read their throughline.",
            )}
          </p>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}>+ {t("Nouvelle planche", "New board")}</Button>}
      </div>

      {creating && (
        <div className="animate-riseIn rounded-2xl border border-amber/30 bg-bone-light/60 p-4 shadow-plate dark:bg-slate-800/60">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={t("Titre de la planche…", "Board title…")}
            className="w-full bg-transparent font-display text-xl font-semibold text-ink outline-none placeholder:text-ink-faint/60 dark:text-bone"
          />
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={2}
            placeholder={t(
              "Intention / brief (optionnel) — qu'est-ce que tu cherches ?",
              "Intent / brief (optional) — what are you after?",
            )}
            className="mt-2 w-full resize-none rounded-lg border border-ink/10 bg-bone-pale px-3 py-2 text-sm text-ink outline-none focus:border-amber dark:border-bone/10 dark:bg-slate-700 dark:text-bone"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              {t("Annuler", "Cancel")}
            </Button>
            <Button onClick={submit} disabled={!title.trim()}>
              {t("Créer", "Create")}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <span className="inline-block h-5 w-5 animate-glow rounded-full bg-amber" />
        </div>
      ) : boards.length === 0 && !creating ? (
        <Empty
          icon="🧲"
          title={t("Pas encore de planche", "No boards yet")}
          body={t(
            "Crée une planche pour regrouper les images qui se répondent.",
            "Create a board to gather images that speak to each other.",
          )}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => onOpen(b.id)}
              className={cx(
                "group flex flex-col gap-3 rounded-2xl border border-ink/10 bg-bone-light/60 p-3 text-left shadow-plate transition hover:-translate-y-0.5 hover:shadow-plate-lg hover:ring-1 hover:ring-amber/40 dark:border-bone/10 dark:bg-slate-800/60",
              )}
            >
              <BoardThumbs boardId={b.id} />
              <div>
                <h3 className="font-display text-lg font-semibold leading-tight text-ink dark:text-bone">
                  {b.title}
                </h3>
                {b.brief && (
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-faint dark:text-bone/50">
                    {b.brief}
                  </p>
                )}
                {b.throughline && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-cyan/15 px-2 py-0.5 font-mono text-[10px] text-cyan-deep dark:text-cyan-soft">
                    🧬 {b.throughline.nom}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
