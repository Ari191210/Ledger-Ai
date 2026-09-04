import { cn } from "@/lib/utils";

// Big statement pulled from the product's thesis. Restated, not decorative.
function BrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-feature p-10 text-feature-fg lg:flex">
      {/* faint concentric motif echoing the Ledger Score ring */}
      <svg
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] opacity-[0.12]"
        viewBox="0 0 200 200"
        aria-hidden
      >
        {[90, 68, 46].map((r) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          />
        ))}
      </svg>

      <div className="u-brand text-lg">StudyLedger</div>

      <div>
        <h2 className="max-w-[14ch] text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.03em]">
          Know where you stand.
          <span className="block text-accent">Know what to fix next.</span>
        </h2>
        <p className="mt-4 max-w-[42ch] text-sm text-white/75">
          Every PYQ, every mistake, every hour — folded into one number and one
          list of what to do about it.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-6 border-t border-white/15 pt-6 text-white/80">
        {[
          ["1", "the number"],
          ["6", "boards"],
          ["40+", "tools"],
        ].map(([n, label]) => (
          <div key={label}>
            <dt className="u-stat-number text-2xl text-white">{n}</dt>
            <dd className="mt-1 text-xs">{label}</dd>
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
        "grid min-h-screen",
        form === "lg"
          ? "lg:grid-cols-[1fr_minmax(0,580px)]"
          : "lg:grid-cols-[1fr_minmax(0,460px)]",
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
