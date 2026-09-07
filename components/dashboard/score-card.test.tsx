import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScoreCard } from "./score-card";
import { computeScore, type ScoreInputs } from "@/lib/score/compute";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

/**
 * The score card renders a projection. The rule it has to keep is that a score
 * a student has not earned can never be mistaken for one they have, and that is
 * a claim about what the panel says, not about what shape it returns.
 */
const inputs: ScoreInputs = {
  pyqTotal: 40,
  pyqCorrect: 30,
  syllabusTotal: 20,
  syllabusCovered: 8,
  mistakesEverLogged: 12,
  mistakesRecent7d: 3,
  streakDays: 5,
};
const score = computeScore(inputs);

describe("ScoreCard", () => {
  it("opens on the real score, unmarked", () => {
    render(<ScoreCard score={score} inputs={inputs} />);
    // "projected" is always mounted and hidden by opacity, so presence is not
    // the test: it must be marked hidden from assistive technology at rest.
    const chip = screen.getByText("projected");
    expect(chip.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText(`/${score.max}`)).toBeTruthy();
  });

  it("announces the score to a screen reader", () => {
    render(<ScoreCard score={score} inputs={inputs} />);
    // The ring is an aria-hidden svg; without a label on its wrapper the number
    // the whole product is built around is announced to nobody.
    const ring = screen.getByRole("img", { name: /ledger score/i });
    expect(ring.getAttribute("aria-label")).toContain(String(score.total));
    expect(ring.getAttribute("aria-label")).toContain(score.tier);
  });

  it("marks the panel projected the moment the dial leaves zero", async () => {
    const user = userEvent.setup();
    render(<ScoreCard score={score} inputs={inputs} />);
    const dial = screen.getByRole("slider", { name: /what if/i });
    dial.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByText("projected").getAttribute("aria-hidden")).not.toBe("true");
    // And the ring says so too, not just the chip.
    expect(
      screen.getByRole("img", { name: /projected ledger score/i }),
    ).toBeTruthy();
  });

  it("never shows a projected total below the real one", async () => {
    const user = userEvent.setup();
    render(<ScoreCard score={score} inputs={inputs} />);
    const dial = screen.getByRole("slider", { name: /what if/i });
    dial.focus();
    for (let i = 0; i < 5; i++) await user.keyboard("{ArrowRight}");

    const aria = screen.getByRole("img", { name: /projected/i }).getAttribute("aria-label")!;
    const projected = Number(aria.match(/score (\d+)/)![1]);
    expect(projected).toBeGreaterThanOrEqual(score.total);
  });

  it("says what turning the dial would take, not just a number", async () => {
    const user = userEvent.setup();
    render(<ScoreCard score={score} inputs={inputs} />);
    const dial = screen.getByRole("slider", { name: /what if/i });
    dial.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");

    // "slider, 2" tells a blind student nothing. The value text has to carry
    // the action and the consequence.
    const text = dial.getAttribute("aria-valuetext")!;
    expect(text).toMatch(/cover|get|study/i);
    expect(text).toMatch(/score \d+/);
  });

  it("resets the amount when the lever changes", async () => {
    const user = userEvent.setup();
    render(<ScoreCard score={score} inputs={inputs} />);
    const dial = screen.getByRole("slider", { name: /what if/i });
    dial.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(dial.getAttribute("aria-valuenow")).toBe("2");

    await user.click(screen.getByRole("button", { name: "streak" }));
    // A "+2" carried across would answer a question the student stopped asking.
    const after = screen.getByRole("slider", { name: /what if/i });
    expect(after.getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByText("projected").getAttribute("aria-hidden")).toBe("true");
  });

  it("colours only the pillar the dial actually moved", async () => {
    const user = userEvent.setup();
    render(<ScoreCard score={score} inputs={inputs} />);
    const dial = screen.getByRole("slider", { name: /what if/i });
    dial.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");

    // One accent per panel is the house rule; lighting all four bars was the
    // exact fault this card was fixed for once already.
    const bars = screen.getAllByRole("progressbar");
    const lit = bars.filter((b) => b.querySelector(".bg-accent-strong") !== null);
    expect(lit.length).toBe(1);
    expect(lit[0].getAttribute("aria-label")).toMatch(/coverage/i);
  });
});
