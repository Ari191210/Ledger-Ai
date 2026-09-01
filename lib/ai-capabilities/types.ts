// ═══════════════════════════════════════════════════════════════════════════
// M15-3 — WHAT A CAPABILITY IS.
//
// EXECUTION_PLAN M15-3: *"Break the 86-arm switch into per-capability modules
// driven by the manifest."*
// Architecture Q.2: *"Each is a named **capability** with typed input and
// output schemas, replacing the 86-arm switch."*
//
// The template is M8's `lib/capture-extraction.ts` and M10's
// `lib/assessment-generation.ts`: a capability declares its own contract —
// what it needs, what it says, what it is allowed to return, which model runs
// it — and the transport (`app/api/ai/route.ts`) does nothing but look the
// capability up and honour that contract. No branch in the route knows the name
// of any capability, which is what makes a 87th one a data change rather than a
// code change.
//
// This module is PURE. No Anthropic client, no Supabase client, no clock, no
// `next/*` import — so every guarantee below is provable with nothing live in
// reach (U.3).
// ═══════════════════════════════════════════════════════════════════════════

/** The request body, minus `tool`, after the route's size caps have run. */
export type CapabilityParams = Record<string, unknown>;

/** What one capability says to the model. */
export interface CapabilityPromptResult {
  system: string;
  userText: string;
}

export type CapabilityPrompt = (params: CapabilityParams) => CapabilityPromptResult;

// ── Output contracts (M15-4) ───────────────────────────────────────────────

/** The JSON kinds a declared top-level field may take. */
export type OutputFieldKind = "string" | "number" | "boolean" | "array" | "object" | "null";

/**
 * A capability's output contract.
 *
 * `keys` is READ OFF THE PROMPT, never invented: each arm tells the model
 * *"respond with exactly this JSON shape"* and then prints the shape, so the
 * shape the model is asked for and the shape the server insists on are the same
 * text. `null` means the prompt does not fix one top-level shape — the output
 * must still be a JSON object, there is simply no key list to check, which is
 * honest rather than a schema somebody guessed.
 *
 * There is no "optional key" arm and no "coerce" arm. M15-4 is *"reject, never
 * degrade"*: a field that is missing is missing.
 */
export interface OutputContract {
  readonly keys: Readonly<Record<string, OutputFieldKind>> | null;
}

// ── The capability itself ──────────────────────────────────────────────────

export interface CapabilityModule {
  /** The name the client sends as `tool`, and the name in the manifest. */
  readonly name: string;
  /**
   * Bumped when the prompt or the output contract changes. Written to
   * `ai_invocations.prompt_version` (M15-6) for exactly the reason M10's
   * `GENERATION_PROMPT_VERSION` exists: F.4.b's revocation path needs to find
   * every output produced under one version, and today's `ai_history` cannot,
   * because it stores output and no version at all.
   */
  readonly promptVersion: string;
  /** The model this capability runs on. Configuration, never a literal in the
   *  dispatch path (M15-5). */
  readonly model: string;
  /** Output ceiling. The pre-restructure route derived this from a 24-name
   *  `LARGE_TOOLS` list; the values are unchanged, they are simply declared by
   *  the capability that needs them instead of by a list the capability cannot
   *  see. */
  readonly maxTokens: number;
  readonly output: OutputContract;
  readonly prompt: CapabilityPrompt;
}
