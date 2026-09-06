import { describe, expect, it } from "vitest";
import { summariseAdvice, resolveTopic } from "./advice";

describe("summariseAdvice", () => {
  it("keeps the headline items of a list", () => {
    expect(
      summariseAdvice({
        kind: "list",
        items: [
          { title: "Mole concept", body: "..." },
          { title: "Thermodynamics", body: "..." },
        ],
      }),
    ).toBe("Mole concept; Thermodynamics");
  });

  it("takes the first sentence of prose rather than the whole answer", () => {
    expect(
      summariseAdvice({ kind: "text", text: "Start with stoichiometry. Then move on to gases." }),
    ).toBe("Start with stoichiometry.");
  });

  it("does not store question sets, which are not advice to follow up on", () => {
    expect(summariseAdvice({ kind: "qa", items: [{ question: "q", answer: "a" }] })).toBeNull();
  });

  it("does not store a grade for one essay", () => {
    expect(
      summariseAdvice({ kind: "score", overall: 7, max: 10, summary: "Good", criteria: [] }),
    ).toBeNull();
  });

  it("returns null rather than an empty headline", () => {
    expect(summariseAdvice({ kind: "text", text: "   " })).toBeNull();
    expect(summariseAdvice({ kind: "list", items: [] })).toBeNull();
  });
});

describe("resolveTopic", () => {
  const known = ["Mole concept", "Mole", "Rotational motion", "Genetics"];

  it("trusts the form field when the tool asked for one", () => {
    expect(resolveTopic("Optics", "something else entirely", known)).toBe("Optics");
  });

  it("falls back to the student's own vocabulary when the form had no topic", () => {
    expect(resolveTopic(null, "Focus on Rotational motion first", known)).toBe("Rotational motion");
  });

  it("prefers the most specific match, not the first one", () => {
    expect(resolveTopic(null, "Revise the Mole concept", known)).toBe("Mole concept");
  });

  it("returns null rather than guessing a topic the student never wrote", () => {
    expect(resolveTopic(null, "Revise electrochemistry", known)).toBeNull();
    expect(resolveTopic("  ", "nothing matches", [])).toBeNull();
  });

  it("ignores very short vocabulary entries that would match anything", () => {
    expect(resolveTopic(null, "a plan for the pH of a solution", ["pH"])).toBeNull();
  });
});
