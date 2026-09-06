/**
 * These messages are only ever read when something has already failed, which
 * is exactly when nobody is watching. The one that matters is the spend cap:
 * saying "try again in a moment" about a limit that lasts until the month
 * turns is a lie, and it invites the retry storm the rate limiter prevents.
 */

import { describe, expect, it } from "vitest";
import { __describeFailureForTest as describeFailure } from "./client";

const apiError = (status: number, body: Record<string, unknown>) => ({ status, error: { error: body } });

describe("describeFailure", () => {
  it("tells the truth about the tier spend cap instead of asking for a retry", () => {
    const msg = describeFailure(
      apiError(429, {
        type: "rate_limit_error",
        message: "your organization has crossed its monthly API usage threshold",
        details: { error_code: "enforced_spend_limit_reached" },
      }),
    );
    expect(msg).toMatch(/won't help/);
    expect(msg).not.toMatch(/try again in a moment/i);
  });

  it("recognises a self-imposed spend limit, which arrives as a 400", () => {
    const msg = describeFailure(
      apiError(400, {
        type: "invalid_request_error",
        message: "You have reached your specified API usage limits.",
      }),
    );
    expect(msg).toMatch(/won't help/);
  });

  it("recognises the workspace variant of the same message", () => {
    const msg = describeFailure(
      apiError(400, {
        type: "invalid_request_error",
        message: "You have reached your specified workspace API usage limits.",
      }),
    );
    expect(msg).toMatch(/won't help/);
  });

  it("still asks for a retry on an ordinary rate limit, which is transient", () => {
    const msg = describeFailure(apiError(429, { type: "rate_limit_error", message: "rate limited" }));
    expect(msg).toMatch(/try again/i);
    expect(msg).not.toMatch(/won't help/);
  });

  it("does not blame the student for a bad API key", () => {
    expect(describeFailure(apiError(401, { type: "authentication_error" }))).toMatch(/on our side/);
  });

  it("falls back safely on a shape it has never seen", () => {
    expect(describeFailure(new Error("socket hang up"))).toMatch(/try again in a moment/i);
    expect(describeFailure(undefined)).toMatch(/try again in a moment/i);
    expect(describeFailure(null)).toMatch(/try again in a moment/i);
  });
});
