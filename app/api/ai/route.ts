import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPromptSpec, type ToolValues } from "@/lib/tools/prompts";
import { getStudentProfile, buildProfileContext } from "@/lib/ai/profile-context";
import { callAIText, callAIJson, AIError } from "@/lib/ai/client";
import { checkRateLimit, recordInvocation } from "@/lib/ai/rate-limit";
import { getMistakes, getSyllabus } from "@/lib/study/queries";
import type { AiResult } from "@/lib/ai/types";

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
      values[field.key] = typeof v === "string" ? v.slice(0, MAX_STRING_LEN).trim() : "";
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

async function buildCrunchDataContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  subjectFilter: string,
): Promise<string> {
  const scope = subjectFilter && subjectFilter !== "All subjects" ? subjectFilter : null;
  const [mistakes, syllabus] = await Promise.all([
    getMistakes(supabase, userId, { onlyOpen: true }),
    getSyllabus(supabase, userId),
  ]);
  const scopedMistakes = scope ? mistakes.filter((m) => m.subject === scope) : mistakes;
  const scopedUncovered = (scope ? syllabus.filter((t) => t.subject === scope) : syllabus).filter(
    (t) => !t.covered,
  );

  const counts = new Map<string, number>();
  for (const m of scopedMistakes) {
    const key = `${m.subject} · ${m.topic}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const lines: string[] = [];
  if (counts.size > 0) {
    lines.push("Open mistakes (subject · topic, times logged):");
    for (const [key, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${key} (${n}x)`);
    }
  }
  if (scopedUncovered.length > 0) {
    lines.push("Uncovered syllabus topics (subject · topic):");
    for (const t of scopedUncovered) lines.push(`- ${t.subject} · ${t.topic}`);
  }
  return lines.length > 0 ? lines.join("\n") : "No open mistakes or uncovered syllabus topics logged.";
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

  const rateLimit = await checkRateLimit(supabase, user.id);
  if (!rateLimit.allowed) return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  await recordInvocation(supabase, user.id, tool);

  const profile = await getStudentProfile(supabase, user.id);
  const profileCtx = buildProfileContext(profile);

  const dataContext = spec.usesStudentData
    ? await buildCrunchDataContext(supabase, user.id, String(values.subject ?? ""))
    : undefined;

  const { system, user: userText } = spec.buildPrompt(values, dataContext);
  const fullSystem = `${system}\n${profileCtx}`;

  try {
    let result: AiResult;
    if (spec.resultKind === "text") {
      const text = await callAIText({ system: fullSystem, userText, maxTokens: spec.maxTokens });
      result = { kind: "text", text };
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
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof AIError ? err.message : "Something went wrong. Try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
