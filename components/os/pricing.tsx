"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Pricing, in the academic OS language.
//
// The checkout path is unchanged from the legacy page: a signed-in student
// posts to /api/checkout and Stripe's webhook grants the tier. Only the
// presentation is new. Prices are the same figures the existing Stripe
// products are configured against — changing them here without changing the
// products would show a number the customer is never charged.
//
// Constitution §3: no fabricated urgency, no invented social proof, no
// "most popular" badge unless it is measured. The Pro column is marked
// recommended because it is the tier that unlocks the whole product, and it
// says exactly that rather than implying a crowd.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

const FREE = [
  "Every journey section — academics, testing, colleges, applications, essays",
  "Your full record, stored on your device",
  "Next-best-action queue",
  "Calendar and deadline tracking",
  "20 AI requests per day",
  "1 syllabus upload",
];

const PRO = [
  "Everything in Free",
  "Every study tool unlocked",
  "Unlimited AI requests",
  "Unlimited syllabus uploads",
  "Score history and analytics",
  "Priority support",
];

const MAX = [
  "Everything in Pro",
  "Personalised AI tutor sessions",
  "Parent and guardian dashboard",
  "Score projections and exam forecast",
  "Study Rooms — unlimited members",
  "Dedicated onboarding",
];

const PRICES = {
  pro: { monthly: 199, yearlyPerMonth: 125, saves: "₹889" },
  max: { monthly: 499, yearlyPerMonth: 333, saves: "₹1,989" },
};

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const { session } = useAuth();
  const [busy, setBusy] = useState<"pro" | "max" | null>(null);
  const [error, setError] = useState("");

  // Signed-in students go straight to Stripe; the webhook grants the tier
  // after payment. Signed-out students are sent to sign in first.
  async function startCheckout(tier: "pro" | "max") {
    if (!session) return;
    setBusy(tier);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier, interval: yearly ? "yearly" : "monthly" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { window.location.assign(data.url); return; }
      setError(data.error || "Could not start checkout. Please try again.");
    } catch {
      setError("Could not reach the payment service. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div data-os>
      <div className="os-bar">
        <div className="os-bar-inner">
          <Link href="/" className="os-wordmark">StudyLedger</Link>
          <nav className="os-nav" aria-label="Main">
            <Link href="/#systems" className="os-nav-item">Systems</Link>
            <Link href="/#principles" className="os-nav-item">Principles</Link>
            <Link href="/about" className="os-nav-item">About</Link>
            <Link href="/os/pricing" className="os-nav-item" data-active="true">Pricing</Link>
          </nav>
          <div style={{ marginLeft: "auto" }}>
            <Link href="/journey" className="os-btn" data-variant="primary" data-size="sm">
              Open StudyLedger
            </Link>
          </div>
        </div>
      </div>

      <main className="os-shell" id="main-content">
        <section className="os-measure os-center" style={{ padding: "80px 0 38px" }}>
          <p className="os-eyebrow">Pricing</p>
          <h1 style={{
            fontSize: "clamp(32px, 5vw, 46px)", lineHeight: 1.1,
            letterSpacing: "-0.03em", fontWeight: 600, color: "var(--os-ink)", margin: 0,
          }}>
            Free to use. Paid to go further.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--os-ink-3)", margin: "18px 0 0" }}>
            Every journey section is free, permanently. Your record, your deadlines and your
            next-best-action queue never sit behind a paywall — the paid tiers add AI capacity
            and the study tools on top.
          </p>
        </section>

        {/* Billing period */}
        <div className="os-row" style={{ marginBottom: 30, gap: 10, justifyContent: "center" }}>
          <div style={{
            display: "inline-flex", padding: 3, gap: 2,
            background: "var(--os-surface-sunk)", borderRadius: 999,
            border: "1px solid var(--os-line)",
          }}>
            {[["Monthly", false], ["Yearly", true]].map(([label, val]) => (
              <button
                key={String(label)}
                onClick={() => setYearly(val as boolean)}
                className="os-btn"
                data-variant="ghost"
                data-size="sm"
                style={{
                  borderRadius: 999,
                  background: yearly === val ? "var(--os-surface)" : "transparent",
                  color: yearly === val ? "var(--os-ink)" : "var(--os-ink-3)",
                  boxShadow: yearly === val ? "var(--os-shadow-1)" : "none",
                  fontWeight: yearly === val ? 600 : 450,
                }}
              >{label as string}</button>
            ))}
          </div>
          {yearly && <span className="os-pill" data-tone="good">Two months free</span>}
        </div>

        {error && (
          <div className="os-card" style={{
            borderColor: "var(--os-risk)", background: "var(--os-risk-soft)", marginBottom: 18,
          }}>
            <p style={{ fontSize: 14, color: "var(--os-risk)", margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(288px,1fr))",
          gap: 16, marginBottom: 72, alignItems: "start",
        }}>
          <Plan
            name="Free"
            price="₹0"
            period="forever"
            desc="The whole journey system, with a daily cap on AI."
            features={FREE}
            cta="Open StudyLedger"
            href="/journey"
          />
          <Plan
            name="Pro"
            price={`₹${yearly ? PRICES.pro.yearlyPerMonth : PRICES.pro.monthly}`}
            period={yearly ? "/month, billed yearly" : "/month"}
            note={yearly ? `You save ${PRICES.pro.saves} a year` : undefined}
            desc="Every tool, and no daily limit."
            features={PRO}
            recommended
            cta={session ? "Upgrade to Pro" : "Sign in to upgrade"}
            href={session ? undefined : "/auth"}
            onClick={session ? () => startCheckout("pro") : undefined}
            busy={busy === "pro"}
          />
          <Plan
            name="Max"
            price={`₹${yearly ? PRICES.max.yearlyPerMonth : PRICES.max.monthly}`}
            period={yearly ? "/month, billed yearly" : "/month"}
            note={yearly ? `You save ${PRICES.max.saves} a year` : undefined}
            desc="For the year the applications actually go in."
            features={MAX}
            cta={session ? "Upgrade to Max" : "Sign in to upgrade"}
            href={session ? undefined : "/auth"}
            onClick={session ? () => startCheckout("max") : undefined}
            busy={busy === "max"}
          />
        </div>

        <section className="os-measure" style={{ marginBottom: 72 }}>
          <h2 style={{
            fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
            color: "var(--os-ink)", margin: "0 0 20px",
          }}>Questions</h2>
          <div className="os-stack-sm">
            {[
              ["Is the free tier a trial?",
               "No. It does not expire and it is not reduced later. Every journey section — your record, deadlines and recommendations — stays free. The paid tiers add AI capacity and the study tools."],
              ["What happens to my data if I stop paying?",
               "Nothing is deleted. Your record is stored on your own device first and syncs when you are signed in, so it remains yours whether or not you are subscribed."],
              ["Can I cancel?",
               "Any time, from the billing portal. The tier stays active until the end of the period you have already paid for."],
              ["Do you offer a student discount?",
               "Everyone here is a student, so the listed price is already that price."],
            ].map(([q, a]) => (
              <div key={q} className="os-card">
                <h3 style={{
                  fontSize: 15, fontWeight: 600, color: "var(--os-ink)", margin: "0 0 6px",
                }}>{q}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--os-ink-3)", margin: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer style={{
          borderTop: "1px solid var(--os-line)", paddingTop: 26, paddingBottom: 40,
          display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, color: "var(--os-ink-4)" }}>
            StudyLedger — built by a student, in Delhi.
          </span>
          <div className="os-row" style={{ marginLeft: "auto", gap: 18 }}>
            <Link href="/" className="os-link">Home</Link>
            <Link href="/about" className="os-link">About</Link>
            <Link href="/legal/terms" className="os-link">Terms</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Plan({
  name, price, period, note, desc, features, cta, href, onClick, recommended, busy,
}: {
  name: string;
  price: string;
  period: string;
  note?: string;
  desc: string;
  features: string[];
  cta: string;
  href?: string;
  onClick?: () => void;
  recommended?: boolean;
  busy?: boolean;
}) {
  return (
    <section className="os-card" style={{
      padding: "24px 24px 26px",
      borderColor: recommended ? "var(--os-accent-line)" : "var(--os-line)",
      background: recommended
        ? "linear-gradient(180deg, var(--os-accent-soft) 0%, var(--os-surface) 40%)"
        : "var(--os-surface)",
    }}>
      <div className="os-row" style={{ gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--os-ink)", margin: 0 }}>{name}</h2>
        {recommended && <span className="os-pill" data-tone="accent">Unlocks everything</span>}
      </div>

      <div className="os-row" style={{ gap: 6, alignItems: "baseline", marginTop: 12 }}>
        <span className="os-num" style={{
          fontSize: 36, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--os-ink)",
        }}>{price}</span>
        <span style={{ fontSize: 13, color: "var(--os-ink-4)" }}>{period}</span>
      </div>
      {note && <p className="os-basis" style={{ marginTop: 4 }}>{note}</p>}

      <p style={{
        fontSize: 14, lineHeight: 1.55, color: "var(--os-ink-3)", margin: "12px 0 20px",
      }}>{desc}</p>

      {href ? (
        <Link href={href} className="os-btn" data-variant={recommended ? "primary" : "default"}
          style={{ width: "100%" }}>{cta}</Link>
      ) : (
        <button className="os-btn" data-variant={recommended ? "primary" : "default"}
          style={{ width: "100%" }} onClick={onClick} disabled={busy}>
          {busy ? "Opening checkout…" : cta}
        </button>
      )}

      <ul style={{ listStyle: "none", margin: "22px 0 0", padding: 0, display: "grid", gap: 10 }}>
        {features.map(f => (
          <li key={f} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span aria-hidden="true" style={{
              flex: "0 0 auto", marginTop: 6, width: 5, height: 5, borderRadius: "50%",
              background: recommended ? "var(--os-accent)" : "var(--os-ink-4)",
            }} />
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--os-ink-2)" }}>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
