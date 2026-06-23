import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Ledger",
  description:
    "Free forever to start. Pro for ₹199/month — every tool, unlimited AI, no limits. School pricing for tutors and coaching centres.",
};

const FREE_FEATURES = [
  "Study Engine & Doubt Solver",
  "Past Papers — CBSE, JEE, NEET, SAT, IB",
  "AI Flashcards & Focus Dashboard",
  "Planner, Habit Tracker & Deadline Hub",
  "Formula Sheet & Resume Builder",
  "20 AI requests per day",
  "1 syllabus upload",
  "Ledger Score tracking",
];

const PRO_FEATURES = [
  "Everything in Free",
  "All 55+ tools unlocked",
  "Unlimited AI requests",
  "Unlimited syllabus uploads",
  "Score history & analytics",
  "Priority support",
  "Early access to new tools",
];

const SCHOOL_FEATURES = [
  "Everything in Pro",
  "Bulk student licences",
  "Teacher dashboard (Q4 2026)",
  "Per-student usage analytics",
  "Custom onboarding",
  "Dedicated support",
];

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Can I switch plans?",
    a: "Yes. Upgrade or downgrade any time from your account settings. Changes apply from the next billing cycle.",
  },
  {
    q: "What payment methods are accepted?",
    a: "UPI, debit card, credit card, and net banking — all via Razorpay.",
  },
  {
    q: "Is there a student discount?",
    a: "Pro is already student-priced at ₹199/month. If you need further help, email us at hello@studyledger.in.",
  },
  {
    q: "Is my data safe?",
    a: (
      <>
        Yes. We never sell your study data. Everything is stored encrypted. See our{" "}
        <Link
          href="/legal/privacy"
          style={{ color: "var(--cinnabar-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
];

export default function PricingPage() {
  return (
    <main
      id="main-content"
      style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}
    >
      <style>{`
        .pricing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .pricing-grid { grid-template-columns: 1fr; }
          .pricing-header h1 { font-size: 36px !important; }
        }
      `}</style>

      <nav
        style={{
          borderBottom: "1px solid var(--rule)",
          padding: "14px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--serif)",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          LEDGER
        </Link>
        <Link
          href="/auth"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--cinnabar-ink)",
            textDecoration: "none",
          }}
        >
          Start free →
        </Link>
      </nav>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "64px 40px 96px" }}>
        <div className="pricing-header" style={{ textAlign: "center", marginBottom: 64 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--cinnabar-ink)",
              marginBottom: 12,
            }}
          >
            Pricing
          </div>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: "0.02em",
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            Simple, honest pricing.
          </h1>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: 16,
              color: "var(--ink-2)",
              maxWidth: 480,
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Free forever to start. Pro for students who want every tool with no limits.
            School pricing for teachers and tuition centres.
          </p>
        </div>

        <div className="pricing-grid" style={{ marginBottom: 24 }}>
          <TierCard
            label="Free"
            price="₹0"
            period="forever"
            desc="The essentials. No card required, no expiry."
            features={FREE_FEATURES}
            cta="Start free →"
            ctaHref="/auth"
            highlighted={false}
          />
          <TierCard
            label="Pro"
            badge="Most popular"
            price="₹199"
            period="/month"
            yearNote="or ₹1,499/year — saves 37%"
            desc="Every tool, unlimited AI, priority access."
            features={PRO_FEATURES}
            cta="Get Pro →"
            ctaHref="/auth"
            highlighted={true}
          />
          <TierCard
            label="School"
            price="Custom"
            period="per student"
            desc="For schools, tutors, and coaching centres."
            features={SCHOOL_FEATURES}
            cta="Contact us →"
            ctaHref="mailto:hello@studyledger.in"
            highlighted={false}
            externalCta
          />
        </div>

        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
            textAlign: "center",
            marginBottom: 80,
          }}
        >
          All prices in INR · GST included · Billed in India
        </p>

        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.04em",
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            Common questions
          </h2>
          <div>
            {FAQS.map(({ q, a }, i) => (
              <div
                key={i}
                style={{ borderBottom: "1px solid var(--rule)", padding: "20px 0" }}
              >
                <p
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ink)",
                    marginBottom: 6,
                  }}
                >
                  {q}
                </p>
                <p
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: 14,
                    color: "var(--ink-2)",
                    lineHeight: 1.7,
                  }}
                >
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--rule)",
            marginTop: 64,
            paddingTop: 24,
            display: "flex",
            gap: 24,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {(
            [
              ["← Home", "/"],
              ["Sign up free", "/auth"],
              ["Privacy Policy", "/legal/privacy"],
              ["FAQ", "/faq"],
            ] as const
          ).map(([label, href]) => (
            <Link
              key={label}
              href={href}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function TierCard({
  label,
  badge,
  price,
  period,
  yearNote,
  desc,
  features,
  cta,
  ctaHref,
  highlighted,
  externalCta,
}: {
  label: string;
  badge?: string;
  price: string;
  period: string;
  yearNote?: string;
  desc: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
  externalCta?: boolean;
}) {
  return (
    <div
      style={{
        border: highlighted ? "1px solid var(--cinnabar-ink)" : "1px solid var(--rule)",
        borderRadius: 4,
        padding: "32px 28px",
        background: highlighted ? "var(--paper-2)" : "transparent",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {badge && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--cinnabar-ink)",
            color: "var(--paper)",
            fontFamily: "var(--mono)",
            fontSize: 8,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "3px 10px",
            borderRadius: 2,
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </div>
      )}

      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: highlighted ? "var(--cinnabar-ink)" : "var(--ink-3)",
          marginBottom: 16,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: 42,
          fontWeight: 800,
          letterSpacing: "0.01em",
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {price}
      </div>

      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          color: "var(--ink-3)",
          letterSpacing: "0.08em",
          marginBottom: yearNote ? 4 : 16,
        }}
      >
        {period}
      </div>

      {yearNote && (
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            color: "var(--cinnabar-ink)",
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          {yearNote}
        </div>
      )}

      <p
        style={{
          fontFamily: "var(--sans)",
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        {desc}
      </p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 28px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flexGrow: 1,
        }}
      >
        {features.map((f, i) => (
          <li
            key={i}
            style={{
              fontFamily: "var(--sans)",
              fontSize: 13,
              color:
                i === 0 && f.startsWith("Everything") ? "var(--ink-3)" : "var(--ink-2)",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ color: "var(--cinnabar-ink)", flexShrink: 0, marginTop: 1 }}>
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>

      {externalCta ? (
        <a
          href={ctaHref}
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "12px 20px",
            border: "1px solid var(--rule)",
            background: "transparent",
            color: "var(--ink)",
            textDecoration: "none",
            display: "block",
            textAlign: "center",
            borderRadius: 3,
          }}
        >
          {cta}
        </a>
      ) : (
        <Link
          href={ctaHref}
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "12px 20px",
            border: `1px solid ${highlighted ? "var(--cinnabar-ink)" : "var(--rule)"}`,
            background: highlighted ? "var(--cinnabar-ink)" : "transparent",
            color: highlighted ? "var(--paper)" : "var(--ink)",
            textDecoration: "none",
            display: "block",
            textAlign: "center",
            borderRadius: 3,
          }}
        >
          {cta}
        </Link>
      )}
    </div>
  );
}
