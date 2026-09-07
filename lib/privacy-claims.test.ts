import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * The privacy page is a legal document for a service whose users are mostly
 * legally children under India's DPDP Act. It makes absolute claims, and this
 * file exists so those claims cannot quietly stop being true.
 *
 * The specific trap: Sentry is fully wired up (client, server and edge configs,
 * plus a tunnel route at /monitoring chosen so adblockers cannot swallow the
 * reports) but sends nothing, because `enabled` is gated on
 * NEXT_PUBLIC_SENTRY_DSN and that variable is not set in production. Verified
 * against the live site: no requests to any ingest host, and a forced
 * captureException transmits nothing.
 *
 * So the page is true today. Setting one environment variable makes it false,
 * with no code change and nothing to review. That is what this test is for.
 */

const root = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const privacy = read("app/privacy/page.tsx");

/** Claims the page makes that a third-party processor would contradict. */
const EXCLUSIVITY_CLAIMS = [
  "The only\n          third party your data reaches is Anthropic",
  "we run no third-party\n          analytics or tracking scripts",
];

describe("privacy page claims match the code", () => {
  it("still makes the claims this test is guarding", () => {
    // If the wording changes, this test must be re-read rather than silently
    // passing against text that no longer says what it used to.
    const normalised = privacy.replace(/\s+/g, " ");
    expect(normalised).toContain("The only third party your data reaches is Anthropic");
    expect(normalised).toContain("we run no third-party analytics or tracking scripts");
    expect(EXCLUSIVITY_CLAIMS.length).toBe(2);
  });

  it("names every third-party processor that actually receives data", () => {
    // Sentry ships in the bundle but is inert without a DSN. The moment a DSN
    // exists, error events, URLs and stack traces leave the browser for a US
    // processor the page says does not receive anything, and the page has to
    // say so before that happens.
    const sentryConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
    const pageNamesSentry = /sentry/i.test(privacy);

    if (sentryConfigured && !pageNamesSentry) {
      throw new Error(
        "NEXT_PUBLIC_SENTRY_DSN is set, so Sentry receives crash reports, but " +
          "app/privacy/page.tsx still says Anthropic is the only third party " +
          "your data reaches. Disclose Sentry in 'Where your data lives' and " +
          "amend both absolute claims before enabling it.",
      );
    }
    expect(sentryConfigured && !pageNamesSentry).toBe(false);
  });

  it("keeps the Sentry configuration inside what the page promises children", () => {
    // The page promises no behavioural profiling. These two settings are what
    // keep that true, and sentry.shared.ts cites DPDP s.9(3) for exactly this
    // reason. Session Replay in particular records what a user does on screen.
    const shared = read("sentry.shared.ts");
    expect(shared).toMatch(/sendDefaultPii:\s*false/);
    expect(shared).toMatch(/tracesSampleRate:\s*0/);
    expect(shared).not.toMatch(/replaysSessionSampleRate|replayIntegration|Replay\(/);
  });

  it("keeps the two promises the page makes about deletion and export", () => {
    // Both verified against the migrations and the export route; this pins the
    // export side, which is the one that drifts when a table is added.
    const exportRoute = read("app/api/export/route.ts");
    for (const table of [
      "activity_days",
      "mistakes",
      "pyq_attempts",
      "syllabus_topics",
      "habits",
      "habit_logs",
      "deadlines",
      "parental_consents",
      "focus_sessions",
      "subscriptions",
      "ai_advice",
      "ai_invocations",
    ]) {
      expect(exportRoute, `${table} missing from the export`).toContain(`"${table}"`);
    }
    expect(privacy.replace(/\s+/g, " ")).toContain("download a full export");
  });
});
