"use client";

import { useRef, useState } from "react";
import {
  Chip,
  Control,
  Field,
  Measure,
  Row,
  Rule,
  Spacer,
  Stack,
  Text,
} from "@/components/console/primitives";
import DraftReview, { type DraftRow, type ReviewItem } from "@/components/capture/draft-review";
import ManualEntry from "@/components/capture/manual-entry";

// ═══════════════════════════════════════════════════════════════════════════
// /capture — M8-1.
//
// `PRODUCT_DECISIONS` §3: *"Photograph a marked paper. If this doesn't ship,
// nothing else matters."* Architecture S.3 lists the Capture UI as the one
// **CREATE** in the mistake system and quotes the same line.
//
// WHAT THIS SURFACE DOES, EXACTLY, TODAY
//
//   1. takes a photograph, a PDF, or typed text;
//   2. hashes the bytes, puts them in a private bucket, writes ONE `evidence`
//      row — `007_mistakes.sql`'s table, wired for the first time (M8-2);
//   3. enters the paper into `008_ingestion.sql`'s append-only stage ledger at
//      `intake` (M8-3).
//
//   4. offers to READ it — `/api/capture/extract`, which proposes draft
//      occurrences and writes none of them to the record (M8-4);
//   5. shows those drafts and lets the student confirm them, once and only
//      forwards, under `020`'s RLS policy (M8-5);
//   6. offers a path that types the mistake in directly, with no model
//      involved anywhere, into the same confirmation gate (M8-6).
//
// AMENDED 2026-08-15 (M8-4/5/6). Steps 4–6 are new; steps 1–3 are unchanged.
// The screen used to say *"Reading it is not built yet"* — the honest statement
// of M8 part 1's boundary — and now offers the reading instead. What it still
// never does is imply an analysis that has not run: a paper sits at "Stored"
// until the student asks for it to be read, and every proposal is shown as a
// proposal until they confirm it (`PRODUCT_PRINCIPLES` §3.2).
//
// THE READING IS ASKED FOR, NEVER AUTOMATIC. Uploading does not spend a model
// call. A student who wants the bytes safe and nothing else gets exactly that.
//
// THE VOCABULARY IS `/home`'s (M3). Console primitives, the console shell, no
// new components and no new CSS. A capture screen that invented its own visual
// language would be a redesign smuggled inside a data milestone.
//
// TWO ROUTES MERGE HERE (architecture S.4): `exam-practice` **REBUILD** into
// `/capture` (papers) and `syllabus` **ADAPT** into `/capture` (syllabus
// ingestion). Both 301 in `next.config.mjs`.
// ═══════════════════════════════════════════════════════════════════════════

type Kind = "paper" | "syllabus";

type Outcome =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "captured"; deduped: boolean; runId: string | null; evidenceId: string }
  | { state: "refused"; detail: string };

/** The MIME types `019_evidence_storage.sql` lets into the bucket, listed
 *  rather than wildcarded so the browser picker and the bucket agree. */
const ACCEPT = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "application/pdf",
].join(",");

/** What the student is doing right now. One surface, three modes — never three
 *  screens (`PRINCIPLES` law 8: one workspace, many modes). */
type Mode = "capture" | "review" | "manual";

type Reading =
  | { state: "idle" }
  | { state: "reading" }
  | { state: "read"; drafts: DraftRow[]; review: ReviewItem[]; runId: string | null }
  | { state: "declined"; review: ReviewItem[]; detail: string };

export default function CapturePage() {
  const [kind, setKind] = useState<Kind>("paper");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ state: "idle" });
  const [mode, setMode] = useState<Mode>("capture");
  const [reading, setReading] = useState<Reading>({ state: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  /** M8-4 — ask for the paper to be read. Explicit, never on upload. */
  async function read(evidenceId: string) {
    setReading({ state: "reading" });
    try {
      const res = await fetch("/api/capture/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ evidence_id: evidenceId, kind }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        read?: boolean;
        error?: string;
        detail?: string;
        drafts?: DraftRow[];
        review?: ReviewItem[];
        run_id?: string | null;
      };

      if (!res.ok || !data.ok) {
        setReading({
          state: "declined",
          review: [],
          detail: data.detail ?? "the reading could not be made. Type it in instead.",
        });
        return;
      }

      // `read: false` is the graceful degradation, not an error: the pipeline
      // declined to guess and the honest next move is the manual path.
      if (!data.read) {
        setReading({
          state: "declined",
          review: data.review ?? [],
          detail: "Nothing on this page could be read confidently. Nothing was written.",
        });
        setMode("review");
        return;
      }

      setReading({
        state: "read",
        drafts: data.drafts ?? [],
        review: data.review ?? [],
        runId: data.run_id ?? null,
      });
      setMode("review");
    } catch {
      setReading({ state: "declined", review: [], detail: "the network did not answer" });
    }
  }

  const hasSomething = file !== null || text.trim().length > 0;

  async function send() {
    if (!hasSomething) return;
    setOutcome({ state: "sending" });

    const body = new FormData();
    body.set("kind", kind);
    if (note.trim()) body.set("note", note.trim());
    if (file) body.set("file", file);
    else body.set("text", text);

    try {
      const res = await fetch("/api/capture", { method: "POST", body });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        deduped?: boolean;
        evidence_id?: string;
        ingestion?: { run_id?: string } | null;
      };

      if (!res.ok || !data.ok || !data.evidence_id) {
        setOutcome({
          state: "refused",
          detail: data.detail ?? data.error ?? `the upload was refused (${res.status})`,
        });
        return;
      }

      setOutcome({
        state: "captured",
        deduped: Boolean(data.deduped),
        runId: data.ingestion?.run_id ?? null,
        evidenceId: data.evidence_id,
      });
      setFile(null);
      setText("");
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setOutcome({ state: "refused", detail: "the network did not answer" });
    }
  }

  return (
    <main id="main-content">
      <Stack>
        <Measure wide>
          <Row gap={3}>
            <Text step="label" tone="ink" weight={600}>
              StudyLedger
            </Text>
            <Spacer />
            <Control tier="tertiary" href="/home">
              Home
            </Control>
          </Row>
        </Measure>
        <Rule />
      </Stack>

      <Measure>
        <Stack gap={6}>
          <Stack gap={3}>
            <Text step="title" as="h1" weight={500}>
              Capture
            </Text>
            <Text step="body" tone="secondary">
              A marked paper, or the syllabus you are being marked against. It is
              stored exactly as you upload it and never shown to anyone else.
            </Text>
          </Stack>

          <Rule />

          {/* One workspace, three modes (law 8). Never three routes: a student
              moving between "upload", "check what it found" and "type it in"
              is doing one job. */}
          <Row gap={2}>
            <Control tier={mode === "capture" ? "primary" : "tertiary"} onClick={() => setMode("capture")}>
              Upload
            </Control>
            <Control tier={mode === "review" ? "primary" : "tertiary"} onClick={() => setMode("review")}>
              Waiting for you
            </Control>
            <Control tier={mode === "manual" ? "primary" : "tertiary"} onClick={() => setMode("manual")}>
              Type it in
            </Control>
          </Row>

          {mode === "review" && (
            <DraftReview
              seed={reading.state === "read" ? reading.drafts : []}
              review={
                reading.state === "read" ? reading.review
                : reading.state === "declined" ? reading.review
                : []
              }
              runId={reading.state === "read" ? reading.runId : null}
              onManual={() => setMode("manual")}
            />
          )}

          {mode === "manual" && (
            <ManualEntry
              evidenceId={outcome.state === "captured" ? outcome.evidenceId : null}
              onDrafted={() => setMode("review")}
            />
          )}

          {mode === "capture" && (
          <Stack gap={6}>

          {/* WHAT is being captured. Two kinds, because the two routes that
              merge here captured two different things and both must survive
              the merge (S.4). */}
          <Stack gap={3}>
            <Text step="label">What is this</Text>
            <Row gap={2}>
              <Control
                tier={kind === "paper" ? "primary" : "secondary"}
                onClick={() => setKind("paper")}
              >
                A marked paper
              </Control>
              <Control
                tier={kind === "syllabus" ? "primary" : "secondary"}
                onClick={() => setKind("syllabus")}
              >
                Syllabus
              </Control>
            </Row>
          </Stack>

          <Stack gap={3}>
            <Text step="label" as="label" htmlFor="capture-file">
              Photograph or PDF
            </Text>
            <input
              id="capture-file"
              ref={fileRef}
              className="c-field"
              type="file"
              accept={ACCEPT}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setOutcome({ state: "idle" });
              }}
            />
            <Text step="micro" tone="secondary">
              Up to 20 MB. Images and PDFs.
            </Text>
          </Stack>

          {/* The typed path. `syllabus` already had it ("paste text"), and a
              paper a student cannot photograph must still be capturable —
              which is the whole point of M8-6's manual fallback, not yet
              built. This is the same bytes-in-a-bucket path as a photograph. */}
          <Field
            label={kind === "syllabus" ? "Or paste the syllabus" : "Or type what the paper said"}
            value={text}
            onChange={(v) => {
              setText(v);
              setOutcome({ state: "idle" });
            }}
            multiline
            hint="Stored verbatim. Nothing is rewritten."
          />

          <Field
            label="A note, if it helps you find this later"
            value={note}
            onChange={setNote}
            placeholder="Physics unit test, chapter 4"
          />

          <Row gap={2}>
            <Control
              tier="primary"
              onClick={send}
              disabled={!hasSomething || outcome.state === "sending"}
            >
              {outcome.state === "sending" ? "Storing…" : "Capture it"}
            </Control>
            {outcome.state === "sending" && <Text step="label">Hashing and storing</Text>}
          </Row>

          {outcome.state === "captured" && (
            <>
              <Rule />
              <Stack gap={3}>
                <Row gap={2}>
                  <Chip tone="info">{outcome.deduped ? "Already captured" : "Captured"}</Chip>
                  {outcome.runId && <Text step="micro">run {outcome.runId.slice(0, 8)}</Text>}
                </Row>
                <Text step="body">
                  {outcome.deduped
                    ? "You had already uploaded this one. It is still a single piece of evidence, not two."
                    : "Stored, and entered into the record."}
                </Text>

                {/* M8-4. The reading is offered, not performed: uploading a
                    paper never spends a model call on it. */}
                <Row gap={2}>
                  <Control
                    tier="primary"
                    onClick={() => read(outcome.evidenceId)}
                    disabled={reading.state === "reading"}
                  >
                    {reading.state === "reading" ? "Reading…" : "Read it"}
                  </Control>
                  <Control tier="secondary" onClick={() => setMode("manual")}>
                    Type it in instead
                  </Control>
                </Row>

                <Text step="body" tone="secondary">
                  Reading it proposes what you got wrong. Nothing it proposes
                  enters your record until you confirm it.
                </Text>

                {reading.state === "declined" && (
                  <Stack gap={2}>
                    <Chip tone="warn">Not read</Chip>
                    <Text step="body">{reading.detail}</Text>
                  </Stack>
                )}
              </Stack>
            </>
          )}

          {outcome.state === "refused" && (
            <>
              <Rule />
              <Stack gap={2}>
                <Chip tone="error">Not stored</Chip>
                <Text step="body">{outcome.detail}</Text>
              </Stack>
            </>
          )}
          </Stack>
          )}
        </Stack>
      </Measure>
    </main>
  );
}
