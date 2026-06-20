import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings, setSettings, type Settings } from "./db";
import { useLang } from "./i18n";
import Header from "./components/Header";
import Onboarding from "./components/Onboarding";
import Library from "./components/Library";
import Boards from "./components/Boards";
import BoardView from "./components/BoardView";
import { cx } from "./components/ui";

type Tab = "table" | "boards";

export default function App() {
  const { t } = useLang();
  // Coalesce to null so the loading-vs-empty gate is unambiguous on a fresh
  // IndexedDB (Dexie .get resolves to undefined, never null).
  const settings = useLiveQuery(
    () => db.settings.get("settings").then((s) => s ?? null),
    [],
    undefined,
  ) as Settings | null | undefined;

  const [bootstrapped, setBootstrapped] = useState(false);
  const [tab, setTab] = useState<Tab>("table");
  const [boardId, setBoardId] = useState<string | null>(null);

  // First run: ensure a settings row exists exactly once.
  useEffect(() => {
    if (settings === null && !bootstrapped) {
      setBootstrapped(true);
      void getSettings();
    }
  }, [settings, bootstrapped]);

  const theme: "light" | "dark" = settings?.theme ?? "dark";

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#100d0a" : "#f4efe6");
  }, [theme]);

  // Still loading IndexedDB → quiet field (no infinite spinner: resolves fast).
  if (settings === undefined) {
    return <div className="min-h-screen bg-contact bg-[length:26px_26px]" aria-hidden />;
  }

  const showOnboarding = settings ? !settings.onboardingVu : false;

  return (
    <div className="min-h-screen bg-contact bg-[length:26px_26px]">
      {showOnboarding && <Onboarding onEnter={() => setSettings({ onboardingVu: true })} />}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
        <Header
          theme={theme}
          onToggleTheme={() => setSettings({ theme: theme === "dark" ? "light" : "dark" })}
        />

        {boardId ? (
          <BoardView boardId={boardId} onBack={() => setBoardId(null)} />
        ) : (
          <>
            <nav className="mb-7">
              <div className="inline-flex gap-1 rounded-xl bg-bone-light/70 p-1.5 shadow-plate ring-1 ring-ink/10 dark:bg-slate-800/70 dark:ring-bone/10">
                {([
                  { id: "table" as Tab, label: t("Table lumineuse", "Light-table") },
                  { id: "boards" as Tab, label: t("Planches", "Boards") },
                ]).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setTab(o.id)}
                    className={cx(
                      "rounded-lg px-4 py-2 font-sans text-sm font-semibold tracking-wide transition",
                      tab === o.id
                        ? "bg-amber text-slate-950 shadow-plate"
                        : "text-ink-soft hover:bg-ink/5 dark:text-bone/70 dark:hover:bg-bone/10",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </nav>

            <main>
              {tab === "table" && <Library />}
              {tab === "boards" && <Boards onOpen={(id) => setBoardId(id)} />}
            </main>
          </>
        )}

        <footer className="mt-14 flex items-center justify-center gap-3 pb-6 text-center">
          <span className="h-px w-8 bg-ink/15 dark:bg-bone/15" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-faint dark:text-bone/40">
            L'Imagier · {t("table lumineuse", "light-table")}
          </p>
          <span className="h-px w-8 bg-ink/15 dark:bg-bone/15" />
        </footer>
      </div>
    </div>
  );
}
