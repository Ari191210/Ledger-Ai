"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Tactile provider.
//
// Installs the delegated click sound for the whole OS surface, so every
// button, link and checkbox is covered without wiring each one — including
// controls added later.
//
// Also renders the mute control. Sound on a website is a strong choice and
// the toggle has to be findable, or the only available response is closing
// the tab. The preference persists.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { Sound } from "@/lib/os/tactile";
import { useTactileClicks } from "@/lib/os/motion";

export function TactileProvider() {
  const [on, setOn] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Sound.load();
    setOn(Sound.isEnabled());
    setReady(true);
  }, []);

  useTactileClicks(on);

  function toggle() {
    const next = !on;
    setOn(next);
    Sound.setEnabled(next);
    // Confirm audibly when switching on — proving it works is more useful
    // than a label claiming it does.
    if (next) { Sound.unlock(); Sound.ok(); }
  }

  // Rendered only after the stored preference is read, so the icon never
  // flips from on to off a moment after load.
  if (!ready) return null;

  return (
    <button
      onClick={toggle}
      className="os-sound-toggle"
      aria-label={on ? "Mute interface sounds" : "Unmute interface sounds"}
      title={on ? "Sound on" : "Sound off"}
      data-on={on}
    >
      <span aria-hidden="true" className="os-sound-bars">
        <i /><i /><i />
      </span>
    </button>
  );
}
