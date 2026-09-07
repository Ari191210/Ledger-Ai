import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom has no layout engine, so anything that measures or animates needs a
// stand-in. Without these the components under test throw before they render
// and the failure looks like a component bug rather than a missing browser API.

afterEach(cleanup);

if (!window.matchMedia) {
  // Several components ask about prefers-reduced-motion before animating.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 0) as unknown as number) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof window.cancelAnimationFrame;
}

// The knob measures its own box to turn a pointer position into an angle.
if (!Element.prototype.getBoundingClientRect.call(document.body).width) {
  Element.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, top: 0, left: 0, right: 76, bottom: 76, width: 76, height: 76, toJSON: () => ({}) };
  } as typeof Element.prototype.getBoundingClientRect;
}

Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

// The sound layer touches AudioContext on first click; tests never need audio.
vi.mock("@/lib/sound", () => ({
  playClick: () => {},
  isSoundOn: () => false,
  setSoundOn: () => {},
}));
