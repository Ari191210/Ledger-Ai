/**
 * LEGACY MISTAKE MIGRATION — v1
 *
 * One-time, idempotent, resumable migration of the `ledger-mistakes`
 * localStorage record into a versioned, explicitly-legacy form.
 *
 * WHAT THIS DOES NOT DO, AND WHY
 *
 * It does not create Occurrences. It cannot: `occurrences.evidence_id` and
 * `occurrences.concept_id` are both NOT NULL, legacy rows carry no evidence
 * (they predate capture entirely), and the `concepts` taxonomy is unseeded.
 * Writing them would mean fabricating the proof that PRODUCT_PRINCIPLES §3.2
 * exists to require, and inventing taxonomy rows into what §4.2 calls a
 * hand-built durable asset.
 *
 * So legacy rows are PRESERVED and MARKED, never promoted. Promotion happens
 * later, per record, only when real evidence exists.
 *
 * This mirrors the convention `lib/ledger-score-v2.ts` already ships: records
 * predating the recovery system are marked explicitly rather than assumed.
 *
 * The core is pure — it takes a value and a timestamp and returns a new value
 * plus a report. `runLegacyMigration()` is the only part that touches storage.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS — one path, one version, one marker
// ═══════════════════════════════════════════════════════════════════════════

export const MIGRATION_VERSION = 1;

/** The record being migrated. Unchanged — this is a migration, not a move. */
export const LEGACY_KEY = 'ledger-mistakes';

/** The completion marker. Written only after verification passes. */
export const MARKER_KEY = 'ledger-mistakes-migration';

/** Rollback copy. Removed only after verification passes. */
export const BACKUP_KEY = 'ledger-mistakes-backup-v0';

export const LEGACY_SOURCE = 'legacy-v0';

// ═══════════════════════════════════════════════════════════════════════════
// SHAPES
// ═══════════════════════════════════════════════════════════════════════════

/** What `exam-practice` wrote. Every field optional — real data is ragged. */
export interface LegacyMistake {
  id?: unknown;
  date?: unknown;
  subject?: unknown;
  topic?: unknown;
  category?: unknown;
  status?: unknown;
  clearedDate?: unknown;
  [k: string]: unknown;
}

export type MigratedStatus = 'open' | 'acknowledged' | 'practising' | 'dormant' | 'resolved' | 'recurred';

export interface LegacyMetadata {
  version: number;
  source: typeof LEGACY_SOURCE;
  migratedAt: string;
  /** No evidence exists for this record. It predates capture (§3.2). */
  hasEvidence: false;
  /** Not yet an Occurrence. Needs a real concept and real evidence first. */
  promoted: false;
  /** The status as originally written. `null` means none was recorded. */
  legacyStatus: string | null;
  /** True when the record carried no usable timestamp. Never invented. */
  dateMissing: boolean;
  /** Anything we did not map, preserved verbatim so nothing is lost. */
  unmapped?: Record<string, unknown>;
}

export interface MigratedMistake {
  id: string;
  date: string;
  subject: string | null;
  topic: string | null;
  category: string | null;
  status: MigratedStatus;
  clearedDate?: string;
  legacy: LegacyMetadata;
}

export type LogLevel = 'migrated' | 'already-migrated' | 'repaired' | 'skipped';

export interface MigrationLogEntry {
  index: number;
  id: string | null;
  level: LogLevel;
  detail: string;
}

export interface MigrationReport {
  ok: boolean;
  version: number;
  startedAt: string;
  completedAt: string | null;
  total: number;
  migrated: number;
  alreadyMigrated: number;
  repaired: number;
  skipped: number;
  /** Must always be 0. A non-zero value fails verification. */
  dropped: number;
  log: MigrationLogEntry[];
  error?: string;
}

export interface MigrationResult {
  records: MigratedMistake[];
  report: MigrationReport;
}

/** Written to `MARKER_KEY` once, after verification. */
export interface MigrationMarker {
  version: number;
  completedAt: string;
  total: number;
  migrated: number;
  alreadyMigrated: number;
  skipped: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPPING — documented defaults only, never invention
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy status → current lifecycle status.
 *
 * `cleared` becomes `acknowledged`, NOT `resolved`. A legacy "cleared" was
 * self-reported, and PRODUCT_PRINCIPLES §3.1 is absolute: a student may say
 * "I've seen it", never "I've fixed it". Promoting an unproven self-report to
 * `resolved` would import the fluency illusion straight into the new record
 * and award score for it. The original claim is preserved in
 * `legacy.legacyStatus` so nothing is lost.
 *
 * A missing status becomes `open` — the honest default. `open` earns no score
 * either way, so this neither penalises nor rewards.
 */
const STATUS_MAP: Readonly<Record<string, MigratedStatus>> = Object.freeze({
  open: 'open',
  cleared: 'acknowledged',
});

const KNOWN_FIELDS = new Set(['id', 'date', 'subject', 'topic', 'category', 'status', 'clearedDate', 'legacy']);

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v : null;

/** Deterministic, so a re-run derives the same id and cannot duplicate. */
function stableHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function isMigrated(v: unknown): v is MigratedMistake {
  if (typeof v !== 'object' || v === null) return false;
  const legacy = (v as { legacy?: unknown }).legacy;
  if (typeof legacy !== 'object' || legacy === null) return false;
  return (legacy as { version?: unknown }).version === MIGRATION_VERSION;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE PURE CORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Migrate a parsed `ledger-mistakes` value.
 *
 * Idempotent: already-migrated records pass through untouched, so running this
 * twice produces exactly the same array and never duplicates.
 *
 * Resumable: because the decision is per record, a half-migrated array simply
 * continues from where it stopped.
 */
export function migrateLegacyMistakes(raw: unknown, now: string): MigrationResult {
  const startedAt = now;
  const log: MigrationLogEntry[] = [];
  const base: MigrationReport = {
    ok: false, version: MIGRATION_VERSION, startedAt, completedAt: null,
    total: 0, migrated: 0, alreadyMigrated: 0, repaired: 0, skipped: 0, dropped: 0, log,
  };

  if (raw === null || raw === undefined) {
    return { records: [], report: { ...base, ok: true, completedAt: now } };
  }

  if (!Array.isArray(raw)) {
    return {
      records: [],
      report: { ...base, ok: false, error: `expected an array, received ${typeof raw}` },
    };
  }

  const records: MigratedMistake[] = [];
  let migrated = 0, alreadyMigrated = 0, repaired = 0, skipped = 0;
  const seenIds = new Set<string>();

  raw.forEach((entry, index) => {
    if (isMigrated(entry)) {
      // Already done. Never rewrite — that is what makes this idempotent.
      if (seenIds.has(entry.id)) {
        skipped += 1;
        log.push({ index, id: entry.id, level: 'skipped', detail: 'duplicate id already present' });
        return;
      }
      seenIds.add(entry.id);
      records.push(entry);
      alreadyMigrated += 1;
      log.push({ index, id: entry.id, level: 'already-migrated', detail: `version ${MIGRATION_VERSION}` });
      return;
    }

    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      skipped += 1;
      log.push({ index, id: null, level: 'skipped', detail: `unusable entry of type ${typeof entry}` });
      return;
    }

    const legacyRow = entry as LegacyMistake;
    const notes: string[] = [];

    const dateRaw = str(legacyRow.date);
    const dateMissing = dateRaw === null;
    if (dateMissing) notes.push('no timestamp recorded');

    const id = str(legacyRow.id) ?? `legacy-${index}-${stableHash(JSON.stringify(legacyRow))}`;
    if (str(legacyRow.id) === null) notes.push('id derived deterministically');

    const legacyStatus = str(legacyRow.status);
    const status = legacyStatus !== null ? (STATUS_MAP[legacyStatus] ?? 'open') : 'open';
    if (legacyStatus !== null && STATUS_MAP[legacyStatus] === undefined) {
      notes.push(`unrecognised status '${legacyStatus}' defaulted to open`);
    }
    if (legacyStatus === 'cleared') {
      notes.push('cleared mapped to acknowledged — a self-report is not proof (§3.1)');
    }

    const unmapped: Record<string, unknown> = {};
    for (const key of Object.keys(legacyRow)) {
      if (!KNOWN_FIELDS.has(key)) unmapped[key] = legacyRow[key];
    }

    const metadata: LegacyMetadata = {
      version: MIGRATION_VERSION,
      source: LEGACY_SOURCE,
      migratedAt: now,
      hasEvidence: false,
      promoted: false,
      legacyStatus,
      dateMissing,
    };
    if (Object.keys(unmapped).length > 0) metadata.unmapped = unmapped;

    const record: MigratedMistake = {
      id,
      date: dateRaw ?? '',
      subject: str(legacyRow.subject),
      topic: str(legacyRow.topic),
      category: str(legacyRow.category),
      status,
      legacy: metadata,
    };
    const clearedDate = str(legacyRow.clearedDate);
    if (clearedDate !== null) record.clearedDate = clearedDate;

    if (seenIds.has(record.id)) {
      skipped += 1;
      log.push({ index, id: record.id, level: 'skipped', detail: 'duplicate id' });
      return;
    }
    seenIds.add(record.id);
    records.push(record);

    if (notes.length > 0) {
      repaired += 1;
      log.push({ index, id: record.id, level: 'repaired', detail: notes.join('; ') });
    } else {
      log.push({ index, id: record.id, level: 'migrated', detail: 'clean' });
    }
    migrated += 1;
  });

  const report: MigrationReport = {
    ...base,
    ok: true,
    completedAt: now,
    total: raw.length,
    migrated,
    alreadyMigrated,
    repaired,
    skipped,
    dropped: 0,
  };

  return { records, report };
}

/**
 * Independent check that the migration lost nothing.
 *
 * Deliberately re-derives its answer from the inputs rather than trusting the
 * report — a verification that trusts the thing it verifies is not one.
 */
export function verifyMigration(raw: unknown, result: MigrationResult): { ok: boolean; error?: string } {
  const { records, report } = result;

  if (!report.ok) return { ok: false, error: report.error ?? 'migration reported failure' };

  const inputCount = Array.isArray(raw) ? raw.length : 0;
  const accounted = records.length + report.skipped;
  if (accounted !== inputCount) {
    return { ok: false, error: `record loss: ${inputCount} in, ${accounted} accounted for` };
  }

  const ids = new Set<string>();
  for (const r of records) {
    if (typeof r.id !== 'string' || r.id.length === 0) return { ok: false, error: 'a record has no id' };
    if (ids.has(r.id)) return { ok: false, error: `duplicate id after migration: ${r.id}` };
    ids.add(r.id);

    if (r.legacy?.version !== MIGRATION_VERSION) return { ok: false, error: `record ${r.id} is unstamped` };
    if (r.legacy.hasEvidence !== false) return { ok: false, error: `record ${r.id} claims evidence it cannot have` };
    if (r.legacy.promoted !== false) return { ok: false, error: `record ${r.id} claims promotion` };
    if (r.status === 'resolved') return { ok: false, error: `record ${r.id} was promoted to resolved (§3.1)` };
  }

  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE STORAGE WRAPPER — the only impure part
// ═══════════════════════════════════════════════════════════════════════════

/** Minimal surface, so tests can drive this without a DOM. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RunOutcome {
  status: 'completed' | 'already-complete' | 'failed' | 'nothing-to-do';
  report: MigrationReport | null;
  marker: MigrationMarker | null;
  error?: string;
}

/**
 * Run the migration against a store.
 *
 * Order matters and is the rollback strategy:
 *   1. bail out if the marker says this version is already done
 *   2. back up the original
 *   3. migrate, then VERIFY
 *   4. write only on success; on failure restore from backup and stop
 *   5. remove the backup only after the marker is written
 */
export function runLegacyMigration(store: KeyValueStore, now: string): RunOutcome {
  // 1. Idempotency gate.
  const existingMarker = store.getItem(MARKER_KEY);
  if (existingMarker !== null) {
    try {
      const marker = JSON.parse(existingMarker) as MigrationMarker;
      if (marker?.version >= MIGRATION_VERSION) {
        return { status: 'already-complete', report: null, marker };
      }
    } catch {
      // A corrupt marker is treated as absent — re-running is safe by design.
    }
  }

  const rawText = store.getItem(LEGACY_KEY);
  if (rawText === null) {
    const marker: MigrationMarker = {
      version: MIGRATION_VERSION, completedAt: now,
      total: 0, migrated: 0, alreadyMigrated: 0, skipped: 0,
    };
    store.setItem(MARKER_KEY, JSON.stringify(marker));
    return { status: 'nothing-to-do', report: null, marker };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Corrupt JSON. Do not touch it, do not mark complete — a human should see
    // this rather than have it silently discarded.
    return {
      status: 'failed', report: null, marker: null,
      error: 'ledger-mistakes is not valid JSON; left untouched',
    };
  }

  // 2. Backup before any write. Resumable: an interrupted run leaves this in
  //    place, and the next run reads the (still original) legacy key.
  if (store.getItem(BACKUP_KEY) === null) {
    store.setItem(BACKUP_KEY, rawText);
  }

  // 3. Migrate and verify.
  const result = migrateLegacyMistakes(parsed, now);
  const verdict = verifyMigration(parsed, result);

  if (!verdict.ok) {
    // 4a. Rollback: restore the original and leave the backup for inspection.
    const backup = store.getItem(BACKUP_KEY);
    if (backup !== null) store.setItem(LEGACY_KEY, backup);
    return { status: 'failed', report: result.report, marker: null, error: verdict.error };
  }

  // 4b. Commit.
  store.setItem(LEGACY_KEY, JSON.stringify(result.records));

  const marker: MigrationMarker = {
    version: MIGRATION_VERSION,
    completedAt: now,
    total: result.report.total,
    migrated: result.report.migrated,
    alreadyMigrated: result.report.alreadyMigrated,
    skipped: result.report.skipped,
  };
  store.setItem(MARKER_KEY, JSON.stringify(marker));

  // 5. Verified and marked — the backup can go.
  store.removeItem(BACKUP_KEY);

  return { status: 'completed', report: result.report, marker };
}
