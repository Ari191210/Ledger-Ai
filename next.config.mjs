import { withSentryConfig } from "@sentry/nextjs";

const CSP = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for anti-flash scripts and framework chunks.
  // unsafe-eval is required by Three.js/Spline WebGL shader compilation.
  // ACCEPTED RISK: unsafe-eval weakens XSS protection. Scoped to WebGL use only;
  // do not add new eval() dependencies. Remove when Spline/Three.js is eliminated.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // api.fontshare.com serves the Orsiri stylesheet; cdn.fontshare.com serves its font files
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.fontshare.com",
  // data: for base64 image uploads (doubt tool), blob: for WebGL textures
  "img-src 'self' data: blob:",
  [
    "connect-src 'self'",
    "https://*.supabase.co wss://*.supabase.co",  // Supabase REST + Realtime
    "https://us.i.posthog.com https://us-assets.i.posthog.com", // PostHog analytics
    "https://*.ingest.sentry.io",                  // Sentry error ingestion
    "https://prod.spline.design",                  // Spline scene files
  ].join(" "),
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "frame-ancestors 'self'",  // allow same-origin iframe (split-view tool panel)
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",  // allow Google OAuth redirect
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Consolidated tools — permanent redirects keep old bookmarks and any
  // indexed URLs working. dna's UI is post-exam's DNA tab; cremator's flow
  // is exam-triage's cremator tab (same "cremator" prompt template).
  redirects: async () => [
    // M3-1 — the two shells merge into one. `PRODUCT_DECISIONS` §2.4 and
    // architecture T10: `/dashboard` and `/console` both computed the Ledger
    // Score and both rendered a next action, and building the event layer
    // under both would double the integration surface. Permanent, because the
    // merge is a decision and not an experiment — every bookmark, every
    // indexed URL and every email link lands on `/home` for good.
    //
    // Exact-path only, deliberately: `/dashboard/profile`, `/dashboard/saved`,
    // `/console/ai`, `/console/analytics`, `/console/practice` and
    // `/console/work` are NOT merged by M3 (they belong to Settings, Capture,
    // Record and Practise in §2.4, which later milestones deliver) and must
    // keep resolving — §2.5, unlinked, not deleted. `/console/analytics` is now
    // merged by M13-3's block below, which is what "later milestones deliver"
    // meant; the other four still resolve.
    { source: "/dashboard",      destination: "/home",                           permanent: true },
    { source: "/console",        destination: "/home",                           permanent: true },
    { source: "/tools/dna",      destination: "/tools/post-exam?tab=dna",        permanent: true },
    { source: "/tools/cremator", destination: "/tools/exam-triage?tab=cremator", permanent: true },
    // doubt and notes are Learn Lab tabs. These two were never redirected, so
    // the dashboard's quick-launch pills 404'd for anyone who clicked them.
    { source: "/tools/doubt",    destination: "/tools/learn-lab?tab=doubt",      permanent: true },
    { source: "/tools/notes",    destination: "/tools/learn-lab?tab=notes",      permanent: true },
    // M8-1 — the two capture surfaces merge into `/capture`. Architecture S.4:
    // `exam-practice` **REBUILD** into `/capture` (papers), `syllabus`
    // **ADAPT** into `/capture` (syllabus ingestion), *"wired to
    // `008_ingestion.sql`"*. `PRODUCT_DECISIONS` §3 makes `/capture` one of the
    // nine V1 routes and says why it outranks both: *"Photograph a marked
    // paper. If this doesn't ship, nothing else matters."*
    //
    // Permanent, and exact-path only, for the same two reasons M3-1's pair
    // above are: the merge is a decision rather than an experiment, and a
    // wildcard would swallow routes this milestone does not merge. Nothing
    // else under `/tools` moves — `/tools/exam-triage`, `/tools/panic-triage`
    // and `/tools/recall-studio` carry the sibling tabs `exam-practice` also
    // had, and all 46 tool URLs still resolve (`PRODUCT_DECISIONS` §2.5,
    // unlinked-not-deleted; S.4, "the 29 Level-0 tools KEEP routable").
    //
    // WHAT THE STUDENT LOSES TODAY, STATED RATHER THAN GLOSSED. `/capture`
    // stores what these two took in — a photograph, a PDF, pasted text — and
    // does not yet read it, because reading it is M8-4. `syllabus`'s AI parse
    // and `exam-practice`'s localStorage mistake writer do not survive the
    // redirect, and neither should: S.3 marks that writer **REBUILD** ("must
    // write `occurrences` with evidence") and its client-set status **DELETE**.
    // What replaces them is a durable, deduped, replayable record instead of a
    // browser key — and a paper captured today is re-read by M8-4 without the
    // student uploading it again (`008`'s replay guarantee).
    { source: "/tools/exam-practice", destination: "/capture",                   permanent: true },
    { source: "/tools/syllabus",      destination: "/capture",                   permanent: true },
    // M13-2 — SEVEN SURFACES BECOME ONE. Architecture S.4: `post-exam`,
    // `paper-autopsy`, `marks-forensics`, `marks-obituary`, `paper-trauma`,
    // `paper-pattern` and `calibration` **REBUILD as one** `/diagnosis`.
    // `PRODUCT_DECISIONS` §2.4 states the reason in one line: *"Six metaphors
    // for one answer. **Merging them IS the product.**"*
    //
    // Permanent and exact-path, for M3-1's and M8-1's two reasons — the merge
    // is a decision rather than an experiment, and a wildcard would swallow
    // routes this milestone does not merge.
    //
    // THREE OF THE SEVEN LAND ON A MODE, not the default view, because the
    // distinction they carried is real and survives. Same mechanism M3 used for
    // `/tools/dna → /tools/post-exam?tab=dna`.
    //
    // WHAT WAS ACTUALLY MERGED, HAVING READ ALL SEVEN. Four of them —
    // `post-exam`'s DNA tab, `paper-autopsy`, `marks-obituary` and
    // `paper-trauma` — are the same screen four times: marks lost grouped by
    // error category, plus a claim about what repeats. Every one asked a MODEL
    // to produce those numbers from text the student retyped, and none of them
    // could name a row behind a figure. `/diagnosis` answers the same question
    // from `confirmed_occurrences` and `patterns`, where every number is a sum
    // of rows it can list. That is the plan's own thesis, confirmed rather than
    // assumed: the differentiation was cosmetic.
    //
    // WHAT THE STUDENT LOSES TODAY, STATED RATHER THAN GLOSSED — the same
    // accounting M8-1's block above owes.
    //   · `post-exam`'s Debrief and Strategy tabs. Both take a self-reported
    //     score and return model prose; the debrief's `ledger-exam-debriefs`
    //     key is Level 0 (P.4) and feeds nothing. `PRINCIPLES` §3.2 — the
    //     product does not store claims — so neither is reproduced here.
    //   · `marks-forensics`'s per-mark-scheme-point grading of a pasted answer.
    //     Its durable half, per-question mark accounting, IS here: it is the
    //     evidence trail. Its other half needs the mark scheme read off a
    //     photographed paper, which is `/capture`'s extraction (M8-4) and not a
    //     diagnosis surface's job.
    //   · `calibration`'s generated MCQ quiz. Its durable half — what you
    //     believed before you answered — is here, read from
    //     `occurrences.confidence_before` (§4.3, *"feeds calibration"*) on real
    //     marks lost. Generating questions is F.4's seven gates and M10's
    //     assessment engine, not this route's.
    //   · `paper-pattern` in full. It predicted a subject's next paper from NO
    //     student data and no paper corpus: the frequencies, the trends and the
    //     "predicted questions" were all invented by a model and rendered as
    //     analysis of ten years of papers. S.9 is unambiguous about that class
    //     of surface — *"Not 'estimated' — fabricated, then rendered as a live
    //     count"* — and Law 7 forbids reinstating it. It redirects to the
    //     honest answer to the question it was pretending to answer, and its
    //     content is not carried over. **This is a capability deliberately not
    //     preserved, because it was never a capability.**
    //
    // NONE OF THE SEVEN PAGE FILES IS GUTTED. M8's precedent, not M3's stub:
    // the routes stop being reachable, and the code stays in the tree so that
    // the three genuinely distinct halves above can be rebuilt onto the record
    // by the milestone that owns them (M10's assessment engine, M8-4's
    // extraction) without archaeology.
    { source: "/tools/post-exam",       destination: "/diagnosis",                    permanent: true },
    { source: "/tools/paper-autopsy",   destination: "/diagnosis",                    permanent: true },
    { source: "/tools/marks-obituary",  destination: "/diagnosis",                    permanent: true },
    { source: "/tools/paper-pattern",   destination: "/diagnosis",                    permanent: true },
    { source: "/tools/paper-trauma",    destination: "/diagnosis?view=recurrence",    permanent: true },
    { source: "/tools/marks-forensics", destination: "/diagnosis?view=recurrence",    permanent: true },
    { source: "/tools/calibration",     destination: "/diagnosis?view=calibration",   permanent: true },
    // M13-3 — THE LONGITUDINAL ASSET BECOMES ONE PLACE. Architecture S.4:
    // `grade-tracker` **ADAPT** into `/record`. `PRODUCT_DECISIONS` §2.4:
    // *"**Record** ← `grade-tracker`, `/console/analytics`. The longitudinal
    // asset. **One place, forever.**"* §3 makes `/record` V1 route 6: *"Proof
    // the ledger accumulates."*
    //
    // Permanent and exact-path, for M3-1's, M8-1's and M13-2's two reasons —
    // the merge is a decision rather than an experiment, and a wildcard would
    // swallow routes this milestone does not merge. `/console/analytics` was
    // named in M3-1's block above as one of the five `/console/*` children M3
    // deliberately did NOT merge because *"they belong to Settings, Capture,
    // Record and Practise in §2.4, which later milestones deliver."* This is
    // that later milestone, and this is the delivery.
    //
    // WHAT THE TWO ACTUALLY WERE, HAVING READ BOTH IN FULL.
    //
    // `/console/analytics` is an UNLINKED STRESS-TEST HARNESS. Its own header
    // says *"NOT a production surface … an unlinked harness attacking the
    // vocabulary"*, and every figure in it — the four sectors, the three
    // subjects, the five closes — is a constant in the file. There is no
    // capability to preserve, only a SHAPE: sectors, a per-subject comparison,
    // and a series of closes over time. `/record` renders that shape from
    // `confirmed_occurrences`, `evidence`, `study_sessions` and `score_history`
    // instead of from constants, and the finding the harness existed to record
    // (B-2: *"a trend over time cannot be expressed"*) is answered by bucketing
    // the series into months rather than by adding a chart primitive.
    //
    // `grade-tracker` is four tabs, and ONE of the four is the record.
    //
    // WHAT THE STUDENT LOSES TODAY, STATED RATHER THAN GLOSSED — the same
    // accounting M8-1's and M13-2's blocks above owe and pay.
    //   · THE MARKS PREDICTOR. Self-reported subject scores and weights in, a
    //     weighted average, a CBSE grade, two GPAs, a "score needed in the
    //     remaining weight" and a what-if slider out. Every input is a claim
    //     the student typed and every output is a forecast built on it —
    //     `PRINCIPLES` §3.2 (the product does not store claims) and Law 7. It
    //     is a calculator, and a calculator over unevidenced figures is not the
    //     longitudinal asset §2.4 sends here. **Not carried over.**
    //   · THE LEDGER SCORE TAB. The v1 index, its four pillars, the radar and
    //     the tier ladder. **M14 REBUILDS the score** — S.2 marks
    //     `lib/ledger-score.ts` REBUILD, deletes the streak term and makes
    //     `insufficient evidence` representable — so reproducing the v1
    //     breakdown on a new surface would create a second place to change it
    //     three weeks before it changes. What `/record` carries instead is
    //     `score_history`: the closes that were actually RECORDED, presented as
    //     what the index read on that day. A recorded close is a fact; the v1
    //     pillar breakdown is a formula, and the formula is M14's.
    //   · THE PEER HEATMAP. Its own banner reads *"Illustrative data … not
    //     aggregated from real student sessions."* S.9's class exactly, and the
    //     same call M13-2 made about `paper-pattern`. **This is not a
    //     capability lost; it is a capability that was never one.**
    //   · THE EXAM DEBRIEF. A self-reported score, sleep and anxiety level in,
    //     model prose out, parked in `ledger-exam-debriefs` (Level 0, feeding
    //     nothing). M13-2 refused `post-exam`'s identical Debrief tab for
    //     §3.2's reason and this is the same tab; refusing it there and
    //     carrying it here would be the inconsistency, not the loss.
    //
    // NEITHER PAGE FILE IS GUTTED. M8's precedent, not M3's stub — the same
    // call M13-2 made and for the same reason: the routes stop being reachable,
    // the code stays in the tree, and the one half with a future (the marks
    // predictor, if a milestone ever owns self-reported targets) can be rebuilt
    // onto the record without archaeology. §1.4's deletion gate is not tripped
    // by a merge that is reversible in two lines.
    { source: "/tools/grade-tracker",  destination: "/record",                    permanent: true },
    { source: "/console/analytics",    destination: "/record",                    permanent: true },
    // M16-1 — THE TWO PROFILE EDITORS BECOME ONE. `PRODUCT_DECISIONS` §2.4:
    // *"**Settings** ← `/dashboard/profile`, `personalise`. Two profile
    // editors."* §3, route 8: *"`/settings` — Table stakes."*
    //
    // `/dashboard/profile` was M3-1's deliberate exception — kept resolving,
    // unredirected, because it *"belongs to Settings ... which later
    // milestones deliver."* This is that milestone.
    //
    // Permanent and exact-path, for the same two reasons every merge above
    // gives: the merge is a decision rather than an experiment, and a
    // wildcard would swallow routes this milestone does not merge.
    //
    // WHAT THE STUDENT LOSES TODAY — nothing. Every control on both source
    // pages (username, study profile, account/billing, exam schedule, parent
    // sharing, push opt-in, palette, typography, density, layout, dashboard
    // sections) is carried into `/settings` with its logic unchanged —
    // `components/settings/profile-fields.tsx` and
    // `components/settings/appearance-fields.tsx`. Neither source page file
    // is gutted (M8's precedent): both still resolve to more than a stub.
    { source: "/dashboard/profile", destination: "/settings",                   permanent: true },
    { source: "/tools/personalise", destination: "/settings",                   permanent: true },
    // M16-2 — FOUR LEGAL ROUTES BECOME ONE. `PRODUCT_DECISIONS` §2.4:
    // *"**Legal** ← `terms`, `privacy`, `data`, `ip`. Four routes, one
    // page."* §3, route 9: *"`/legal` — Legally required."*
    //
    // Each lands on the matching section of `/legal` rather than always on
    // Privacy — the same `?tab=`/`?view=` mechanism `/tools/dna` and
    // `/diagnosis`'s six redirects above use, so a bookmark for the Terms
    // page still opens the Terms section rather than making the reader find
    // it again. No word of any policy changes — `components/legal/sections.tsx`
    // carries the prose verbatim — and none of the four source page files is
    // gutted.
    { source: "/legal/privacy", destination: "/legal?section=privacy", permanent: true },
    { source: "/legal/terms",   destination: "/legal?section=terms",   permanent: true },
    { source: "/legal/data",    destination: "/legal?section=data",    permanent: true },
    { source: "/legal/ip",      destination: "/legal?section=ip",      permanent: true },
  ],
  headers: async () => [
    // Immutable long-cache for content-hashed static assets — PRODUCTION ONLY.
    // In dev, Turbopack serves stable chunk paths, so this header pins stale JS
    // in the browser and code edits never reach the page. Production behaviour
    // is unchanged.
    ...(process.env.NODE_ENV === "production"
      ? [
          {
            source: "/_next/static/:path*",
            headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
          },
        ]
      : []),
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy",            value: CSP },
        { key: "X-Content-Type-Options",            value: "nosniff" },
        { key: "X-Frame-Options",                   value: "SAMEORIGIN" },
        { key: "X-XSS-Protection",                  value: "1; mode=block" },
        { key: "Referrer-Policy",                   value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy",                value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        { key: "Strict-Transport-Security",         value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        { key: "Cross-Origin-Opener-Policy",        value: "same-origin" },
        { key: "Cross-Origin-Resource-Policy",      value: "same-origin" },
      ],
    },
  ],
};

export default withSentryConfig(nextConfig, {
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent:  true,
  hideSourceMaps: true,
  disableLogger:  true,
  automaticVercelMonitors: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
