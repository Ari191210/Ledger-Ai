import { describe, expect, it } from "vitest";
import { confirmsDeletion } from "./delete-confirmation";

/**
 * Deleting an account cascades across all fourteen user tables and cannot be
 * undone. Until 2026-09-16 the only thing standing in front of it was a box in
 * the form asking you to type "delete"; the server action took no argument and
 * checked nothing, so anything that reached it once was enough.
 *
 * Both the form and the action now ask this function, so these cases are the
 * gate itself rather than a copy of it.
 */

describe("confirming an account deletion", () => {
  it("accepts the account's own address", () => {
    expect(confirmsDeletion("student@studyledger.test", "student@studyledger.test")).toBe(true);
  });

  it("forgives the shapes a real person types", () => {
    // Trailing space from a paste, and a capital from a phone keyboard, are not
    // hesitation. Refusing them teaches people to fight the form.
    expect(confirmsDeletion("  student@studyledger.test  ", "student@studyledger.test")).toBe(true);
    expect(confirmsDeletion("Student@StudyLedger.test", "student@studyledger.test")).toBe(true);
  });

  it("refuses the old magic word", () => {
    // "delete" is the same four letters for every account in the product, so it
    // proves intent to type, not intent to end this account.
    expect(confirmsDeletion("delete", "student@studyledger.test")).toBe(false);
  });

  it("refuses a different account's address", () => {
    expect(confirmsDeletion("someone@else.test", "student@studyledger.test")).toBe(false);
  });

  it("refuses nothing at all", () => {
    expect(confirmsDeletion("", "student@studyledger.test")).toBe(false);
    expect(confirmsDeletion("   ", "student@studyledger.test")).toBe(false);
  });

  it("never lets an account with no email delete on an empty box", () => {
    // The dangerous edge: if the comparison were a bare equality, an account
    // carrying no address would match an empty input and delete itself on a
    // single click.
    expect(confirmsDeletion("", "")).toBe(false);
    expect(confirmsDeletion("   ", "")).toBe(false);
  });

  it("does not trust a non-string that arrives from the wire", () => {
    // The action is a public endpoint. Its argument is whatever was posted.
    expect(confirmsDeletion(undefined as unknown as string, "student@studyledger.test")).toBe(false);
    expect(confirmsDeletion(null as unknown as string, "student@studyledger.test")).toBe(false);
    expect(confirmsDeletion({} as unknown as string, "student@studyledger.test")).toBe(false);
  });
});
