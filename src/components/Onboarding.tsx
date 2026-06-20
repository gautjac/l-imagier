import { useLang } from "../i18n";
import { Button, Modal } from "./ui";

export default function Onboarding({ onEnter }: { onEnter: () => void }) {
  const { t } = useLang();
  const steps = [
    {
      icon: "📥",
      title: t("Dépose", "Drop"),
      body: t(
        "Glisse, colle ou pointe une URL : tes stills et photos atterrissent sur la table lumineuse.",
        "Drag, paste, or point a URL: your stills and photos land on the light-table.",
      ),
    },
    {
      icon: "👁",
      title: t("Claude regarde", "Claude looks"),
      body: t(
        "Chaque image est taguée — cadre, lumière, ambiance, sujet — et sa vraie palette est extraite.",
        "Each image is tagged — frame, light, mood, subject — and its real palette is pulled out.",
      ),
    },
    {
      icon: "🧲",
      title: t("Assemble", "Assemble"),
      body: t(
        "Épingle tes images sur des planches d'ambiance. Réorganise-les comme une feuille de contact.",
        "Pin images onto moodboards. Rearrange them like a contact sheet.",
      ),
    },
    {
      icon: "🧬",
      title: t("La ligne directrice", "The throughline"),
      body: t(
        "L'Imagier distille l'ADN visuel d'une planche : palette, habitudes de cadre, et un traitement prêt pour ton dossier.",
        "L'Imagier distills a board's visual DNA: palette, framing habits, and a treatment ready for your dossier.",
      ),
    },
  ];

  return (
    <Modal onClose={onEnter}>
      <div className="p-7 sm:p-9">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-deep dark:text-amber-soft">
          {t("la table lumineuse", "the light-table")}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-ink dark:text-bone">
          L'Imagier
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft dark:text-bone/70">
          {t(
            "Une table lumineuse pour ton œil. Capture ce qui t'accroche, laisse Claude le nommer, et découvre la ligne directrice de ton regard.",
            "A light-table for your eye. Capture what catches you, let Claude name it, and discover the throughline in your taste.",
          )}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {steps.map((s) => (
            <div
              key={s.title}
              className="rounded-xl border border-ink/10 bg-bone-light/60 p-4 dark:border-bone/10 dark:bg-slate-700/40"
            >
              <div className="text-2xl">{s.icon}</div>
              <h3 className="mt-1.5 font-sans text-sm font-semibold tracking-wide text-ink dark:text-bone">
                {s.title}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-faint dark:text-bone/55">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex justify-end">
          <Button onClick={onEnter}>{t("Allumer la table", "Light the table")}</Button>
        </div>
      </div>
    </Modal>
  );
}
