import { describe, expect, it } from "vitest";
import { mfaRedirect, owesSecondFactor } from "./mfa";

describe("owesSecondFactor", () => {
  it("only when two-factor is on and the session is still at aal1", () => {
    expect(owesSecondFactor("aal1", "aal2")).toBe(true);
    expect(owesSecondFactor("aal2", "aal2")).toBe(false);
    expect(owesSecondFactor("aal1", "aal1")).toBe(false); // two-factor not turned on
  });
});

describe("mfaRedirect", () => {
  it("sends a half-signed-in student to the code page, keeping where they were going", () => {
    expect(mfaRedirect("/dashboard", "aal1", "aal2")).toBe("/auth/mfa?next=%2Fdashboard");
    expect(mfaRedirect("/tools/focus", "aal1", "aal2")).toBe("/auth/mfa?next=%2Ftools%2Ffocus");
  });
  it("guards the APIs too", () => {
    expect(mfaRedirect("/api/export", "aal1", "aal2")).not.toBeNull();
  });
  it("never loops on the code page or blocks the auth routes", () => {
    expect(mfaRedirect("/auth/mfa", "aal1", "aal2")).toBeNull();
    expect(mfaRedirect("/auth/signout", "aal1", "aal2")).toBeNull();
  });
  it("leaves public pages alone", () => {
    expect(mfaRedirect("/", "aal1", "aal2")).toBeNull();
    expect(mfaRedirect("/privacy", "aal1", "aal2")).toBeNull();
  });
  it("lets fully proven sessions and students without two-factor through", () => {
    expect(mfaRedirect("/dashboard", "aal2", "aal2")).toBeNull();
    expect(mfaRedirect("/dashboard", "aal1", "aal1")).toBeNull();
  });
});
