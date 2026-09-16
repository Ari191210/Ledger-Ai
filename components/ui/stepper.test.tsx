import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Stepper } from "./stepper";

/**
 * The knob's tests exist because it produced three production bugs that a shape
 * assertion would never have caught. The same applies here, and the bugs a
 * press-and-hold control produces are all about time: a repeat that starts when
 * it should not, one that never stops, and one that keeps running after the key
 * it belongs to has gone dead under the finger.
 *
 * The sound is mocked per-file rather than relying on the global setup, because
 * that one is a plain no-op and cannot be asserted against.
 */
const playClick = vi.fn();
vi.mock("@/lib/sound", () => ({
  playClick: (kind?: string) => playClick(kind),
  isSoundOn: () => false,
  setSoundOn: () => {},
}));

function Harness({ start = 0, min = 0, max = 10 }: { start?: number; min?: number; max?: number }) {
  const [value, setValue] = useState(start);
  return (
    <Stepper
      value={value}
      min={min}
      max={max}
      onChange={setValue}
      label="what if"
      incrementLabel="one more topic"
      decrementLabel="one fewer topic"
    />
  );
}

const readout = () => screen.getByRole("spinbutton", { name: "what if" });
const plus = () => screen.getByRole("button", { name: "one more topic" });
const minus = () => screen.getByRole("button", { name: "one fewer topic" });

beforeEach(() => playClick.mockClear());

describe("Stepper", () => {
  it("is a spinbutton with two named keys", () => {
    render(<Harness />);
    expect(readout().getAttribute("aria-valuemin")).toBe("0");
    expect(readout().getAttribute("aria-valuemax")).toBe("10");
    expect(readout().getAttribute("aria-valuenow")).toBe("0");
    expect(plus()).toBeTruthy();
    expect(minus()).toBeTruthy();
  });

  it("steps one in each direction on a press", () => {
    render(<Harness />);
    fireEvent.pointerDown(plus());
    expect(readout().getAttribute("aria-valuenow")).toBe("1");
    fireEvent.pointerDown(minus());
    expect(readout().getAttribute("aria-valuenow")).toBe("0");
  });

  it("activates once from the pointer and once from the keyboard, never twice", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    // A full click is pointerdown then click. Stepping on both would double it,
    // which is why there is no onClick on the keys at all.
    await user.click(plus());
    expect(readout().getAttribute("aria-valuenow")).toBe("1");

    plus().focus();
    await user.keyboard("{Enter}");
    expect(readout().getAttribute("aria-valuenow")).toBe("2");
    await user.keyboard(" ");
    expect(readout().getAttribute("aria-valuenow")).toBe("3");
  });

  it("moves on the arrows and jumps to the stops on Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    readout().focus();
    await user.keyboard("{ArrowRight}{ArrowUp}");
    expect(readout().getAttribute("aria-valuenow")).toBe("2");
    await user.keyboard("{ArrowLeft}");
    expect(readout().getAttribute("aria-valuenow")).toBe("1");
    await user.keyboard("{End}");
    expect(readout().getAttribute("aria-valuenow")).toBe("10");
    await user.keyboard("{Home}");
    expect(readout().getAttribute("aria-valuenow")).toBe("0");
  });

  it("goes dead at each stop, silently", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(minus().hasAttribute("disabled")).toBe(true);

    readout().focus();
    await user.keyboard("{ArrowLeft}");
    expect(readout().getAttribute("aria-valuenow")).toBe("0");
    // A click with nothing behind it would teach the wrong thing about the stop.
    expect(playClick).not.toHaveBeenCalled();

    await user.keyboard("{End}");
    expect(plus().hasAttribute("disabled")).toBe(true);
  });

  it("says what the value means rather than the digit", () => {
    render(
      <Stepper
        value={3}
        max={10}
        onChange={() => {}}
        label="what if"
        valueText="cover 3 more topics, score 812, up 34"
        incrementLabel="one more topic"
        decrementLabel="one fewer topic"
      />,
    );
    expect(readout().getAttribute("aria-valuetext")).toBe("cover 3 more topics, score 812, up 34");
  });

  it("prints what it is told to print, not the raw number", () => {
    render(
      <Stepper
        value={3}
        max={10}
        onChange={() => {}}
        label="what if"
        display="+3"
        incrementLabel="one more topic"
        decrementLabel="one fewer topic"
      />,
    );
    expect(readout().textContent).toBe("+3");
  });

  it("is a key, not a pill", () => {
    render(<Harness />);
    // Square, cut at the small-control radius, and a real 44px target on touch.
    // cn() is a plain join, so a conflicting class would silently ride along.
    expect(plus().className).toMatch(/\brounded-sm\b/);
    expect(plus().className).not.toMatch(/\brounded-md\b/);
    expect(plus().className).toMatch(/\bh-11\b/);
    expect(plus().className).toMatch(/\bw-11\b/);
    expect(plus().className).not.toMatch(/\bpx-4\b/);
  });
});

describe("Stepper, held", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

  it("waits, then repeats, then accelerates", () => {
    render(<Harness max={30} />);
    fireEvent.pointerDown(plus());
    expect(readout().getAttribute("aria-valuenow")).toBe("1");

    advance(399);
    expect(readout().getAttribute("aria-valuenow")).toBe("1");
    advance(1);
    expect(readout().getAttribute("aria-valuenow")).toBe("2");
    advance(160);
    expect(readout().getAttribute("aria-valuenow")).toBe("3");
    advance(136);
    expect(readout().getAttribute("aria-valuenow")).toBe("4");
    advance(116);
    expect(readout().getAttribute("aria-valuenow")).toBe("5");
  });

  it("stops the moment the finger lifts", () => {
    render(<Harness max={30} />);
    fireEvent.pointerDown(plus());
    advance(600);
    const atRelease = readout().getAttribute("aria-valuenow");

    fireEvent.pointerUp(window);
    advance(2000);
    expect(readout().getAttribute("aria-valuenow")).toBe(atRelease);
  });

  it.each([
    ["pointercancel", () => fireEvent.pointerCancel(window)],
    ["the pointer leaving the key", () => fireEvent.pointerLeave(plus())],
    ["losing focus", () => fireEvent.blur(plus())],
  ])("stops on %s", (_name, end) => {
    render(<Harness max={30} />);
    fireEvent.pointerDown(plus());
    advance(600);
    const atEnd = readout().getAttribute("aria-valuenow");

    act(() => void end());
    advance(2000);
    expect(readout().getAttribute("aria-valuenow")).toBe(atEnd);
  });

  it("does not strand the repeat when the key dies under the finger", () => {
    // The trap: buttonClasses sets disabled:pointer-events-none, so a key that
    // reaches the ceiling mid-hold can never receive its own pointerup.
    render(<Harness start={8} max={10} />);
    fireEvent.pointerDown(plus());
    advance(2000);

    expect(readout().getAttribute("aria-valuenow")).toBe("10");
    expect(plus().hasAttribute("disabled")).toBe(true);
    // Not merely idle: nothing is still scheduled. A stranded timer would sit
    // here counting for the life of the page.
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.pointerUp(window);
    advance(2000);
    expect(readout().getAttribute("aria-valuenow")).toBe("10");
  });

  it("clicks on the press, then ticks quietly rather than machine-gunning", () => {
    render(<Harness max={30} />);
    fireEvent.pointerDown(plus());
    expect(playClick.mock.calls).toEqual([["switch"]]);

    // Four repeats in, one soft tick. Every step clicking would be sixteen a
    // second at the floor, which is a buzz rather than a key.
    advance(400 + 160 + 136 + 116);
    expect(playClick.mock.calls).toEqual([["switch"], ["soft"]]);
  });

  it("leaves no timer behind when it unmounts mid-hold", () => {
    const { unmount } = render(<Harness max={30} />);
    fireEvent.pointerDown(plus());
    advance(500);
    expect(() => {
      unmount();
      vi.advanceTimersByTime(2000);
    }).not.toThrow();
  });
});
