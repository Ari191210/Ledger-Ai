// Synthesized UI clicks, no audio assets. Low volume, ~55ms.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem("sl-sound") !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem("sl-sound", on ? "on" : "off");
  } catch {}
}

type Click = "tap" | "soft" | "nav" | "switch" | "done";

export function playClick(kind: Click = "tap"): void {
  if (!isSoundOn()) return;
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === "suspended") void c.resume();
    const t = c.currentTime;

    if (kind === "done") {
      // a phase complete: two clean ascending tones, not a beep
      for (const [i, freq] of [523, 784].entries()) {
        const delay = i * 0.1;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t + delay);
        gain.gain.setValueAtTime(0.0001, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.07, t + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.16);
        osc.connect(gain).connect(c.destination);
        osc.start(t + delay);
        osc.stop(t + delay + 0.18);
      }
      return;
    }

    if (kind === "switch") {
      // a physical toggle: two quick low thunks, not a beep
      for (const delay of [0, 0.045]) {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(delay === 0 ? 260 : 180, t + delay);
        osc.frequency.exponentialRampToValueAtTime(delay === 0 ? 140 : 90, t + delay + 0.03);
        gain.gain.setValueAtTime(0.0001, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.09, t + delay + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.05);
        osc.connect(gain).connect(c.destination);
        osc.start(t + delay);
        osc.stop(t + delay + 0.06);
      }
      return;
    }

    const from = kind === "nav" ? 1400 : kind === "soft" ? 700 : 1100;
    const to = kind === "nav" ? 620 : kind === "soft" ? 340 : 420;
    const peak = kind === "soft" ? 0.035 : 0.055;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + 0.03);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  } catch {}
}
