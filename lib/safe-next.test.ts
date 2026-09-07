import { describe, it, expect } from "vitest";
import { safeNext, DEFAULT_NEXT } from "./safe-next";

const ORIGIN = "https://studyledger.in";

describe("safeNext", () => {
  it("keeps an ordinary path, with its query and hash", () => {
    expect(safeNext("/dashboard", ORIGIN)).toBe("/dashboard");
    expect(safeNext("/tools/focus", ORIGIN)).toBe("/tools/focus");
    expect(safeNext("/score?tab=pillars#pyq", ORIGIN)).toBe("/score?tab=pillars#pyq");
  });

  it("refuses the two shapes that escape the origin", () => {
    // https://studyledger.in@evil.com -> host evil.com
    expect(safeNext("@evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
    // https://studyledger.in.evil.com -> attacker's subdomain
    expect(safeNext(".evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
  });

  it("refuses protocol-relative and absolute destinations", () => {
    expect(safeNext("//evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNext("///evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNext("https://evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNext("http://evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNext("//evil.com/dashboard", ORIGIN)).toBe(DEFAULT_NEXT);
  });

  it("refuses backslashes, which some clients treat as a separator", () => {
    expect(safeNext("/\\evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNext("\\\\evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
  });

  it("refuses other schemes", () => {
    expect(safeNext("javascript:alert(1)", ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNext("data:text/html,x", ORIGIN)).toBe(DEFAULT_NEXT);
  });

  it("falls back when nothing was asked for", () => {
    expect(safeNext(null, ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNext(undefined, ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNext("", ORIGIN)).toBe(DEFAULT_NEXT);
  });

  it("never returns anything that leaves this origin", () => {
    const hostile = [
      "@evil.com",
      ".evil.com",
      "//evil.com",
      "https://evil.com",
      "\\evil.com",
      "/\\/evil.com",
      "%2F%2Fevil.com",
      "/..//evil.com",
    ];
    for (const raw of hostile) {
      const out = safeNext(raw, ORIGIN);
      expect(new URL(out, ORIGIN).origin, raw).toBe(ORIGIN);
    }
  });
});
