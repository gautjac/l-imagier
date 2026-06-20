import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "amber" | "ghost" | "outline" | "cyan" | "danger";

export function Button({
  variant = "amber",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-sans text-sm font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60";
  const styles: Record<Variant, string> = {
    amber:
      "bg-amber text-slate-950 shadow-plate hover:bg-amber-soft active:translate-y-px",
    cyan: "bg-cyan text-slate-950 shadow-plate hover:bg-cyan-soft active:translate-y-px",
    ghost:
      "bg-transparent text-ink-soft hover:bg-ink/5 dark:text-bone/70 dark:hover:bg-bone/10",
    outline:
      "border border-ink/15 bg-bone-light/60 text-ink hover:border-amber/50 hover:bg-bone dark:border-bone/15 dark:bg-slate-800/60 dark:text-bone dark:hover:border-amber/50 dark:hover:bg-slate-700/60",
    danger:
      "bg-transparent text-amber-deep hover:bg-amber-deep/10 dark:text-amber-soft",
  };
  return (
    <button className={cx(base, styles[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function Chip({
  children,
  tone = "neutral",
  onClick,
  active,
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "amber" | "cyan" | "subject" | "mood" | "comp" | "light";
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink/5 text-ink-soft dark:bg-bone/10 dark:text-bone/70",
    amber: "bg-amber/15 text-amber-deep dark:text-amber-soft",
    cyan: "bg-cyan/15 text-cyan-deep dark:text-cyan-soft",
    comp: "bg-cyan/12 text-cyan-deep dark:text-cyan-soft",
    mood: "bg-amber/15 text-amber-deep dark:text-amber-soft",
    subject: "bg-ink/6 text-ink-soft dark:bg-bone/10 dark:text-bone/75",
    light: "bg-bone-vein/40 text-ink-soft dark:bg-slate-600/50 dark:text-bone/70",
  };
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] lowercase tracking-tight transition",
        tones[tone],
        onClick && "cursor-pointer hover:brightness-105",
        active && "ring-2 ring-amber/70 brightness-110",
      )}
    >
      {children}
    </Comp>
  );
}

export function Swatches({ hexes, size = 16 }: { hexes: string[]; size?: number }) {
  if (!hexes.length) return null;
  return (
    <div className="flex overflow-hidden rounded-md shadow-inset ring-1 ring-black/10">
      {hexes.map((h, i) => (
        <span
          key={h + i}
          title={h}
          style={{ background: h, width: size, height: size }}
          className="block"
        />
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-faint dark:text-bone/50">
      <span className="relative inline-block h-4 w-4">
        <span className="absolute inset-0 animate-glow rounded-full bg-amber" />
      </span>
      {label}
    </span>
  );
}

export function Empty({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md animate-fadeIn rounded-2xl border border-dashed border-ink/15 bg-bone-light/40 px-6 py-12 text-center dark:border-bone/15 dark:bg-slate-800/30">
      <div className="mb-3 text-4xl opacity-70">{icon}</div>
      <h3 className="font-display text-xl font-600 text-ink dark:text-bone">{title}</h3>
      <p className="mt-2 text-sm text-ink-faint dark:text-bone/50">{body}</p>
    </div>
  );
}

export function Modal({
  children,
  onClose,
  wide,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={cx(
          "max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-bone-pale shadow-plate-lg ring-1 ring-black/10 thin-scroll animate-pop dark:bg-slate-800 dark:ring-bone/10",
          wide ? "max-w-4xl" : "max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
