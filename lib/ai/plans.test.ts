/**
 * The plan decides how much a student gets, so getting it wrong in either
 * direction is expensive: too generous costs real money, too strict locks out
 * someone who paid. These are the cases where it could go wrong quietly.
 */

import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, limitsFor, planFromRow } from "./plans";

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

describe("planFromRow", () => {
  it("treats no subscription row as free, which is every student today", () => {
    expect(planFromRow(null)).toBe("free");
  });

  it("treats an unreadable or unexpected plan value as free, never as paid", () => {
    expect(planFromRow({ plan: "enterprise" })).toBe("free");
    expect(planFromRow({ plan: null })).toBe("free");
    expect(planFromRow({})).toBe("free");
  });

  it("honours an active paid plan", () => {
    expect(planFromRow({ plan: "pro", expires_at: inDays(30) })).toBe("pro");
  });

  it("honours a paid plan with no expiry set", () => {
    expect(planFromRow({ plan: "pro", expires_at: null })).toBe("pro");
  });

  it("downgrades a lapsed plan without needing a scheduled job", () => {
    expect(planFromRow({ plan: "pro", expires_at: inDays(-1) })).toBe("free");
  });
});

describe("plan limits", () => {
  it("keeps free meaningfully below pro, or the paid tier means nothing", () => {
    expect(PLAN_LIMITS.free.daily).toBeLessThan(PLAN_LIMITS.pro.daily);
    expect(PLAN_LIMITS.free.burst).toBeLessThanOrEqual(PLAN_LIMITS.pro.burst);
  });

  it("never lets a burst window exceed the whole day's allowance", () => {
    for (const [plan, limits] of Object.entries(PLAN_LIMITS)) {
      expect(limits.burst, plan).toBeLessThanOrEqual(limits.daily);
    }
  });

  it("resolves limits for every plan the type allows", () => {
    expect(limitsFor("free").daily).toBe(PLAN_LIMITS.free.daily);
    expect(limitsFor("pro").daily).toBe(PLAN_LIMITS.pro.daily);
  });
});
