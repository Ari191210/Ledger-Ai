import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Knob } from "./knob";

/**
 * The knob has produced three real bugs, all of which reached production and
 * none of which a shape assertion would have caught: half its sweep was
 * unreachable by drag, a drag that ended over it advanced one extra detent, and
 * it announced a raw index to a screen reader. These pin all three.
 */
function Harness({
  positions,
  sweep,
  valueText,
}: {
  positions: string[];
  sweep?: number;
  valueText?: string;
}) {
  const [v, setV] = useState(positions[0]);
  return (
    <Knob
      label="test dial"
      positions={positions}
      value={v}
      onChange={setV}
      sweep={sweep}
      valueText={valueText}
    />
  );
}

const NUMBERS = Array.from({ length: 11 }, (_, i) => String(i));

describe("Knob", () => {
  it("is a real slider, not a div that looks like one", () => {
    render(<Harness positions={NUMBERS} />);
    const dial = screen.getByRole("slider", { name: "test dial" });
    expect(dial.getAttribute("tabindex")).toBe("0");
    expect(dial.getAttribute("aria-valuemin")).toBe("0");
    expect(dial.getAttribute("aria-valuemax")).toBe("10");
    expect(dial.getAttribute("aria-valuenow")).toBe("0");
  });

  it("moves on arrows and jumps on Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness positions={NUMBERS} />);
    const dial = screen.getByRole("slider");
    dial.focus();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(dial.getAttribute("aria-valuenow")).toBe("2");
    await user.keyboard("{ArrowLeft}");
    expect(dial.getAttribute("aria-valuenow")).toBe("1");
    await user.keyboard("{End}");
    expect(dial.getAttribute("aria-valuenow")).toBe("10");
    await user.keyboard("{Home}");
    expect(dial.getAttribute("aria-valuenow")).toBe("0");
  });

  it("does not run past either stop", async () => {
    const user = userEvent.setup();
    render(<Harness positions={NUMBERS} />);
    const dial = screen.getByRole("slider");
    dial.focus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(dial.getAttribute("aria-valuenow")).toBe("0");
    await user.keyboard("{End}{ArrowRight}");
    expect(dial.getAttribute("aria-valuenow")).toBe("10");
  });

  it("advances one position on a tap", () => {
    render(<Harness positions={NUMBERS} />);
    const dial = screen.getByRole("slider");
    fireEvent.pointerDown(dial, { clientX: 38, clientY: 38 });
    fireEvent.pointerUp(dial);
    fireEvent.click(dial);
    expect(dial.getAttribute("aria-valuenow")).toBe("1");
  });

  it("does not advance an extra detent when a drag ends over it", () => {
    // The bug: click fires after pointerup, and the handler could not tell a
    // drag from a tap, so every drag overshot its target by one.
    render(<Harness positions={NUMBERS} sweep={280} />);
    const dial = screen.getByRole("slider");

    fireEvent.pointerDown(dial, { clientX: 38, clientY: 38 });
    // Drag to the right-hand side of the dial, then release over it.
    fireEvent.pointerMove(window, { clientX: 100, clientY: 38 });
    const afterDrag = dial.getAttribute("aria-valuenow");
    fireEvent.pointerUp(window);
    fireEvent.click(dial);

    expect(dial.getAttribute("aria-valuenow")).toBe(afterDrag);
  });

  it("says what its value means when given the words", async () => {
    const user = userEvent.setup();
    render(<Harness positions={NUMBERS} valueText="6 topics, score 728 projected" />);
    const dial = screen.getByRole("slider");
    dial.focus();
    await user.keyboard("{ArrowRight}");
    // Without this it announces "test dial, slider, 1". One what.
    expect(dial.getAttribute("aria-valuetext")).toBe("6 topics, score 728 projected");
  });

  it("falls back to the raw value when no words are given", () => {
    render(<Harness positions={["dark", "light"]} />);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("dark");
  });

  it("prints a scale for a short list and ticks for a long one", () => {
    const { unmount } = render(<Harness positions={["off", "on"]} />);
    expect(screen.getByText("off")).toBeTruthy();
    unmount();

    render(<Harness positions={NUMBERS} />);
    // Eleven printed numbers around a 76px dial would be a smear.
    expect(screen.queryByText("10")).toBeNull();
  });
});
