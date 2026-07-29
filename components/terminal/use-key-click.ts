"use client";

// Key-click feedback for the desk's controls.
//
// Spread the returned handlers onto any button on this surface and it gains
// the two halves of a physical key: a bright click on press, a duller one on
// release. Pointer events rather than onClick, so the sound lands at the
// moment the finger moves rather than after the browser has resolved a click.
//
// Gated on prefers-reduced-motion. Sound is not motion, but the media query
// is the only standard signal a browser gives for "I do not want incidental
// feedback", and unsolicited audio on every press is exactly that. Users who
// have asked for calm get a silent surface.
//
// The AudioContext is created lazily inside lib/sounds on first play, which
// is always inside a user gesture here — so autoplay policy never blocks it.

import { useCallback, useEffect, useState } from "react";
import { sounds } from "@/lib/sounds";

export function useKeyClick() {
  const [quiet, setQuiet] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setQuiet(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const onPointerDown = useCallback(() => {
    if (!quiet) sounds.keyDown();
  }, [quiet]);

  const onPointerUp = useCallback(() => {
    if (!quiet) sounds.keyUp();
  }, [quiet]);

  // Keyboard activation never fires pointer events, so a keyboard user would
  // otherwise get a silent control that everyone else can hear.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (quiet || event.repeat) return;
      if (event.key === "Enter" || event.key === " ") sounds.keyDown();
    },
    [quiet],
  );

  const onKeyUp = useCallback(
    (event: React.KeyboardEvent) => {
      if (quiet) return;
      if (event.key === "Enter" || event.key === " ") sounds.keyUp();
    },
    [quiet],
  );

  return { onPointerDown, onPointerUp, onKeyDown, onKeyUp };
}
