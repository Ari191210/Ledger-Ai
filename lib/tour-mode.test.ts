import { describe, expect, it } from "vitest";
import { tourMode } from "./tour-mode";

describe("tourMode", () => {
  it("makes the tour mandatory for a brand new student", () => {
    expect(tourMode({ requested: false, seen: false, hasLogged: false })).toEqual({ autoStart: true, mandatory: true });
  });

  it("never traps a returning student with a record in the first-run tour", () => {
    expect(tourMode({ requested: false, seen: false, hasLogged: true })).toEqual({ autoStart: true, mandatory: false });
  });

  it("stays quiet once seen, and replays closable when asked for", () => {
    expect(tourMode({ requested: false, seen: true, hasLogged: false })).toEqual({ autoStart: false, mandatory: false });
    expect(tourMode({ requested: true, seen: true, hasLogged: true })).toEqual({ autoStart: true, mandatory: false });
  });
});
