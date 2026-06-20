import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLang } from "../i18n";
import {
  addToBoard,
  db,
  deleteImage,
  removeFromBoard,
  updateImage,
  type BoardRecord,
  type ImageRecord,
} from "../db";
import { blobUrl } from "../lib/image";
import { retag } from "../lib/intake";
import { colorFamilyLabel } from "../lib/color";
import { Button, Chip, cx, Modal, Spinner } from "./ui";

function TagGroup({
  label,
  tags,
  tone,
}: {
  label: string;
  tags: string[];
  tone: "comp" | "mood" | "subject" | "light";
}) {
  if (!tags.length) return null;
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint dark:text-bone/45">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tg) => (
          <Chip key={tg} tone={tone}>
            {tg}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export default function ImageDetail({
  image,
  onClose,
}: {
  image: ImageRecord;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const [newTag, setNewTag] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  const boards = useLiveQuery(() => db.boards.orderBy("updatedAt").reverse().toArray(), []) as
    | BoardRecord[]
    | undefined;
  const memberships = useLiveQuery(
    () => db.memberships.where("imageId").equals(image.id).toArray(),
    [image.id],
  );
  const memberBoardIds = new Set((memberships ?? []).map((m) => m.boardId));

  async function addManual() {
    const v = newTag.trim();
    if (!v) return;
    if (image.manualTags.includes(v)) {
      setNewTag("");
      return;
    }
    await updateImage(image.id, { manualTags: [...image.manualTags, v] });
    setNewTag("");
  }

  async function removeManual(tg: string) {
    await updateImage(image.id, { manualTags: image.manualTags.filter((m) => m !== tg) });
  }

  async function toggleBoard(boardId: string) {
    if (memberBoardIds.has(boardId)) await removeFromBoard(boardId, image.id);
    else await addToBoard(boardId, image.id);
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="grid gap-0 md:grid-cols-[1.3fr_1fr]">
        {/* image */}
        <div className="flex items-center justify-center bg-slate-950 p-4 md:rounded-l-2xl">
          <img
            src={blobUrl(image.blob)}
            alt={image.title ?? ""}
            className="max-h-[78vh] w-full rounded-lg object-contain animate-develop"
          />
        </div>

        {/* meta */}
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <input
                value={image.title ?? ""}
                onChange={(e) => updateImage(image.id, { title: e.target.value })}
                placeholder={t("Sans titre", "Untitled")}
                className="w-full bg-transparent font-display text-2xl font-semibold text-ink outline-none placeholder:text-ink-faint/60 dark:text-bone"
              />
              {image.source && (
                <p className="truncate font-mono text-[11px] text-ink-faint dark:text-bone/40">
                  {image.source}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-ink-faint hover:bg-ink/5 dark:text-bone/50 dark:hover:bg-bone/10"
              aria-label={t("Fermer", "Close")}
            >
              ✕
            </button>
          </div>

          {/* palette */}
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint dark:text-bone/45">
              {t("palette réelle", "real palette")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {image.palette.map((h) => (
                <span
                  key={h}
                  title={`${h} · ${colorFamilyLabel(h, lang)}`}
                  className="flex items-center gap-1.5 rounded-md bg-ink/5 py-1 pl-1 pr-2 dark:bg-bone/10"
                >
                  <span
                    style={{ background: h }}
                    className="h-4 w-4 rounded ring-1 ring-black/10"
                  />
                  <span className="font-mono text-[10px] text-ink-soft dark:text-bone/60">{h}</span>
                </span>
              ))}
            </div>
          </div>

          {/* AI status / accroche */}
          {image.aiStatus === "running" && <Spinner label={t("Claude regarde…", "Claude is looking…")} />}
          {image.aiStatus === "error" && (
            <div className="rounded-lg bg-amber-deep/10 p-3 text-sm text-amber-deep dark:text-amber-soft">
              {t("Le tag a échoué.", "Tagging failed.")} {image.aiError}
              <button
                onClick={() => retag(image, lang)}
                className="ml-2 underline underline-offset-2"
              >
                {t("Réessayer", "Retry")}
              </button>
            </div>
          )}
          {image.tags.accroche && (
            <blockquote className="border-l-2 border-amber pl-3 font-display text-[15px] italic leading-snug text-ink dark:text-bone">
              “{image.tags.accroche}”
            </blockquote>
          )}

          {/* tag groups */}
          <div className="flex flex-col gap-3">
            <TagGroup label={t("cadre", "composition")} tags={image.tags.composition} tone="comp" />
            <TagGroup label={t("lumière", "lighting")} tags={image.tags.lighting} tone="light" />
            <TagGroup label={t("ambiance", "mood")} tags={image.tags.mood} tone="mood" />
            <TagGroup label={t("sujet", "subject")} tags={image.tags.subject} tone="subject" />
          </div>

          {/* manual tags */}
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint dark:text-bone/45">
              {t("tes tags", "your tags")}
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {image.manualTags.map((tg) => (
                <Chip key={tg} tone="amber" onClick={() => removeManual(tg)} title={t("Retirer", "Remove")}>
                  {tg} ✕
                </Chip>
              ))}
              {image.manualTags.length === 0 && (
                <span className="text-[13px] text-ink-faint dark:text-bone/40">
                  {t("Aucun tag manuel.", "No manual tags yet.")}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
                placeholder={t("Ajoute un tag…", "Add a tag…")}
                className="flex-1 rounded-lg border border-ink/15 bg-bone-pale px-3 py-1.5 font-mono text-[13px] text-ink outline-none focus:border-amber dark:border-bone/15 dark:bg-slate-700 dark:text-bone"
              />
              <Button variant="outline" onClick={addManual} disabled={!newTag.trim()}>
                +
              </Button>
            </div>
          </div>

          {/* boards */}
          {boards && boards.length > 0 && (
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint dark:text-bone/45">
                {t("sur les planches", "on boards")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {boards.map((b) => (
                  <Chip
                    key={b.id}
                    tone={memberBoardIds.has(b.id) ? "cyan" : "neutral"}
                    active={memberBoardIds.has(b.id)}
                    onClick={() => toggleBoard(b.id)}
                  >
                    {memberBoardIds.has(b.id) ? "✓ " : "+ "}
                    {b.title}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {/* actions */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={() => retag(image, lang)} disabled={image.aiStatus === "running"}>
              ↻ {t("Re-taguer", "Re-tag")}
            </Button>
            {confirmDel ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-ink-faint dark:text-bone/50">{t("Sûr ?", "Sure?")}</span>
                <Button
                  variant="danger"
                  onClick={async () => {
                    await deleteImage(image.id);
                    onClose();
                  }}
                >
                  {t("Supprimer", "Delete")}
                </Button>
                <button
                  className="text-sm text-ink-faint underline dark:text-bone/50"
                  onClick={() => setConfirmDel(false)}
                >
                  {t("Annuler", "Cancel")}
                </button>
              </span>
            ) : (
              <button
                className={cx("text-sm text-amber-deep hover:underline dark:text-amber-soft")}
                onClick={() => setConfirmDel(true)}
              >
                {t("Supprimer", "Delete")}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
