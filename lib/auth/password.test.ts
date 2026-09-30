import { describe, expect, it } from "vitest";
import { isBreachedPassword, passwordProblem } from "./password";

describe("passwordProblem", () => {
  it("needs ten characters", () => {
    expect(passwordProblem("short")).toMatch(/at least 10/);
    expect(passwordProblem("tencharsok")).toBeNull();
  });
  it("rejects one repeated character", () => {
    expect(passwordProblem("aaaaaaaaaaaa")).toMatch(/repeated/);
  });
  it("rejects a password built from the email's name", () => {
    expect(passwordProblem("aryamman2009!", "aryamman@example.com")).toMatch(/email/);
    expect(passwordProblem("correct horse battery", "aryamman@example.com")).toBeNull();
  });
  it("adds no composition rules", () => {
    expect(passwordProblem("all lowercase words here")).toBeNull();
  });
});

describe("isBreachedPassword", () => {
  // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
  const fake = (body: string, ok = true) =>
    (async (url: string) => {
      expect(url).toBe("https://api.pwnedpasswords.com/range/5BAA6");
      return { ok, text: async () => body } as Response;
    }) as unknown as typeof fetch;

  it("finds a breached password by its hash suffix, sending only the prefix", async () => {
    expect(await isBreachedPassword("password", fake("1E4C9B93F3F0682250B6CF8331B7EE68FD8:9659365\r\nAAAA:1"))).toBe(true);
  });
  it("ignores padding entries with a zero count", async () => {
    expect(await isBreachedPassword("password", fake("1E4C9B93F3F0682250B6CF8331B7EE68FD8:0"))).toBe(false);
  });
  it("fails open when the service is down", async () => {
    expect(await isBreachedPassword("password", fake("", false))).toBe(false);
    const boom = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect(await isBreachedPassword("password", boom)).toBe(false);
  });
});
