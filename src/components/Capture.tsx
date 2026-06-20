import { useRef, useState } from "react";
import { useLang } from "../i18n";
import { captureFiles, captureUrl } from "../lib/intake";
import { Button, cx } from "./ui";

export default function Capture() {
  const { t, lang } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleFiles(files: File[]) {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const ids = await captureFiles(files, lang);
      if (ids.length === 0) {
        setErr(t("Aucune image valide.", "No valid image found."));
      } else {
        setMsg(
          t(
            `${ids.length} image${ids.length > 1 ? "s" : ""} déposée${ids.length > 1 ? "s" : ""} — Claude regarde…`,
            `${ids.length} image${ids.length > 1 ? "s" : ""} dropped — Claude is looking…`,
          ),
        );
      }
    } catch {
      setErr(t("Quelque chose a échoué.", "Something failed."));
    } finally {
      setBusy(false);
    }
  }

  async function handleUrl() {
    const u = url.trim();
    if (!u) return;
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      await captureUrl(u, lang);
      setUrl("");
      setMsg(t("Image récupérée — Claude regarde…", "Image fetched — Claude is looking…"));
    } catch {
      setErr(
        t(
          "Impossible de récupérer cette image (le site la bloque peut-être). Télécharge-la et glisse-la.",
          "Couldn't fetch that image (the site may block it). Download it and drag it in.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
      .map((i) => i.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length) {
      e.preventDefault();
      void handleFiles(files);
    }
  }

  return (
    <section
      onPaste={onPaste}
      className="animate-fadeIn"
      aria-label={t("Capture", "Capture")}
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handleFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => fileRef.current?.click()}
        className={cx(
          "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
          over
            ? "border-amber bg-amber/10 shadow-safelight"
            : "border-ink/15 bg-bone-light/50 hover:border-amber/50 hover:bg-bone-light dark:border-bone/15 dark:bg-slate-800/40 dark:hover:border-amber/50 dark:hover:bg-slate-800/70",
        )}
      >
        <div className="text-4xl transition group-hover:scale-110">📥</div>
        <p className="mt-3 font-display text-2xl font-semibold text-ink dark:text-bone">
          {t("Dépose tes images ici", "Drop your images here")}
        </p>
        <p className="mt-1 text-sm text-ink-faint dark:text-bone/55">
          {t(
            "Glisse des fichiers, colle (⌘V), ou clique pour choisir.",
            "Drag files, paste (⌘V), or click to browse.",
          )}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUrl()}
          placeholder={t("…ou colle l'URL d'une image", "…or paste an image URL")}
          className="flex-1 rounded-xl border border-ink/15 bg-bone-pale px-4 py-2.5 font-mono text-sm text-ink outline-none placeholder:text-ink-faint/70 focus:border-amber dark:border-bone/15 dark:bg-slate-800 dark:text-bone dark:placeholder:text-bone/30"
        />
        <Button variant="outline" onClick={handleUrl} disabled={busy || !url.trim()}>
          {t("Récupérer", "Fetch")}
        </Button>
      </div>

      {(msg || err) && (
        <p
          className={cx(
            "mt-3 text-sm",
            err ? "text-amber-deep dark:text-amber-soft" : "text-cyan-deep dark:text-cyan-soft",
          )}
        >
          {err ?? msg}
        </p>
      )}
    </section>
  );
}
