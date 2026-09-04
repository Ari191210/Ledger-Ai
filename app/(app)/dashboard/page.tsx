import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/motion/reveal";
import { StatNumber } from "@/components/ui/stat-number";

// ─── placeholder data (wired to real inputs later) ───────────────────────
const SCORE = 742;
const DELTA = 18;
const TIER = "Developing";
const NEXT = { label: "Strong", at: 800 };

const HISTORY = [
  688, 690, 691, 689, 694, 698, 697, 702, 705, 704, 709, 712, 711, 715, 718,
  717, 721, 724, 723, 720, 726, 729, 731, 730, 734, 736, 735, 739, 741, 742,
];

const PILLARS = [
  { label: "PYQ accuracy", pts: 288, tone: 1 },
  { label: "Syllabus coverage", pts: 160, tone: 0.68 },
  { label: "Mistake velocity", pts: 154, tone: 0.44 },
  { label: "Consistency", pts: 140, tone: 0.26 },
];

const TODAY = [
  { text: "2 PYQ sets due — Physics, Maths", meta: "≈ 90 min" },
  { text: "6 flagged mistakes to review", meta: "Chemistry" },
  { text: "3 topics below 60% coverage", meta: "Physics" },
];

const STRIP = [
  { label: "Coverage", value: 64, unit: "%", note: "goal 100%" },
  { label: "Mistakes / wk", value: 23, unit: "", note: "was 31" },
  { label: "PYQ sessions", value: 12, unit: "", note: "goal 20" },
  { label: "Focus / wk", value: 9, unit: "h", note: "goal 14" },
];

// ─── svg helpers ────────────────────────────────────────────────────────
function areaPaths(data: number[], w: number, h: number, pad = 6) {
  const lo = Math.min(...data) - 4;
  const hi = Math.max(...data) + 4;
  const x = (i: number) => (i / (data.length - 1)) * w;
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (h - pad * 2);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const fill = `${line} L${w} ${h} L0 ${h} Z`;
  return { line, fill };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.email?.split("@")[0] ?? "there";
  const earned = PILLARS.reduce((s, p) => s + p.pts, 0);
  const spark = areaPaths(HISTORY.slice(-16), 220, 44);
  const chart = areaPaths(HISTORY, 820, 150);

  return (
    <div className="mx-auto max-w-[1280px]">
      <Reveal>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-[1.05rem] font-semibold text-text">Hello, {name}</h1>
          <span className="text-xs text-text-3">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
      </Reveal>

      <div className="grid grid-cols-12 gap-4">
        {/* ── INK HERO: Ledger Score ─────────────────────────────── */}
        <Reveal delay={0.04} className="col-span-12 lg:col-span-7">
          <section className="flex h-full flex-col rounded-2xl bg-ink p-6 text-ink-fg">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-ink-fg-2">Ledger Score</span>
              <span className="text-xs text-ink-fg-2">
                {NEXT.at - SCORE} to {NEXT.label}
              </span>
            </div>

            <div className="mt-3 flex items-end gap-4">
              <StatNumber
                value={SCORE}
                className="text-[5rem] font-extrabold leading-[0.9] tracking-[-0.04em] text-ink-fg"
              />
              <div className="mb-2 flex flex-col gap-1">
                <span className="text-sm text-ink-fg-2">{TIER}</span>
                <span className="text-sm font-semibold text-accent">
                  +{DELTA} this week
                </span>
              </div>
            </div>

            <svg
              viewBox="0 0 220 44"
              preserveAspectRatio="none"
              className="mt-4 h-11 w-full"
              aria-hidden
            >
              <path d={spark.fill} fill="var(--accent)" opacity={0.14} />
              <path
                d={spark.line}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.75}
                strokeLinecap="round"
              />
            </svg>

            {/* composition — ONE segmented bar */}
            <div className="mt-auto pt-5">
              <div className="flex h-2 overflow-hidden rounded-full">
                {PILLARS.map((p) => (
                  <div
                    key={p.label}
                    style={{
                      width: `${(p.pts / earned) * 100}%`,
                      background: "var(--accent)",
                      opacity: p.tone,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-fg-2">
                {PILLARS.map((p) => (
                  <span key={p.label}>
                    {p.label}{" "}
                    <span className="font-semibold tabular-nums text-ink-fg">
                      {p.pts}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ── Today ──────────────────────────────────────────────── */}
        <Reveal delay={0.08} className="col-span-12 lg:col-span-5">
          <section className="h-full rounded-2xl border border-border bg-surface p-6">
            <span className="text-sm font-medium text-text-2">Today</span>
            <ul className="mt-4 divide-y divide-border">
              {TODAY.map((t) => (
                <li key={t.text} className="flex items-baseline gap-3 py-3 first:pt-0">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="flex-1 text-sm text-text">{t.text}</span>
                  <span className="shrink-0 text-xs tabular-nums text-text-3">
                    {t.meta}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        {/* ── Score, 30 days ─────────────────────────────────────── */}
        <Reveal delay={0.12} className="col-span-12">
          <section className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-text-2">Score</span>
              <span className="text-xs text-text-3">last 30 days</span>
            </div>
            <svg
              viewBox="0 0 820 150"
              preserveAspectRatio="none"
              className="mt-4 h-32 w-full"
              aria-hidden
            >
              <path d={chart.fill} fill="var(--accent)" opacity={0.08} />
              <path
                d={chart.line}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </section>
        </Reveal>

        {/* ── stats strip — hairlines, not cards ─────────────────── */}
        <Reveal delay={0.16} className="col-span-12">
          <section className="grid grid-cols-2 divide-y divide-border rounded-2xl border border-border bg-surface sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {STRIP.map((s) => (
              <div key={s.label} className="p-5">
                <div className="text-xs text-text-3">{s.label}</div>
                <div className="mt-1.5 flex items-baseline gap-0.5">
                  <StatNumber value={s.value} className="text-[1.75rem]" />
                  {s.unit && (
                    <span className="u-stat-number text-base text-text-2">
                      {s.unit}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-text-3">{s.note}</div>
              </div>
            ))}
          </section>
        </Reveal>
      </div>
    </div>
  );
}
