import { useLang } from "../i18n";
import { cx } from "./ui";

export default function Header({
  theme,
  onToggleTheme,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const { lang, setLang, t } = useLang();
  return (
    <header className="mb-7 flex items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="grid grid-cols-2 gap-0.5">
            <span className="h-3 w-3 rounded-[2px] bg-amber" />
            <span className="h-3 w-3 rounded-[2px] bg-cyan" />
            <span className="h-3 w-3 rounded-[2px] bg-bone-vein" />
            <span className="h-3 w-3 rounded-[2px] bg-amber-deep" />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink dark:text-bone">
            L'Imagier
          </h1>
        </div>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-faint dark:text-bone/45">
          {t("la table lumineuse du regard", "the light-table of the eye")}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleTheme}
          className="rounded-lg border border-ink/15 bg-bone-light/70 px-2.5 py-1.5 text-sm transition hover:border-amber/50 dark:border-bone/15 dark:bg-slate-800/70"
          aria-label={t("Changer le thème", "Toggle theme")}
          title={t("Lumière / sombre", "Light / dark")}
        >
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
        <button
          onClick={() => setLang(lang === "fr" ? "en" : "fr")}
          className={cx(
            "rounded-lg border border-ink/15 bg-bone-light/70 px-3 py-1.5 font-mono text-xs font-bold tracking-wide transition hover:border-amber/50 dark:border-bone/15 dark:bg-slate-800/70",
          )}
          aria-label={t("Switch to English", "Passer au français")}
        >
          {lang === "fr" ? "EN" : "FR"}
        </button>
      </div>
    </header>
  );
}
