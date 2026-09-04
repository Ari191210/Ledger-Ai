import { cn } from "@/lib/utils";

function BrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface-2 p-10 shadow-[inset_0_0_0_1px_var(--edge)] lg:flex">
      <div className="u-grille pointer-events-none absolute inset-0" />

      <div className="relative flex items-center gap-2">
        <span className="u-led" />
        <span className="u-brand text-base text-text">StudyLedger</span>
      </div>

      <div className="relative">
        <span className="u-label">the thesis</span>
        <h2 className="mt-3 max-w-[16ch] text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text">
          Know where you stand.
          <span className="block text-accent-strong">Know what to fix next.</span>
        </h2>
        <p className="mt-4 max-w-[40ch] text-sm text-text-2">
          Every PYQ, every mistake, every hour — folded into one number and one
          list of what to do about it.
        </p>
      </div>

      <dl className="relative grid grid-cols-3 gap-6 border-t border-border pt-6">
        {[
          ["01", "the number"],
          ["06", "boards"],
          ["25", "tools"],
        ].map(([n, label]) => (
          <div key={label}>
            <dt className="u-stat-number text-xl text-text">{n}</dt>
            <dd className="u-label mt-1">{label}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function SplitLayout({
  children,
  form = "sm",
}: {
  children: React.ReactNode;
  form?: "sm" | "lg";
}) {
  return (
    <div
      className={cn(
        "grid min-h-screen bg-bg",
        form === "lg"
          ? "lg:grid-cols-[1fr_minmax(0,560px)]"
          : "lg:grid-cols-[1fr_minmax(0,440px)]",
      )}
    >
      <BrandPanel />
      <main className="flex items-center justify-center px-6 py-12">
        <div className={cn("w-full", form === "lg" ? "max-w-lg" : "max-w-sm")}>
          {children}
        </div>
      </main>
    </div>
  );
}
