import { useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLang } from "../i18n";
import {
  db,
  deleteBoard,
  removeFromBoard,
  reorderBoard,
  updateBoard,
  type BoardRecord,
  type ImageRecord,
  type MembershipRecord,
} from "../db";
import { readThroughline, type BoardImageDigest } from "../api";
import { exportBoardJson, exportNodeToPng } from "../lib/export";
import { readableOn } from "../lib/color";
import { Button, Chip, Empty, Swatches } from "./ui";
import AddImagesModal from "./AddImagesModal";
import ImageDetail from "./ImageDetail";

export default function BoardView({
  boardId,
  onBack,
}: {
  boardId: string;
  onBack: () => void;
}) {
  const { t, lang } = useLang();
  const board = useLiveQuery(() => db.boards.get(boardId).then((b) => b ?? null), [boardId], undefined) as
    | BoardRecord
    | null
    | undefined;
  const mems = useLiveQuery(
    () => db.memberships.where("boardId").equals(boardId).sortBy("ordre"),
    [boardId],
    undefined,
  ) as MembershipRecord[] | undefined;
  const images = useLiveQuery(async () => {
    if (!mems) return undefined;
    const out = await Promise.all(mems.map((m) => db.images.get(m.imageId)));
    return out.filter((x): x is ImageRecord => !!x);
  }, [mems], undefined) as ImageRecord[] | undefined;

  const [adding, setAdding] = useState(false);
  const [openImg, setOpenImg] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tlError, setTlError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const lookbookRef = useRef<HTMLDivElement>(null);

  const memberIds = useMemo(() => new Set((mems ?? []).map((m) => m.imageId)), [mems]);

  if (board === undefined || images === undefined) {
    return (
      <div className="py-16 text-center">
        <span className="inline-block h-5 w-5 animate-glow rounded-full bg-amber" />
      </div>
    );
  }
  if (board === null) {
    return (
      <div className="py-10 text-center">
        <p className="text-ink-faint dark:text-bone/50">{t("Planche introuvable.", "Board not found.")}</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          ← {t("Retour", "Back")}
        </Button>
      </div>
    );
  }

  const tl = board.throughline;
  const someStillTagging = images.some((i) => i.aiStatus === "running");

  async function runThroughline() {
    if (!images || images.length < 2) return;
    setBusy(true);
    setTlError(null);
    try {
      const digests: BoardImageDigest[] = images.map((img) => ({
        composition: img.tags.composition,
        mood: img.tags.mood,
        subject: img.tags.subject,
        lighting: img.tags.lighting,
        accroche: img.tags.accroche,
        palette: img.palette,
      }));
      const result = await readThroughline({ brief: board!.brief, digests, lang });
      await updateBoard(boardId, { throughline: result });
    } catch (err) {
      setTlError(err instanceof Error ? err.message : t("Échec.", "Failed."));
    } finally {
      setBusy(false);
    }
  }

  async function onDrop(target: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === target || !images) return;
    const order = images.map((i) => i.id);
    const [moved] = order.splice(from, 1);
    order.splice(target, 0, moved);
    await reorderBoard(boardId, order);
  }

  async function exportPng() {
    if (!lookbookRef.current) return;
    setExporting(true);
    try {
      // give the off-canvas look-book a tick to lay out
      await new Promise((r) => setTimeout(r, 60));
      await exportNodeToPng(lookbookRef.current, board!.title);
    } catch {
      setTlError(t("L'export PNG a échoué.", "PNG export failed."));
    } finally {
      setExporting(false);
    }
  }

  const open = images.find((i) => i.id === openImg) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            onClick={onBack}
            className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint hover:text-amber-deep dark:text-bone/45 dark:hover:text-amber-soft"
          >
            ← {t("Toutes les planches", "All boards")}
          </button>
          {editTitle ? (
            <input
              autoFocus
              defaultValue={board.title}
              onBlur={(e) => {
                updateBoard(boardId, { title: e.target.value.trim() || board.title });
                setEditTitle(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-full bg-transparent font-display text-3xl font-semibold text-ink outline-none dark:text-bone"
            />
          ) : (
            <h2
              onClick={() => setEditTitle(true)}
              className="cursor-text font-display text-3xl font-semibold leading-tight text-ink dark:text-bone"
              title={t("Cliquer pour renommer", "Click to rename")}
            >
              {board.title}
            </h2>
          )}
          <textarea
            defaultValue={board.brief ?? ""}
            onBlur={(e) => updateBoard(boardId, { brief: e.target.value.trim() || undefined })}
            rows={1}
            placeholder={t("Ajoute une intention / un brief…", "Add an intent / brief…")}
            className="mt-1 w-full resize-none bg-transparent text-sm text-ink-soft outline-none placeholder:text-ink-faint/60 dark:text-bone/60"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setAdding(true)}>
            + {t("Images", "Images")}
          </Button>
          {images.length >= 1 && (
            <>
              <Button variant="ghost" onClick={() => exportBoardJson(board, images)}>
                ⬇ JSON
              </Button>
              <Button variant="ghost" onClick={exportPng} disabled={exporting}>
                {exporting ? t("Rendu…", "Rendering…") : "⬇ PNG"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* throughline panel */}
      {images.length >= 2 && (
        <ThroughlinePanel
          tl={tl}
          busy={busy}
          error={tlError}
          warnTagging={someStillTagging}
          onRun={runThroughline}
        />
      )}

      {/* pin-wall */}
      {images.length === 0 ? (
        <Empty
          icon="🧲"
          title={t("Planche vide", "Empty board")}
          body={t("Épingle des images depuis ta bibliothèque.", "Pin images from your library.")}
        />
      ) : (
        <div className="[column-fill:_balance] gap-3 [column-count:2] sm:[column-count:3] lg:[column-count:4]">
          {images.map((img, i) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("drop-target");
              }}
              onDragLeave={(e) => e.currentTarget.classList.remove("drop-target")}
              onDrop={(e) => {
                e.currentTarget.classList.remove("drop-target");
                onDrop(i);
              }}
              className="group relative mb-3 block overflow-hidden rounded-xl bg-slate-900 shadow-plate ring-1 ring-black/10"
              style={{ breakInside: "avoid" }}
            >
              <img
                src={img.thumb}
                alt={img.title ?? ""}
                loading="lazy"
                onClick={() => setOpenImg(img.id)}
                className="w-full cursor-pointer object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                {img.palette.length > 0 && <Swatches hexes={img.palette} size={12} />}
              </div>
              <button
                onClick={() => removeFromBoard(boardId, img.id)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-bone opacity-0 backdrop-blur transition hover:bg-amber-deep group-hover:opacity-100"
                aria-label={t("Retirer de la planche", "Remove from board")}
                title={t("Retirer", "Remove")}
              >
                ✕
              </button>
              <span className="absolute left-1.5 top-1.5 cursor-grab rounded-full bg-slate-950/60 px-1.5 py-0.5 font-mono text-[10px] text-bone/70 opacity-0 backdrop-blur transition group-hover:opacity-100">
                ⠿ {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* footer actions */}
      <div className="seam my-2" />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-ink-faint dark:text-bone/40">
          {images.length} {t("images", "images")}
        </span>
        {confirmDel ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-ink-faint dark:text-bone/50">{t("Supprimer la planche ?", "Delete board?")}</span>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteBoard(boardId);
                onBack();
              }}
            >
              {t("Supprimer", "Delete")}
            </Button>
            <button className="underline" onClick={() => setConfirmDel(false)}>
              {t("Annuler", "Cancel")}
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="text-sm text-amber-deep hover:underline dark:text-amber-soft"
          >
            {t("Supprimer la planche", "Delete board")}
          </button>
        )}
      </div>

      {adding && <AddImagesModal boardId={boardId} memberIds={memberIds} onClose={() => setAdding(false)} />}
      {open && <ImageDetail image={open} onClose={() => setOpenImg(null)} />}

      {/* Off-screen look-book render target (positioned off-canvas, NOT opacity:0). */}
      <div className="pointer-events-none fixed left-[-9999px] top-0" aria-hidden>
        <Lookbook ref={lookbookRef} board={board} images={images} lang={lang} />
      </div>
    </div>
  );
}

// ── Throughline reveal ─────────────────────────────────────────────────────
function ThroughlinePanel({
  tl,
  busy,
  error,
  warnTagging,
  onRun,
}: {
  tl: BoardRecord["throughline"];
  busy: boolean;
  error: string | null;
  warnTagging: boolean;
  onRun: () => void;
}) {
  const { t } = useLang();

  if (busy) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-cyan/30 bg-slate-900 p-6 text-bone shadow-throughline">
        <div className="absolute inset-0 -translate-x-full animate-sweep bg-gradient-to-r from-transparent via-cyan/15 to-transparent" />
        <p className="relative font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-soft">
          {t("révélateur", "developer")}
        </p>
        <p className="relative mt-2 font-display text-xl text-bone">
          {t("L'Imagier distille ton regard…", "L'Imagier is distilling your eye…")}
        </p>
      </div>
    );
  }

  if (!tl) {
    return (
      <div className="rounded-2xl border border-cyan/30 bg-gradient-to-br from-cyan/10 to-amber/5 p-5 dark:from-cyan/10 dark:to-slate-800/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-deep dark:text-cyan-soft">
              🧬 {t("la ligne directrice", "the throughline")}
            </p>
            <p className="mt-1 max-w-md text-sm text-ink-soft dark:text-bone/70">
              {t(
                "Laisse l'Imagier nommer l'ADN visuel de cette planche : palette, habitudes de cadre, traitement.",
                "Let l'Imagier name this board's visual DNA: palette, framing habits, a treatment.",
              )}
            </p>
          </div>
          <Button variant="cyan" onClick={onRun}>
            {t("Révéler", "Reveal")}
          </Button>
        </div>
        {warnTagging && (
          <p className="mt-2 font-mono text-[11px] text-amber-deep dark:text-amber-soft">
            {t("Certaines images sont encore en lecture.", "Some images are still being read.")}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-amber-deep dark:text-amber-soft">{error}</p>}
      </div>
    );
  }

  return (
    <div className="animate-develop rounded-2xl border border-cyan/30 bg-slate-900 p-6 text-bone shadow-throughline">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-soft">
            🧬 {t("ligne directrice", "throughline")}
          </p>
          <h3 className="mt-1 font-display text-3xl font-semibold leading-tight text-bone">{tl.nom}</h3>
        </div>
        <button
          onClick={onRun}
          className="rounded-lg border border-bone/20 px-3 py-1.5 font-mono text-[11px] text-bone/70 transition hover:border-cyan/50 hover:text-cyan-soft"
        >
          ↻ {t("Re-distiller", "Re-distill")}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {tl.paletteDominante.map((h) => (
          <span
            key={h}
            style={{ background: h, color: readableOn(h) }}
            className="rounded-md px-2 py-1 font-mono text-[10px] ring-1 ring-white/10"
          >
            {h}
          </span>
        ))}
      </div>

      <p className="mt-4 max-w-2xl font-display text-[15px] leading-relaxed text-bone/90">
        {tl.traitement}
      </p>

      {tl.principes.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-soft">
            {t("principes visuels", "visual principles")}
          </p>
          <ul className="space-y-1.5">
            {tl.principes.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-bone/85">
                <span className="text-cyan-soft">{String(i + 1).padStart(2, "0")}</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tl.recurrences.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tl.recurrences.map((r) => (
            <Chip key={r} tone="cyan">
              {r}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Look-book render target (for PNG export) ───────────────────────────────
function Lookbook({
  ref,
  board,
  images,
  lang,
}: {
  ref: React.Ref<HTMLDivElement>;
  board: BoardRecord;
  images: ImageRecord[];
  lang: "fr" | "en";
}) {
  const tl = board.throughline;
  return (
    <div
      ref={ref}
      style={{ width: 1200, background: "#100d0a", color: "#f4efe6", fontFamily: "Archivo, sans-serif" }}
      className="p-12"
    >
      <div style={{ borderBottom: "1px solid rgba(244,239,230,0.15)", paddingBottom: 20, marginBottom: 24 }}>
        <p style={{ fontFamily: "Space Mono, monospace", fontSize: 12, letterSpacing: 4, textTransform: "uppercase", color: "#f2a866" }}>
          L'Imagier · {lang === "en" ? "look-book" : "cahier d'ambiance"}
        </p>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 52, fontWeight: 600, margin: "8px 0 0" }}>
          {board.title}
        </h1>
        {board.brief && <p style={{ color: "rgba(244,239,230,0.6)", marginTop: 8, fontSize: 16 }}>{board.brief}</p>}
      </div>

      {tl && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: "Space Mono, monospace", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#62c2bc" }}>
            🧬 {lang === "en" ? "throughline" : "ligne directrice"} — {tl.nom}
          </p>
          <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
            {tl.paletteDominante.map((h) => (
              <span key={h} style={{ background: h, color: readableOn(h), fontFamily: "Space Mono, monospace", fontSize: 11, padding: "6px 8px", borderRadius: 6 }}>
                {h}
              </span>
            ))}
          </div>
          <p style={{ fontFamily: "Fraunces, serif", fontSize: 17, lineHeight: 1.6, color: "rgba(244,239,230,0.92)", marginTop: 14, maxWidth: 900 }}>
            {tl.traitement}
          </p>
          {tl.principes.length > 0 && (
            <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: "none" }}>
              {tl.principes.map((p, i) => (
                <li key={i} style={{ fontSize: 14, color: "rgba(244,239,230,0.85)", marginBottom: 6 }}>
                  <span style={{ color: "#62c2bc", fontFamily: "Space Mono, monospace" }}>{String(i + 1).padStart(2, "0")}</span>{"  "}
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* contact-sheet grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {images.map((img) => (
          <div key={img.id} style={{ background: "#16130f", borderRadius: 8, overflow: "hidden" }}>
            <img src={img.thumb} alt="" style={{ width: "100%", display: "block", aspectRatio: "4 / 3", objectFit: "cover" }} />
            <div style={{ display: "flex", height: 8 }}>
              {img.palette.map((h) => (
                <span key={h} style={{ background: h, flex: 1 }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 24, fontFamily: "Space Mono, monospace", fontSize: 10, color: "rgba(244,239,230,0.4)", textAlign: "center", letterSpacing: 2 }}>
        {images.length} {lang === "en" ? "images" : "images"} · L'Imagier
      </p>
    </div>
  );
}
