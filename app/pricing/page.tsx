import Link from "next/link";
import type { Metadata } from "next";
import { PricingCards } from "@/components/ui/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing — Ledger",
  description:
    "Free forever to start. Pro for ₹199/month — every tool, unlimited AI, no limits. School pricing for tutors and coaching centres.",
};


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

        <PricingCards />

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
