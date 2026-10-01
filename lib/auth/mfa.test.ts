import { describe, expect, it } from "vitest";
import { cleanCode, maskEmail, mayOweCode, mfaRedirect, readClaims } from "./mfa";

const claims = (two_factor: string | undefined, methods: string[]) =>
  readClaims({
    session_id: "3f0c2a4e-1111-4222-8333-444455556666",
    app_metadata: two_factor ? { two_factor } : {},
    amr: methods.map((method) => ({ method, timestamp: 1 })),
  });

describe("mayOweCode", () => {
  it("only for a password sign-in of a student who turned it on", () => {
    expect(mayOweCode(claims("email", ["password"]))).toBe(true);
    expect(mayOweCode(claims(undefined, ["password"]))).toBe(false);
  });
  it("not after Google, an email link or a reset, which already proved the inbox", () => {
    for (const m of ["oauth", "otp", "magiclink", "recovery"]) {
      expect(mayOweCode(claims("email", [m]))).toBe(false);
    }
  });
  it("still asks for a sign-in method it has never heard of", () => {
    expect(mayOweCode(claims("email", ["something-new"]))).toBe(true);
    expect(mayOweCode(claims("email", []))).toBe(true);
  });
  it("reads missing or malformed claims as nothing turned on", () => {
    expect(readClaims(null)).toEqual({ sessionId: null, twoFactor: null, methods: [] });
    expect(mayOweCode(readClaims({ amr: "nope", app_metadata: null }))).toBe(false);
  });
});

describe("mfaRedirect", () => {
  it("sends a half-signed-in student to the code page, keeping where they were going", () => {
    expect(mfaRedirect("/dashboard", true)).toBe("/auth/mfa?next=%2Fdashboard");
    expect(mfaRedirect("/tools/focus", true)).toBe("/auth/mfa?next=%2Ftools%2Ffocus");
  });
  it("guards the APIs too", () => {
    expect(mfaRedirect("/api/export", true)).not.toBeNull();
  });
  it("never loops on the code page or blocks the auth routes that send and check codes", () => {
    expect(mfaRedirect("/auth/mfa", true)).toBeNull();
    expect(mfaRedirect("/auth/two-factor/send", true)).toBeNull();
    expect(mfaRedirect("/auth/signout", true)).toBeNull();
  });
  it("leaves public pages alone", () => {
    expect(mfaRedirect("/", true)).toBeNull();
    expect(mfaRedirect("/privacy", true)).toBeNull();
  });
  it("lets through a sign-in that owes nothing", () => {
    expect(mfaRedirect("/dashboard", false)).toBeNull();
  });
});

describe("helpers", () => {
  it("masks an address but keeps it recognisable", () => {
    expect(maskEmail("ojhaaryamman@gmail.com")).toBe("o••••••••n@gmail.com");
    expect(maskEmail("ab@x.in")).toBe("a•@x.in");
  });
  it("keeps six digits from a pasted code with spaces", () => {
    expect(cleanCode("123 456")).toBe("123456");
    expect(cleanCode(" 12-34-56-78 ")).toBe("123456");
  });
});
