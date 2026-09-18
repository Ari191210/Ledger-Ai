import { describe, expect, it } from "vitest";
import { describeFailure } from "./client";

/**
 * What a student is told when the AI does not answer.
 *
 * On 2026-09-17 every AI tool in production was failing, and the message on
 * screen was "The AI request failed. Try again in a moment." The account had no
 * credit, so retrying could not work at any point that day. The wording matters
 * more than it looks: a failed call is recorded before the model is called, so
 * every retry a student makes on that advice spends one of their requests for
 * the day and returns the same thing.
 */

/** The shape the Anthropic SDK throws, as far as this function reads it. */
const apiError = (status: number, message: string, errorCode?: string) => ({
  status,
  error: { error: { message, ...(errorCode ? { details: { error_code: errorCode } } : {}) } },
});

describe("describeFailure", () => {
  it("does not tell a student to retry an unfunded account", () => {
    // The live error, verbatim.
    const msg = describeFailure(
      apiError(400, "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."),
    );
    expect(msg).toMatch(/paused/i);
    // It may mention retrying, as long as it says not to. What it must never do
    // is ask for one.
    expect(msg).toMatch(/won't help/i);
    expect(msg).not.toMatch(/try again/i);
  });

  it("still catches the two spend caps it always did", () => {
    expect(describeFailure(apiError(429, "capped", "enforced_spend_limit_reached"))).toMatch(/paused/i);
    expect(describeFailure(apiError(400, "You have reached your specified API usage limits"))).toMatch(/paused/i);
  });

  it("does not tell a student to retry a request that is wrong before it is sent", () => {
    // A retired model is the one to expect: MODEL is a constant in client.ts, so
    // every retry sends the same string, fails the same way, and spends one more
    // of the student's daily requests. Same lie as the billing case, one status
    // code along.
    for (const status of [404, 400, 422]) {
      const msg = describeFailure(apiError(status, "model: claude-sonnet-5 not found"));
      expect(msg).toMatch(/won't help/i);
      expect(msg).not.toMatch(/try again/i);
    }
  });

  it("tells a student to shorten it, rather than apologising, when it was too long", () => {
    // The one failure in this family they can act on. Reachable from the essay
    // grader and the notes tool, which take the longest inputs, and where "this
    // is on our side" would be both wrong and useless.
    expect(describeFailure(apiError(413, "request too large"))).toMatch(/shorten/i);
    expect(describeFailure(apiError(400, "prompt is too long: 250000 tokens"))).toMatch(/shorten/i);
  });

  it("says wait, not paused, when the model is merely busy", () => {
    // 429 without the spend code is real congestion, where retrying is the
    // right advice and telling someone it is paused would be a lie.
    const msg = describeFailure(apiError(429, "overloaded"));
    expect(msg).toMatch(/wait a minute/i);
    expect(msg).not.toMatch(/paused/i);
  });

  it("names a misconfiguration as ours", () => {
    expect(describeFailure(apiError(401, "invalid x-api-key"))).toMatch(/on our side/i);
    expect(describeFailure(apiError(403, "forbidden"))).toMatch(/on our side/i);
  });

  it("falls back without pretending to know the cause", () => {
    expect(describeFailure(new Error("socket hang up"))).toMatch(/try again/i);
  });
});
