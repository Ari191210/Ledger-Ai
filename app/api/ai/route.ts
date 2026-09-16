import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPromptSpec, type ToolValues } from "@/lib/tools/prompts";
import { buildLedgerContext } from "@/lib/ai/ledger-context";
import { getStudentProfile, buildProfileContext } from "@/lib/ai/profile-context";
import { callAIText, callAIJson, AIError } from "@/lib/ai/client";
import { checkRateLimit, recordInvocation } from "@/lib/ai/rate-limit";
import { summariseAdvice, resolveTopic, recordAdvice } from "@/lib/ai/advice";
import type { AiResult } from "@/lib/ai/types";
import { parseScene } from "@/lib/scenes/registry";
import { fenceStudentText, stripFenceMarkers, FENCE_RULE } from "@/lib/ai/fence";

export const maxDuration = 60;

const MAX_STRING_LEN = 6000;

function sanitiseValues(spec: ReturnType<typeof getPromptSpec>, raw: unknown): ToolValues {
  const values: ToolValues = {};
  if (!spec || typeof raw !== "object" || raw === null) return values;
  const input = raw as Record<string, unknown>;
  for (const field of spec.fields) {
    const v = input[field.key];
    if (field.type === "number") {
      const n = typeof v === "number" ? v : Number(v);
      values[field.key] = Number.isFinite(n) ? Math.min(field.max, Math.max(field.min, n)) : field.default;
    } else if (field.type === "select") {
      const s = typeof v === "string" ? v : "";
      values[field.key] = field.options.includes(s) ? s : field.options[0];
    } else {
      // Fenced here rather than in each buildPrompt, because this is the one
      // place every tool's input has to pass through. A prompt builder that
      // forgets to fence is a silent hole; there is nothing to forget if the
      // value is already fenced by the time it arrives.
      //
      // Only text and textarea. Selects are checked against their options and
      // numbers are clamped, so both are already constrained, and both are
      // read by system prompts and by logic ("exactly ${count} questions"),
      // which markers around them would break.
      const clean = typeof v === "string" ? v.slice(0, MAX_STRING_LEN).trim() : "";
      values[field.key] = clean ? fenceStudentText(clean) : "";
    }
  }
  return values;
}

function missingRequired(spec: ReturnType<typeof getPromptSpec>, values: ToolValues): string | null {
  if (!spec) return "Unknown tool.";
  for (const field of spec.fields) {
    if ("required" in field && field.required && !String(values[field.key] ?? "").trim()) {
      return `${field.label} is required.`;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const tool = typeof body?.tool === "string" ? body.tool : "";
  const spec = getPromptSpec(tool);
  if (!spec) return NextResponse.json({ error: "Unknown tool." }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const values = sanitiseValues(spec, body?.values);
  const missing = missingRequired(spec, values);
  if (missing) return NextResponse.json({ error: missing }, { status: 400 });

  // Record BEFORE checking. Checking first and recording after leaves a window
  // where twenty parallel requests all read a count of zero and all pass. This
  // way every racer is counted, so all of them see the same high count and all
  // but the ones within the limit are rejected. The cost is a row for a request
  // that never ran, which is the right trade against an uncapped model call.
  //
  // The whole scheme rests on that insert having landed. If it fails while the
  // counting queries below still succeed, this caller is never counted and the
  // cap is short by one for every such failure. Refuse instead: it is the same
  // fail-closed argument the limiter itself already makes, and an uncounted
  // model call is exactly what the cap exists to prevent.
  const recorded = await recordInvocation(supabase, user.id, tool);
  if (!recorded.recorded) {
    return NextResponse.json(
      { error: "Couldn't start that request. Try again in a moment." },
      { status: 503 },
    );
  }
  const rateLimit = await checkRateLimit(supabase, user.id);
  if (!rateLimit.allowed) return NextResponse.json({ error: rateLimit.message }, { status: 429 });

  const profile = await getStudentProfile(supabase, user.id);
  const profileCtx = buildProfileContext(profile);

  const ledger = spec.usesStudentData
    ? await buildLedgerContext(supabase, user.id, String(values.subject ?? ""))
    : undefined;
  // The ledger is the quieter half of the same problem. Mistake topics and
  // syllabus entries are free text the student typed, stored by an honest
  // feature and pasted into the system message later, so a topic named "ignore
  // all previous instructions" arrives with the authority of the prompt unless
  // it is fenced like anything else they wrote.
  const dataContext = ledger ? fenceStudentText(ledger.text) : undefined;

  const { system, user: userText } = spec.buildPrompt(values, dataContext);

  // Most tools opt in with `usesStudentData: true` and nothing else: the ledger
  // is appended here so enabling it never means rewriting a prompt builder. A
  // few (Crunch) weave the data into their user message because the prompt
  // refers to it directly, so skip those rather than sending it twice.
  const alreadyInPrompt =
    !!dataContext && (system.includes(dataContext) || userText.includes(dataContext));
  // FENCE_RULE goes last, after the tool's own instructions and after the data,
  // so it is the final word on how to read everything above it. Profile context
  // is grade, board, stream and target exam, all chosen from fixed lists at
  // onboarding, so it needs no fence; the marker strip is there only so a value
  // that somehow arrived by another route cannot forge one.
  const fullSystem = [
    system,
    profileCtx ? stripFenceMarkers(profileCtx) : "",
    alreadyInPrompt ? "" : (dataContext ?? ""),
    FENCE_RULE,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    let result: AiResult;
    if (spec.resultKind === "text") {
      const text = await callAIText({ system: fullSystem, userText, maxTokens: spec.maxTokens });
      result = { kind: "text", text };
    } else if (spec.resultKind === "explain") {
      // Prose plus an optional diagram. parseScene is the gate: an unknown
      // scene name, a missing parameter or a hostile string all come back as
      // null and the student simply gets the answer without a picture.
      const parsed = await callAIJson<{ text?: string; scene?: unknown }>({
        system: fullSystem,
        userText,
        maxTokens: spec.maxTokens,
      });
      const scene = parseScene(parsed.scene);
      result = { kind: "text", text: parsed.text ?? "", ...(scene ? { scene } : {}) };
    } else if (spec.resultKind === "list") {
      const parsed = await callAIJson<{ items: { title: string; body: string }[] }>({
        system: fullSystem,
        userText,
        maxTokens: spec.maxTokens,
      });
      result = { kind: "list", items: parsed.items ?? [] };
    } else if (spec.resultKind === "qa") {
      const parsed = await callAIJson<{
        items: { question: string; answer: string; explanation?: string }[];
      }>({ system: fullSystem, userText, maxTokens: spec.maxTokens });
      result = { kind: "qa", items: parsed.items ?? [] };
    } else {
      const parsed = await callAIJson<{
        overall: number;
        max: number;
        summary: string;
        criteria: { label: string; score: number; max: number; feedback: string }[];
      }>({ system: fullSystem, userText, maxTokens: spec.maxTokens });
      result = {
        kind: "score",
        overall: parsed.overall ?? 0,
        max: parsed.max ?? 0,
        summary: parsed.summary ?? "",
        criteria: parsed.criteria ?? [],
      };
    }
    // Record what was advised, on the success path only: advice that was never
    // produced is not advice. Awaited rather than fired and forgotten, because
    // work started after the response is returned is not reliably finished on
    // serverless. One indexed insert is the honest price of the feature.
    const headline = summariseAdvice(result);
    if (headline && ledger) {
      await recordAdvice(supabase, user.id, {
        tool,
        subject: values.subject ? String(values.subject) : null,
        topic: resolveTopic(
          typeof values.topic === "string" ? values.topic : null,
          headline,
          ledger.knownTopics,
        ),
        headline,
      });
    }

    // remaining already accounts for this call, because the invocation is
    // recorded before the count is taken.
    return NextResponse.json({ result, remaining: rateLimit.remaining });
  } catch (err) {
    const message = err instanceof AIError ? err.message : "Something went wrong. Try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
