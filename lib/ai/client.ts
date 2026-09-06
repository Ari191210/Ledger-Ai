import Anthropic from "@anthropic-ai/sdk";
import { stripDashes, stripDashesDeep } from "./strip-dashes";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";

export class AIError extends Error {}

/**
 * Turns an Anthropic SDK failure into something true to tell a student.
 *
 * The distinction that matters is transient versus not. A spend limit, ours or
 * the tier's, lasts until we raise it or the month turns, so telling someone to
 * "try again in a moment" is false and invites the retry storm the rate limiter
 * exists to prevent. See the spend-limit responses documented at
 * platform.claude.com/docs/en/api/rate-limits: our own limit returns 400, the
 * tier cap returns 429 with error_code enforced_spend_limit_reached.
 */
function describeFailure(err: unknown): string {
  const status = (err as { status?: number })?.status;
  const body = (err as { error?: { error?: { message?: string; details?: { error_code?: string } } } })
    ?.error?.error;

  const spendCapped =
    body?.details?.error_code === "enforced_spend_limit_reached" ||
    (status === 400 && /reached your specified.*usage limits/i.test(body?.message ?? ""));

  if (spendCapped) {
    return "StudyLedger's AI is paused right now. This is on our side, not anything you did, and retrying won't help. Every other tool still works.";
  }
  if (status === 429) {
    return "The AI is busy right now. Wait a minute and try again.";
  }
  if (status === 401 || status === 403) {
    return "StudyLedger's AI is misconfigured right now. This is on our side, not anything you did.";
  }
  return "The AI request failed. Try again in a moment.";
}

/** The model can emit a leading "thinking" block before the actual answer
 *, content[0] is not reliably the text block, so find it explicitly. */
function firstText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "";
}

export { describeFailure as __describeFailureForTest };

/** One-shot call returning plain, dash-stripped prose. */
export async function callAIText(args: {
  system: string;
  userText: string;
  maxTokens?: number;
}): Promise<string> {
  let message;
  try {
    message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: args.maxTokens ?? 1400,
      system: args.system,
      messages: [{ role: "user", content: args.userText }],
      // These are one-shot answers, not problems that need visible chain of
      // thought, and thinking tokens otherwise eat unpredictably into
      // max_tokens and can truncate the actual answer.
      thinking: { type: "disabled" },
    });
  } catch (err) {
    console.error("[ai] Anthropic call failed:", err);
    throw new AIError(describeFailure(err));
  }
  const text = firstText(message);
  if (!text.trim()) throw new AIError("The AI returned an empty response.");
  return stripDashes(text.trim());
}

/**
 * One-shot call expecting a JSON object matching the caller's shape (no
 * schema enforcement library here, deliberately: on a bad parse we surface
 * a clear error rather than silently repairing or guessing).
 */
export async function callAIJson<T>(args: {
  system: string;
  userText: string;
  maxTokens?: number;
}): Promise<T> {
  const system = `${args.system}\n\nRespond with ONLY a single JSON object, no prose before or after it, no markdown code fence.`;
  let message;
  try {
    message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: args.maxTokens ?? 2200,
      system,
      messages: [{ role: "user", content: args.userText }],
      thinking: { type: "disabled" },
    });
  } catch (err) {
    console.error("[ai] Anthropic call failed:", err);
    throw new AIError(describeFailure(err));
  }
  const raw = firstText(message).trim();
  const jsonText = raw.startsWith("```")
    ? raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim()
    : raw;
  try {
    return stripDashesDeep(JSON.parse(jsonText)) as T;
  } catch {
    if (message.stop_reason === "max_tokens") {
      throw new AIError("The response was cut off, try a smaller request (fewer questions, shorter input).");
    }
    throw new AIError("The AI's response wasn't valid, try again.");
  }
}
