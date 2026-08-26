"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Tactile — sound and haptics.
//
// Ported from Arc, which is the reference the founder actually likes. Every
// sound is synthesized through the Web Audio API rather than loaded as a
// file: zero network cost, zero licensing, and the timbre can be tuned per
// interaction instead of reusing one generic blip.
//
// The intent is a *mechanical* feel — the click of an OP-1 encoder, not a
// notification chime. A short filtered burst with a fast exponential decay
// reads as physical; a sine tone with a slow release reads as an alert, and
// alerts are what make people mute a site.
//
// Muted by default until the student's first gesture, because browsers block
// audio before interaction and an unrequested noise is worse than silence.
// ═══════════════════════════════════════════════════════════════════════════

let ctx: AudioContext | null = null;
let enabled = true;
let unlocked = false;

const PREF_KEY = "sl-sound";

function getCtx(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

/** A filtered burst: the building block of every mechanical sound here. */
function blip({
  freq = 1400, dur = 0.028, gain = 0.045, type = "square" as OscillatorType, detune = 0,
} = {}) {
  const c = getCtx();
  if (!c || !unlocked) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freq, t0);
  // The downward sweep is what separates a "click" from a "beep".
  osc.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.55, 40), t0 + dur);

  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  // A gentle low-pass keeps the square wave from sounding thin on laptop
  // speakers, where most of this will actually be heard.
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3200;

  osc.connect(filter).connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const Sound = {
  /** Called on the first real gesture — browsers require this before audio. */
  unlock() {
    if (unlocked) return;
    unlocked = true;
    const c = getCtx();
    if (c?.state === "suspended") c.resume().catch(() => {});
  },

  setEnabled(v: boolean) {
    enabled = v;
    try { localStorage.setItem(PREF_KEY, v ? "on" : "off"); } catch { /* private mode */ }
  },

  isEnabled() { return enabled; },

  load() {
    try {
      const v = localStorage.getItem(PREF_KEY);
      if (v) enabled = v === "on";
    } catch { /* keep default */ }
  },

  /** A generic press. Slight random detune so repeats do not sound looped. */
  tap()   { blip({ freq: 1500, dur: 0.024, gain: 0.035, detune: (Math.random() - 0.5) * 120 }); },
  /** The heavier press of a primary action. */
  press() { blip({ freq: 900,  dur: 0.038, gain: 0.05 }); },
  /** Ticking a task: two quick rising notes, the sound of a thing closing. */
  tick()  { blip({ freq: 1700, dur: 0.02, gain: 0.035 });
            setTimeout(() => blip({ freq: 2300, dur: 0.03, gain: 0.03 }), 42); },
  /** Untick: the same, reversed. */
  untick(){ blip({ freq: 2100, dur: 0.02, gain: 0.028 });
            setTimeout(() => blip({ freq: 1400, dur: 0.03, gain: 0.024 }), 42); },
  /** Something recorded successfully. */
  ok()    { blip({ freq: 880,  dur: 0.05, gain: 0.04, type: "triangle" });
            setTimeout(() => blip({ freq: 1320, dur: 0.07, gain: 0.035, type: "triangle" }), 70); },
  /** A refusal. Deliberately low and short — not a scold. */
  nope()  { blip({ freq: 320,  dur: 0.07, gain: 0.045, type: "sawtooth" }); },
  /** Passing over something interactive. Very quiet by design; at this
   *  volume it registers as texture rather than as a sound. */
  hover() { blip({ freq: 2600, dur: 0.012, gain: 0.012, type: "sine" }); },
};

/** A short vibration where the device supports it. Silent no-op on desktop. */
export function haptic(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}

/** Both at once — what most interactions actually want. */
export function feedback(kind: "tap" | "press" | "tick" | "untick" | "ok" | "nope" = "tap") {
  Sound[kind]();
  haptic(kind === "press" || kind === "ok" ? 12 : 6);
}
