// Synthesized UI clicks — no audio assets. Low volume, ~55ms.

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

type Click = "tap" | "soft" | "nav";

export function playClick(kind: Click = "tap"): void {
  if (!isSoundOn()) return;
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === "suspended") void c.resume();
    const t = c.currentTime;

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
