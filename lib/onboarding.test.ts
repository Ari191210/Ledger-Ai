import { describe, it, expect } from "vitest";
import { validateStudyProfile, validateOnboarding } from "./onboarding";

/**
 * The contract between a form and the validator it calls.
 *
 * This is the test that was missing. Settings shared onboarding's validator,
 * which demands a date of birth, and the Settings form does not collect one, so
 * every save failed with "Enter a real date of birth." beside a form with no
 * such field. Nobody could change their grade, board, stream or exam after
 * onboarding, and 167 passing tests said nothing, because no test asserted what
 * a caller actually sends.
 */

/** Exactly what components/settings/settings-form.tsx passes. */
const SETTINGS_PAYLOAD = { grade: "12", board: "cbse", stream: "pcm", target_exam: "jee" };

/** Exactly what components/onboard/onboard-form.tsx passes. */
const ONBOARD_PAYLOAD = { ...SETTINGS_PAYLOAD, date_of_birth: "2009-04-17" };

describe("validateStudyProfile, the Settings contract", () => {
  it("accepts what the Settings form actually sends", () => {
    const r = validateStudyProfile(SETTINGS_PAYLOAD);
    expect(r.ok, r.ok ? "" : r.error).toBe(true);
  });

  it("never returns a key Settings does not own", () => {
    const r = validateStudyProfile(SETTINGS_PAYLOAD);
    if (!r.ok) throw new Error(r.error);
    // A date_of_birth here would be written over the student's real one.
    expect(Object.keys(r.value).sort()).toEqual(["board", "grade", "stream", "target_exam"]);
  });

  it("still rejects a profile that is actually invalid", () => {
    expect(validateStudyProfile({ ...SETTINGS_PAYLOAD, grade: "" }).ok).toBe(false);
    expect(validateStudyProfile({ ...SETTINGS_PAYLOAD, board: "hogwarts" }).ok).toBe(false);
    expect(validateStudyProfile({ ...SETTINGS_PAYLOAD, target_exam: "" }).ok).toBe(false);
  });

  it("requires a stream only for the years that have one", () => {
    expect(validateStudyProfile({ ...SETTINGS_PAYLOAD, grade: "11", stream: "" }).ok).toBe(false);
    const junior = validateStudyProfile({ ...SETTINGS_PAYLOAD, grade: "9", stream: "" });
    expect(junior.ok).toBe(true);
    if (junior.ok) expect(junior.value.stream).toBeNull();
  });
});

describe("validateOnboarding, the onboarding contract", () => {
  it("accepts what the onboarding form actually sends", () => {
    const r = validateOnboarding(ONBOARD_PAYLOAD);
    expect(r.ok, r.ok ? "" : r.error).toBe(true);
  });

  it("still demands a real date of birth, which is its whole job", () => {
    expect(validateOnboarding(SETTINGS_PAYLOAD).ok).toBe(false);
    expect(validateOnboarding({ ...ONBOARD_PAYLOAD, date_of_birth: "2009-02-31" }).ok).toBe(false);
    expect(validateOnboarding({ ...ONBOARD_PAYLOAD, date_of_birth: "1800-01-01" }).ok).toBe(false);
  });

  it("carries the date of birth through on success", () => {
    const r = validateOnboarding(ONBOARD_PAYLOAD);
    if (!r.ok) throw new Error(r.error);
    expect(r.value.date_of_birth).toBe("2009-04-17");
  });
});
