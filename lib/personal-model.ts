/**
 * M19 — THE PERSONAL MODEL. Pure domain logic.
 *
 * Implements Architecture Part I in full:
 *   I.2  — a fixed, typed, BOUNDED set of dimensions (never a free-form bag)
 *   I.3  — the pipeline: signal → PersonalModelSignal → PersonalModel → effective_value
 *   I.4  — signal extraction: only from events that already exist for an academic reason
 *   I.5  — confidence, evidence, recency, decay, floor
 *   I.6  — the explicit-over-inferred guarantee (mechanism 2, the generated
 *          `effective_value`, and mechanism 3/4 — event-sourced, sticky explicit
 *          values — live here; mechanism 1, the column-level GRANT, lives in
 *          `supabase/migrations/031_personal_model.sql`, because a GRANT cannot
 *          be expressed in TypeScript)
 *
 * RULES THIS FILE OBEYS, WITHOUT EXCEPTION (same discipline as
 * `lib/mistakes/engine.ts` and `lib/score-engine.ts`):
 *   · Pure. No I/O, no database, no framework, no clock, no randomness.
 *   · Deterministic. Every time-dependent decision takes an explicit timestamp.
 *   · Non-mutating. Inputs are never written to; outputs are frozen.
 *   · Bounded. `PERSONAL_MODEL_DIMENSIONS` is the one and only list. Adding a
 *     dimension is a code change AND a migration (I.2) — never a runtime value.
 *
 * OUT OF SCOPE, PERMANENTLY (I.1): ability, potential, personality, predicted
 * outcomes framed as fixed. Every dimension here describes what a student
 * DOES (format, pace, method), never what they ARE.
 */

// ═══════════════════════════════════════════════════════════════════════════
// I.2 — THE BOUNDED DIMENSION LIST
// ═══════════════════════════════════════════════════════════════════════════

export const PERSONAL_MODEL_DIMENSIONS = [
  "explanation_style",
  "communication_tone",
  "question_format_mix",
  "difficulty_preference",
  "session_length",
  "working_window",
  "correction_method",
  "notification_appetite",
  "recommendation_aggressiveness",
] as const;

export type PersonalModelDimension = (typeof PERSONAL_MODEL_DIMENSIONS)[number];

const DIMENSION_SET: ReadonlySet<string> = new Set(PERSONAL_MODEL_DIMENSIONS);

/** I.2 — the ONLY admission test for a dimension name. Reused by the event
 *  ingest layer (`lib/event-contract.ts`) and by the SQL enum's mirror test. */
export const isPersonalModelDimension = (v: unknown): v is PersonalModelDimension =>
  typeof v === "string" && DIMENSION_SET.has(v);

// ── I.2's per-dimension type, transcribed from the architecture's table ────

export const EXPLANATION_STYLES = ["examples-first", "theory-first", "bullet-points", "step-by-step"] as const;
export const COMMUNICATION_TONES = ["simple", "conversational", "detailed", "direct"] as const;
export const QUESTION_FORMATS = ["mcq", "numeric", "short_text", "ordering", "match"] as const;
export const DIFFICULTY_PREFERENCES = ["gentle", "matched", "stretch"] as const;
export const CORRECTION_METHODS = ["worked-example", "first-principles", "contrast-pair", "drill"] as const;
export const NOTIFICATION_APPETITES = ["minimal", "standard", "off"] as const;
/** Not enumerated by name in the architecture table; the three-point scale is
 *  a capacity guess, labelled as one — the same posture 015's partition count
 *  and score-engine's tuning constants take. */
export const RECOMMENDATION_AGGRESSIVENESS = ["low", "medium", "high"] as const;

export type QuestionFormat = (typeof QUESTION_FORMATS)[number];

/** `question_format_mix` — "weights over {mcq, numeric, short_text, ordering,
 *  match}" (I.2). Not required to sum to 1; the aggregator normalises at read
 *  time so a partial signal set never has to fake completeness. */
export type FormatWeights = Partial<Record<QuestionFormat, number>>;

/** `working_window` — "hours-of-day distribution" (I.2). Index `h` is the
 *  weight for the hour-of-day `[h, h+1)` in the student's own local time,
 *  as supplied by the extractor (never inferred from server time — R.10
 *  governs event ORDERING, not the student's clock). */
export type HourDistribution = readonly number[]; // length 24

/** The typed union of every value a dimension may hold. JSONB-storable. */
export type PersonalModelValue =
  | (typeof EXPLANATION_STYLES)[number]
  | (typeof COMMUNICATION_TONES)[number]
  | (typeof DIFFICULTY_PREFERENCES)[number]
  | (typeof CORRECTION_METHODS)[number]
  | (typeof NOTIFICATION_APPETITES)[number]
  | (typeof RECOMMENDATION_AGGRESSIVENESS)[number]
  | FormatWeights
  | HourDistribution
  | number; // session_length, in minutes

/**
 * I.2's type column, enforced. This is the TypeScript half of the bounded-set
 * guarantee; `031_personal_model.sql`'s CHECK constraints are the SQL half —
 * the same two-layer posture `event-contract.ts` already uses for every other
 * enum (D.2 in TS, `academic_events_*` CHECKs in SQL, asserted equal by test).
 */
export function isValidValueForDimension(dimension: PersonalModelDimension, value: unknown): boolean {
  switch (dimension) {
    case "explanation_style":
      return (EXPLANATION_STYLES as readonly string[]).includes(value as string);
    case "communication_tone":
      return (COMMUNICATION_TONES as readonly string[]).includes(value as string);
    case "difficulty_preference":
      return (DIFFICULTY_PREFERENCES as readonly string[]).includes(value as string);
    case "correction_method":
      return (CORRECTION_METHODS as readonly string[]).includes(value as string);
    case "notification_appetite":
      return (NOTIFICATION_APPETITES as readonly string[]).includes(value as string);
    case "recommendation_aggressiveness":
      return (RECOMMENDATION_AGGRESSIVENESS as readonly string[]).includes(value as string);
    case "session_length":
      return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 240;
    case "question_format_mix":
      if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
      return Object.entries(value as Record<string, unknown>).every(
        ([k, w]) => (QUESTION_FORMATS as readonly string[]).includes(k) && typeof w === "number" && w >= 0,
      );
    case "working_window":
      return Array.isArray(value) && value.length === 24 && value.every((w) => typeof w === "number" && w >= 0);
    default: {
      const _exhaustive: never = dimension;
      return _exhaustive;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// I.3 — THE PIPELINE, STAGE 1: THE EVENT SHAPE A SIGNAL IS EXTRACTED FROM
//
// Deliberately narrow and structural rather than importing the full
// `AcademicEventRow` — I.4: "a signal must be derivable from an event that
// already exists for an academic reason", so an extractor only ever needs the
// handful of fields it reads, and this module stays free of the ingest
// layer's I/O concerns.
// ═══════════════════════════════════════════════════════════════════════════

export interface PersonalModelSourceEvent {
  event_id: string;
  event_type: string;
  seq: number;
  received_at: string; // ISO — server time, per R.10
  concept_id: string | null;
  session_id: string | null;
  payload: Record<string, unknown>;
}

/** I.3 — the raw signal an extractor emits. `weight` is the extractor's own
 *  confidence in THIS one observation (not the aggregate `confidence`) —
 *  e.g. a `dwell_ms` far past the reading floor is a stronger vote than one
 *  barely over it. */
export interface PersonalModelSignal {
  dimension: PersonalModelDimension;
  observed_value: PersonalModelValue;
  weight: number; // 0..1
  source_event_id: string;
  observed_at: string; // ISO, = the source event's received_at
}

const signal = (
  dimension: PersonalModelDimension,
  observed_value: PersonalModelValue,
  weight: number,
  ev: PersonalModelSourceEvent,
): PersonalModelSignal => ({
  dimension,
  observed_value,
  weight: Math.max(0, Math.min(1, weight)),
  source_event_id: ev.event_id,
  observed_at: ev.received_at,
});

// ═══════════════════════════════════════════════════════════════════════════
// I.4 — SIGNAL EXTRACTORS, ONE PER DIMENSION, VERSIONED
//
// Each extractor is a pure function over a WINDOW of a student's own events —
// never cross-student, never new telemetry. `EXTRACTOR_VERSION` changes only
// when the extraction LOGIC changes, so a re-run is auditable the same way
// `formula_version` makes a score snapshot auditable (J.1).
// ═══════════════════════════════════════════════════════════════════════════

export const EXTRACTOR_VERSION = 1;

const READ_DWELL_FLOOR_MS = 4_000;
const READ_DWELL_STRONG_MS = 20_000;

/**
 * `explanation_style` — I.4's own worked example: "an `EXPLANATION_READ` with
 * high `dwell_ms` followed by a correct answer on that concept ⇒ positive
 * signal for that explanation style." The style read is carried on the event
 * itself (`payload.style`) — the extractor never guesses which style was
 * shown, only whether it landed.
 */
export function extractExplanationStyleSignals(events: readonly PersonalModelSourceEvent[]): PersonalModelSignal[] {
  const out: PersonalModelSignal[] = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.event_type !== "EXPLANATION_READ") continue;
    const style = ev.payload.style;
    const dwellMs = ev.payload.dwell_ms;
    if (!(EXPLANATION_STYLES as readonly string[]).includes(style as string)) continue;
    if (typeof dwellMs !== "number" || dwellMs < READ_DWELL_FLOOR_MS) continue;

    const followedByCorrect = events
      .slice(i + 1)
      .some((later) => later.event_type === "QUESTION_CORRECT" && later.concept_id === ev.concept_id);

    const weight = (followedByCorrect ? 0.7 : 0.3) * Math.min(1, dwellMs / READ_DWELL_STRONG_MS);
    out.push(signal("explanation_style", style as PersonalModelValue, weight, ev));
  }
  return out;
}

/**
 * `communication_tone` — I.4 by analogy to explanation style: length of
 * engagement per tone. `payload.tone` names the tone in force for the
 * surface the student was reading; `dwell_ms` (or `duration_ms`, tolerant of
 * either field name) is the engagement length.
 */
export function extractCommunicationToneSignals(events: readonly PersonalModelSourceEvent[]): PersonalModelSignal[] {
  const out: PersonalModelSignal[] = [];
  for (const ev of events) {
    if (ev.event_type !== "EXPLANATION_READ" && ev.event_type !== "CONCEPT_VIEWED") continue;
    const tone = ev.payload.tone;
    const dwellMs = ev.payload.dwell_ms ?? ev.payload.duration_ms;
    if (!(COMMUNICATION_TONES as readonly string[]).includes(tone as string)) continue;
    if (typeof dwellMs !== "number" || dwellMs < READ_DWELL_FLOOR_MS) continue;
    out.push(signal("communication_tone", tone as PersonalModelValue, Math.min(1, dwellMs / READ_DWELL_STRONG_MS), ev));
  }
  return out;
}

/**
 * `question_format_mix` — I.4: "a question format with a high
 * `QUESTION_STARTED`-without-`QUESTION_ATTEMPTED` rate ⇒ negative signal for
 * that format." Positive signal on completion + correctness, negative on
 * abandonment. Emits one single-format weight vector per observation; the
 * aggregator (below) is what sums these into a distribution.
 */
export function extractQuestionFormatSignals(events: readonly PersonalModelSourceEvent[]): PersonalModelSignal[] {
  const out: PersonalModelSignal[] = [];
  const attemptedIds = new Set(
    events.filter((e) => e.event_type === "QUESTION_ATTEMPTED").map((e) => e.payload.question_id),
  );
  for (const ev of events) {
    const format = ev.payload.format;
    if (!(QUESTION_FORMATS as readonly string[]).includes(format as string)) continue;

    if (ev.event_type === "QUESTION_STARTED") {
      const abandoned = !attemptedIds.has(ev.payload.question_id);
      if (abandoned) out.push(signal("question_format_mix", { [format as QuestionFormat]: -0.5 }, 0.4, ev));
      continue;
    }
    if (ev.event_type === "QUESTION_CORRECT") {
      out.push(signal("question_format_mix", { [format as QuestionFormat]: 1 }, 0.8, ev));
    } else if (ev.event_type === "QUESTION_WRONG") {
      out.push(signal("question_format_mix", { [format as QuestionFormat]: 0.2 }, 0.3, ev));
    }
  }
  return out;
}

/**
 * `difficulty_preference` — I.4: "abandon rate by depth." `PRACTICE_COMPLETED`
 * carries `item_count`/`correct_count`; a low completion ratio at a given
 * depth is a negative signal for that depth's implied preference, a high one
 * positive.
 */
export function extractDifficultyPreferenceSignals(events: readonly PersonalModelSourceEvent[]): PersonalModelSignal[] {
  const out: PersonalModelSignal[] = [];
  for (const ev of events) {
    if (ev.event_type !== "PRACTICE_COMPLETED") continue;
    const depth = ev.payload.depth;
    const itemCount = ev.payload.item_count;
    const correctCount = ev.payload.correct_count;
    if (typeof itemCount !== "number" || itemCount <= 0 || typeof correctCount !== "number") continue;
    const ratio = correctCount / itemCount;
    const pref: (typeof DIFFICULTY_PREFERENCES)[number] =
      depth === "transfer" || depth === "application" ? "stretch" : "gentle";
    if (ratio >= 0.5) {
      out.push(signal("difficulty_preference", ratio >= 0.85 && pref === "stretch" ? "stretch" : "matched", Math.min(1, ratio), ev));
    } else {
      out.push(signal("difficulty_preference", "gentle", 1 - ratio, ev));
    }
  }
  return out;
}

/**
 * `session_length` — I.4: "observed session durations." Derived from a
 * closing session event's `payload.duration_minutes` (set by the session
 * engine, M9) — the extractor never computes a duration itself, because
 * `StudySession.closed_at - opened_at` is E's job, not I's.
 */
export function extractSessionLengthSignals(events: readonly PersonalModelSourceEvent[]): PersonalModelSignal[] {
  const out: PersonalModelSignal[] = [];
  for (const ev of events) {
    if (ev.event_type !== "SESSION_VERIFIED" && ev.event_type !== "SESSION_CLOSED_UNVERIFIED") continue;
    const minutes = ev.payload.duration_minutes;
    if (typeof minutes !== "number" || minutes <= 0) continue;
    out.push(signal("session_length", minutes, ev.event_type === "SESSION_VERIFIED" ? 0.7 : 0.4, ev));
  }
  return out;
}

/**
 * `working_window` — I.2: "`received_at` distribution of `E`-class events"
 * (the session-lifecycle events). One-hot on `received_at`'s UTC hour; the
 * aggregator sums these into the 24-length distribution. Server time is used
 * deliberately (R.10) — a claimed local hour is exactly the kind of
 * client-supplied fact D.1.b warns is forgeable, so this dimension reads the
 * clock the record already trusts.
 */
export function extractWorkingWindowSignals(events: readonly PersonalModelSourceEvent[]): PersonalModelSignal[] {
  const out: PersonalModelSignal[] = [];
  for (const ev of events) {
    if (ev.event_type !== "SESSION_STARTED" && ev.event_type !== "QUESTION_ATTEMPTED") continue;
    const hour = new Date(ev.received_at).getUTCHours();
    if (Number.isNaN(hour)) continue;
    const dist = new Array(24).fill(0);
    dist[hour] = 1;
    out.push(signal("working_window", dist, 0.5, ev));
  }
  return out;
}

/**
 * `correction_method` — I.4's own worked example: "a `MISTAKE_RESOLVED`
 * whose proof attempts were preceded by `correction_method = drill` ⇒
 * positive signal for drill." `payload.correction_method` is set by whichever
 * remediation surface the student used before the resolving attempts.
 */
export function extractCorrectionMethodSignals(events: readonly PersonalModelSourceEvent[]): PersonalModelSignal[] {
  const out: PersonalModelSignal[] = [];
  for (const ev of events) {
    if (ev.event_type !== "MISTAKE_RESOLVED") continue;
    const method = ev.payload.correction_method;
    if (!(CORRECTION_METHODS as readonly string[]).includes(method as string)) continue;
    out.push(signal("correction_method", method as PersonalModelValue, 0.9, ev));
  }
  return out;
}

/**
 * `notification_appetite` — I.2: "open/action rate." `RECOMMENDATION_ACTED_ON`
 * is a positive vote for the CURRENT appetite continuing to work;
 * `RECOMMENDATION_DISMISSED` with `payload.reason === 'too_many'` is a
 * negative vote for it.
 */
export function extractNotificationAppetiteSignals(events: readonly PersonalModelSourceEvent[]): PersonalModelSignal[] {
  const out: PersonalModelSignal[] = [];
  for (const ev of events) {
    if (ev.event_type === "RECOMMENDATION_ACTED_ON") {
      out.push(signal("notification_appetite", "standard", 0.5, ev));
    } else if (ev.event_type === "RECOMMENDATION_DISMISSED" && ev.payload.reason === "too_many") {
      out.push(signal("notification_appetite", "minimal", 0.8, ev));
    }
  }
  return out;
}

/**
 * `recommendation_aggressiveness` — I.2: "dismissal rate." A high dismissal
 * rate is a negative vote (pull back); acting on a recommendation is a
 * positive vote (keep pace, or push).
 */
export function extractRecommendationAggressivenessSignals(
  events: readonly PersonalModelSourceEvent[],
): PersonalModelSignal[] {
  const out: PersonalModelSignal[] = [];
  for (const ev of events) {
    if (ev.event_type === "RECOMMENDATION_ACTED_ON") {
      out.push(signal("recommendation_aggressiveness", "medium", 0.4, ev));
    } else if (ev.event_type === "RECOMMENDATION_DISMISSED") {
      out.push(signal("recommendation_aggressiveness", "low", 0.6, ev));
    }
  }
  return out;
}

const EXTRACTORS: Record<
  PersonalModelDimension,
  (events: readonly PersonalModelSourceEvent[]) => PersonalModelSignal[]
> = {
  explanation_style: extractExplanationStyleSignals,
  communication_tone: extractCommunicationToneSignals,
  question_format_mix: extractQuestionFormatSignals,
  difficulty_preference: extractDifficultyPreferenceSignals,
  session_length: extractSessionLengthSignals,
  working_window: extractWorkingWindowSignals,
  correction_method: extractCorrectionMethodSignals,
  notification_appetite: extractNotificationAppetiteSignals,
  recommendation_aggressiveness: extractRecommendationAggressivenessSignals,
};

/** Runs every extractor over one event window. The single entry point the
 *  extraction job (`lib/personal-model-aggregator.ts`, server-side) calls. */
export function extractAllSignals(events: readonly PersonalModelSourceEvent[]): PersonalModelSignal[] {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  return PERSONAL_MODEL_DIMENSIONS.flatMap((d) => EXTRACTORS[d](sorted));
}

// ═══════════════════════════════════════════════════════════════════════════
// I.5 — CONFIDENCE, EVIDENCE, RECENCY, DECAY, FLOOR
// ═══════════════════════════════════════════════════════════════════════════

/** Capacity guess, labelled as one (same posture as 015's partition count and
 *  `RESOLUTION_COOLING_DAYS`): how many agreeing signals before evidence
 *  volume alone stops adding confidence. */
export const EVIDENCE_SATURATION = 20;

/** I.5: "Decay is applied at read time... `HALF_LIFE`." A tuning constant, in
 *  days. Chosen so a dimension untouched for a month has visibly softened
 *  but not vanished — the honest middle between "never forgets" and
 *  "forgets a warm signal overnight." */
export const CONFIDENCE_HALF_LIFE_DAYS = 30;

/** I.5: "Below `CONFIDENCE_FLOOR`, an inference is not used at all." */
export const CONFIDENCE_FLOOR = 0.15;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Groups signals by their observed value's identity — categorical values
 *  compare by value, `question_format_mix`/`working_window` (object/array
 *  values) are summed rather than "agreed on", so they take a separate path
 *  in `aggregateDimension`. */
function isCategorical(dimension: PersonalModelDimension): boolean {
  return dimension !== "question_format_mix" && dimension !== "working_window" && dimension !== "session_length";
}

export interface AggregatedDimension {
  dimension: PersonalModelDimension;
  inferred_value: PersonalModelValue;
  /** I.5 — "not a probability; it is a disclosure." Computed AS OF the
   *  aggregation run (`nowMs`); staleness since then is `decayedConfidence`'s
   *  job, not this one's, so the two never double-count the same elapsed time. */
  confidence: number;
  evidence_count: number;
  last_signal_at: string; // ISO
}

/**
 * I.3's aggregator: `PersonalModelSignal[] → PersonalModel.inferred_value`
 * (one dimension at a time — the caller groups signals by dimension first,
 * e.g. via `groupSignalsByDimension`).
 *
 * `confidence = f(evidence_count, agreement_among_signals, recency)` (I.5),
 * where "recency" here means: signals close to `nowMs` are weighted more
 * heavily when computing which value has the most support, exactly as a
 * fresher signal should outvote a stale one AT AGGREGATION TIME. The separate
 * read-time formula in `decayedConfidence` below handles staleness that
 * accrues AFTER this run — the two never measure the same elapsed interval.
 */
export function aggregateDimension(
  dimension: PersonalModelDimension,
  signals: readonly PersonalModelSignal[],
  nowMs: number,
): AggregatedDimension | null {
  if (signals.length === 0) return null;

  const weighted = signals.map((s) => {
    const ageDays = Math.max(0, (nowMs - Date.parse(s.observed_at)) / MS_PER_DAY);
    const recencyWeight = Math.pow(0.5, ageDays / CONFIDENCE_HALF_LIFE_DAYS);
    return { ...s, effectiveWeight: s.weight * recencyWeight };
  });

  const lastSignalAt = signals.reduce((max, s) => (s.observed_at > max ? s.observed_at : max), signals[0].observed_at);
  const evidenceCount = signals.length;
  const evidenceFactor = Math.min(1, evidenceCount / EVIDENCE_SATURATION);

  if (isCategorical(dimension)) {
    const totals = new Map<string, number>();
    for (const w of weighted) {
      const key = JSON.stringify(w.observed_value);
      totals.set(key, (totals.get(key) ?? 0) + w.effectiveWeight);
    }
    let bestKey = "";
    let bestWeight = -Infinity;
    let totalWeight = 0;
    for (const [key, weight] of totals) {
      totalWeight += weight;
      if (weight > bestWeight) {
        bestWeight = weight;
        bestKey = key;
      }
    }
    const agreement = totalWeight > 0 ? bestWeight / totalWeight : 0;
    const confidence = Math.round((evidenceFactor * 0.5 + agreement * 0.5) * 1000) / 1000;
    return {
      dimension,
      inferred_value: JSON.parse(bestKey) as PersonalModelValue,
      confidence,
      evidence_count: evidenceCount,
      last_signal_at: lastSignalAt,
    };
  }

  if (dimension === "session_length") {
    let sumW = 0;
    let sumWV = 0;
    for (const w of weighted) {
      const v = w.observed_value as number;
      sumW += w.effectiveWeight;
      sumWV += v * w.effectiveWeight;
    }
    const mean = sumW > 0 ? sumWV / sumW : 0;
    let variance = 0;
    for (const w of weighted) {
      const v = w.observed_value as number;
      variance += w.effectiveWeight * Math.pow(v - mean, 2);
    }
    variance = sumW > 0 ? variance / sumW : 0;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    const agreement = Math.max(0, 1 - Math.min(1, cv));
    const confidence = Math.round((evidenceFactor * 0.5 + agreement * 0.5) * 1000) / 1000;
    return {
      dimension,
      inferred_value: Math.round(mean),
      confidence,
      evidence_count: evidenceCount,
      last_signal_at: lastSignalAt,
    };
  }

  // `question_format_mix` and `working_window` — vector-valued dimensions.
  // Summed weighted, then normalised to a 0..1 distribution.
  const isHourDist = dimension === "working_window";
  const sums: Record<string, number> = isHourDist ? Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i, 0])) : {};
  for (const w of weighted) {
    if (isHourDist) {
      const arr = w.observed_value as HourDistribution;
      arr.forEach((v, i) => {
        sums[i] = (sums[i] ?? 0) + v * w.effectiveWeight;
      });
    } else {
      const obj = w.observed_value as FormatWeights;
      for (const [k, v] of Object.entries(obj)) {
        sums[k] = (sums[k] ?? 0) + (v ?? 0) * w.effectiveWeight;
      }
    }
  }
  const total = Object.values(sums).reduce((a, b) => a + Math.max(0, b), 0);
  const normalised: Record<string, number> =
    total > 0
      ? Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, Math.max(0, v) / total]))
      : sums;
  const peak = Math.max(0, ...Object.values(normalised));
  const agreement = peak; // how concentrated the distribution is
  const confidence = Math.round((evidenceFactor * 0.5 + agreement * 0.5) * 1000) / 1000;
  const inferredValue = (isHourDist
    ? Array.from({ length: 24 }, (_, i) => normalised[i] ?? 0)
    : normalised) as PersonalModelValue;
  return {
    dimension,
    inferred_value: inferredValue,
    confidence,
    evidence_count: evidenceCount,
    last_signal_at: lastSignalAt,
  };
}

/** I.5's decay formula, verbatim: `confidence · 0.5^(days_since_last_signal /
 *  HALF_LIFE)`. Applied at read time, never by rewriting the stored row —
 *  signals and the aggregate are never destroyed by ageing. */
export function decayedConfidence(confidence: number, lastSignalAtIso: string, nowMs: number): number {
  const days = Math.max(0, (nowMs - Date.parse(lastSignalAtIso)) / MS_PER_DAY);
  return Math.round(confidence * Math.pow(0.5, days / CONFIDENCE_HALF_LIFE_DAYS) * 1000) / 1000;
}

// ═══════════════════════════════════════════════════════════════════════════
// I.6 — THE EFFECTIVE VALUE, AND THE DISCLOSED FALLBACK
//
// Mechanism 2 of I.6: "Resolution is a generated column... there is no code
// path that computes the effective value differently, because there is no
// code path that computes it at all." The database's GENERATED ALWAYS column
// (031's migration) is the one that actually runs in production; this
// function exists so the SAME rule is checkable in a unit test without a
// database, and so `lib/personal-model-aggregator.ts` and any UI can preview
// it before a row is written.
// ═══════════════════════════════════════════════════════════════════════════

export type EffectiveValueSource = "explicit" | "inferred" | "default";

export interface EffectiveValueResult {
  value: PersonalModelValue | null;
  source: EffectiveValueSource;
  /** Present only when `source !== "explicit"` and the confidence is what
   *  DECIDED the fallback — V.5.6/V.5.7: "the fallback is stated, never
   *  silent." A UI surfacing this dimension MUST render this string when
   *  present, verbatim or paraphrased; it must never render `inferred_value`
   *  silently once decayed confidence has fallen below the floor. */
  disclosure: string | null;
  decayed_confidence: number | null;
}

export interface EffectiveValueInput {
  dimension: PersonalModelDimension;
  explicit_value: PersonalModelValue | null;
  inferred_value: PersonalModelValue | null;
  confidence: number | null;
  last_signal_at: string | null;
  default_value: PersonalModelValue | null;
  nowMs: number;
}

/** I.6 mechanism 2 + I.5's floor, as a pure, database-independent check. */
export function resolveEffectiveValue(input: EffectiveValueInput): EffectiveValueResult {
  if (input.explicit_value !== null && input.explicit_value !== undefined) {
    return { value: input.explicit_value, source: "explicit", disclosure: null, decayed_confidence: null };
  }

  if (
    input.inferred_value !== null &&
    input.inferred_value !== undefined &&
    input.confidence !== null &&
    input.last_signal_at !== null
  ) {
    const dc = decayedConfidence(input.confidence, input.last_signal_at, input.nowMs);
    if (dc >= CONFIDENCE_FLOOR) {
      return { value: input.inferred_value, source: "inferred", disclosure: null, decayed_confidence: dc };
    }
    // I.5: "Below CONFIDENCE_FLOOR, an inference is not used at all. The
    // system falls back to the product default and says so."
    return {
      value: input.default_value,
      source: "default",
      disclosure:
        `Not enough recent signal for ${input.dimension.replace(/_/g, " ")} ` +
        `(confidence ${dc.toFixed(2)} has decayed below the usable threshold) — ` +
        `using the product default instead of guessing.`,
      decayed_confidence: dc,
    };
  }

  return {
    value: input.default_value,
    source: "default",
    disclosure:
      input.default_value === null
        ? null
        : `No signal yet for ${input.dimension.replace(/_/g, " ")} — using the product default.`,
    decayed_confidence: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// M19-4 / V.5.5 — EXPLICIT VALUE, RESTORED EXACTLY BY L1 REPLAY
//
// I.6 mechanism 3 + 4: "Setting is an event... Replaying the stream restores
// explicit choices exactly" and "there is no 'the system re-learned it'
// path." This function IS the replay: given every `PREFERENCE_SET` event for
// one student, in `seq` order (never client `occurred_at` — R.10), it
// reconstructs `explicit_value` and `overridden_at` bit-for-bit.
// ═══════════════════════════════════════════════════════════════════════════

export interface PreferenceSetEvent {
  event_id: string;
  seq: number;
  received_at: string;
  payload: { dimension: string; value: PersonalModelValue | null };
}

export interface ReplayedExplicitValue {
  dimension: PersonalModelDimension;
  explicit_value: PersonalModelValue | null;
  overridden_at: string | null;
  source_event_id: string;
}

/**
 * Replays a student's full `PREFERENCE_SET` history and returns the CURRENT
 * `explicit_value` per dimension — the same value L2's `personal_model` row
 * held before any truncation, because both are computed by "last write, in
 * `seq` order, wins" over the identical L1 rows. `value: null` is a legal,
 * intentional clear (I.6 mechanism 4) and is preserved as `null`, not
 * dropped.
 */
export function replayExplicitValues(
  events: readonly PreferenceSetEvent[],
): ReadonlyMap<PersonalModelDimension, ReplayedExplicitValue> {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  const out = new Map<PersonalModelDimension, ReplayedExplicitValue>();
  for (const ev of sorted) {
    const dim = ev.payload.dimension;
    if (!isPersonalModelDimension(dim)) continue; // I.2 — an out-of-set dimension was never legal to write
    out.set(dim, {
      dimension: dim,
      explicit_value: ev.payload.value ?? null,
      overridden_at: ev.received_at,
      source_event_id: ev.event_id,
    });
  }
  return out;
}
