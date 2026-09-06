/**
 * The physics behind each scene, in closed form.
 *
 * None of this is a simulation. Every situation in the library has an exact
 * solution a student is expected to be able to write down, so the drawing is
 * that solution evaluated, not a numerical integration of it. A scene that
 * drifted from the formula in the textbook would be teaching the wrong thing
 * very convincingly.
 *
 * `frameAt` takes a phase in [0, 1] rather than a time in seconds so the dial
 * that scrubs it can be the same dial everywhere, whatever the scene's real
 * period happens to be.
 */

import { SCENES, type Scene } from "./registry";

export type Vec3 = [number, number, number];

export type Segment = {
  points: Vec3[];
  /** trace: the path taken. guide: structure (rod, slope, radius, axis). */
  kind: "trace" | "guide";
};

export type Arrow = { from: Vec3; to: Vec3; label: string };

export type Frame = {
  /** Where the moving body is right now. */
  body: Vec3;
  segments: Segment[];
  arrows: Arrow[];
  /** The numbers a student would be asked for, computed the way they would. */
  readouts: { label: string; value: string }[];
  /** Half-width of the world, so the camera can frame any scene the same way. */
  extent: number;
};

const TAU = Math.PI * 2;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Two significant-ish figures. A drawing that reports 8 decimals is lying
 *  about how well anyone knows the inputs. */
function num(n: number, unit = ""): string {
  const abs = Math.abs(n);
  const s = abs >= 100 ? n.toFixed(0) : abs >= 10 ? n.toFixed(1) : n.toFixed(2);
  return unit ? `${s} ${unit}` : s;
}

function param(scene: Scene, key: string): number {
  const spec = SCENES[scene.name].params as Record<string, { fallback: number }>;
  const v = scene.params[key];
  return Number.isFinite(v) ? v : spec[key].fallback;
}

function sample(n: number, f: (u: number) => Vec3): Vec3[] {
  return Array.from({ length: n + 1 }, (_, i) => f(i / n));
}

export function frameAt(scene: Scene, phase: number): Frame {
  const t = Math.min(1, Math.max(0, phase));

  switch (scene.name) {
    case "projectile": {
      const v0 = param(scene, "speed");
      const th = rad(param(scene, "angle"));
      const g = param(scene, "gravity");
      const flight = (2 * v0 * Math.sin(th)) / g;
      const range = v0 * Math.cos(th) * flight;
      const apex = (v0 * v0 * Math.sin(th) * Math.sin(th)) / (2 * g);
      const at = (u: number): Vec3 => {
        const s = u * flight;
        return [v0 * Math.cos(th) * s, v0 * Math.sin(th) * s - 0.5 * g * s * s, 0];
      };
      return {
        body: at(t),
        segments: [
          { points: sample(64, at), kind: "trace" },
          { points: [[0, 0, 0], [range, 0, 0]], kind: "guide" },
        ],
        arrows: [],
        readouts: [
          { label: "range", value: num(range, "m") },
          { label: "max height", value: num(apex, "m") },
          { label: "time of flight", value: num(flight, "s") },
        ],
        extent: Math.max(range, apex * 2) / 2 || 1,
      };
    }

    case "pendulum": {
      const L = param(scene, "length");
      const a0 = rad(param(scene, "amplitude"));
      const g = param(scene, "gravity");
      // Small-angle period, which is the one the syllabus gives.
      const period = TAU * Math.sqrt(L / g);
      const angle = a0 * Math.cos(TAU * t);
      const at = (u: number): Vec3 => {
        const a = a0 * Math.cos(TAU * u);
        return [L * Math.sin(a), -L * Math.cos(a), 0];
      };
      const bob = at(t);
      // Energy at the bottom, the standard exam quantity.
      const vMax = Math.sqrt(2 * g * L * (1 - Math.cos(a0)));
      return {
        body: bob,
        segments: [
          { points: sample(48, (u) => at(u * 0.5)), kind: "trace" },
          { points: [[0, 0, 0], bob], kind: "guide" },
        ],
        arrows: [],
        readouts: [
          { label: "period", value: num(period, "s") },
          { label: "speed at lowest point", value: num(vMax, "m/s") },
          { label: "angle now", value: num((angle * 180) / Math.PI, "deg") },
        ],
        extent: L * 1.2,
      };
    }

    case "circular": {
      const r = param(scene, "radius");
      const v = param(scene, "speed");
      const period = (TAU * r) / v;
      const ac = (v * v) / r;
      const a = TAU * t;
      const at = (u: number): Vec3 => [r * Math.cos(TAU * u), 0, r * Math.sin(TAU * u)];
      const pos = at(t);
      // Tangent and centripetal directions, drawn at a readable fraction of r.
      const tangent: Vec3 = [pos[0] - r * Math.sin(a) * 0.5, 0, pos[2] + r * Math.cos(a) * 0.5];
      const inward: Vec3 = [pos[0] * 0.55, 0, pos[2] * 0.55];
      return {
        body: pos,
        segments: [
          { points: sample(72, at), kind: "trace" },
          { points: [[0, 0, 0], pos], kind: "guide" },
        ],
        arrows: [
          { from: pos, to: tangent, label: "v" },
          { from: pos, to: inward, label: "a" },
        ],
        readouts: [
          { label: "centripetal acceleration", value: num(ac, "m/s²") },
          { label: "period", value: num(period, "s") },
          { label: "angular speed", value: num(v / r, "rad/s") },
        ],
        extent: r * 1.3,
      };
    }

    case "incline": {
      const th = rad(param(scene, "angle"));
      const mu = param(scene, "friction");
      const g = param(scene, "gravity");
      const len = 10;
      const a = g * (Math.sin(th) - mu * Math.cos(th));
      const slides = a > 0;
      // Distance along the slope after the phase, capped at the slope's length.
      const tEnd = slides ? Math.sqrt((2 * len) / a) : 1;
      const s = slides ? Math.min(len, 0.5 * a * (t * tEnd) ** 2) : 0;
      const top: Vec3 = [-len * Math.cos(th), len * Math.sin(th), 0];
      const at = (u: number): Vec3 => [
        top[0] + u * len * Math.cos(th),
        top[1] - u * len * Math.sin(th),
        0,
      ];
      return {
        body: at(s / len),
        segments: [
          { points: [top, [0, 0, 0]], kind: "guide" },
          { points: [[0, 0, 0], [top[0], 0, 0], top], kind: "guide" },
          { points: sample(24, (u) => at((u * s) / len)), kind: "trace" },
        ],
        arrows: [],
        readouts: [
          { label: "acceleration", value: slides ? num(a, "m/s²") : "0.00 m/s²" },
          { label: "verdict", value: slides ? "slides" : "stays put" },
          { label: "angle to just slip", value: num((Math.atan(mu) * 180) / Math.PI, "deg") },
        ],
        extent: len * 0.75,
      };
    }

    case "wave": {
      const lam = param(scene, "wavelength");
      const amp = param(scene, "amplitude");
      const c = param(scene, "speed");
      const f = c / lam;
      const period = 1 / f;
      const span = lam * 2.5;
      const y = (x: number, u: number) => amp * Math.sin(TAU * (x / lam - u));
      const at = (u: number): Vec3 => [-span / 2 + u * span, y(-span / 2 + u * span, t), 0];
      // The body rides one fixed particle of the string, which is the point:
      // the wave travels, the particle only goes up and down.
      const px = -span / 2 + span * 0.25;
      return {
        body: [px, y(px, t), 0],
        segments: [
          { points: sample(96, at), kind: "trace" },
          { points: [[-span / 2, 0, 0], [span / 2, 0, 0]], kind: "guide" },
          { points: [[px, -amp, 0], [px, amp, 0]], kind: "guide" },
        ],
        arrows: [],
        readouts: [
          { label: "frequency", value: num(f, "Hz") },
          { label: "period", value: num(period, "s") },
          { label: "wavelength", value: num(lam, "m") },
        ],
        extent: Math.max(span / 2, amp * 2),
      };
    }

    case "orbit": {
      const a = param(scene, "radius");
      const e = param(scene, "eccentricity");
      const b = a * Math.sqrt(1 - e * e);
      const c = a * e;
      // Kepler's equation, solved by Newton. Stepping the true anomaly
      // uniformly instead would draw the right ellipse traversed at the wrong
      // speed, which is exactly the misconception this scene exists to fix.
      const posAt = (u: number): Vec3 => {
        const M = TAU * u;
        let E = M;
        for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        return [a * Math.cos(E) - c, 0, b * Math.sin(E)];
      };
      const pos = posAt(t);
      const r = Math.hypot(pos[0], pos[2]);
      return {
        body: pos,
        segments: [
          { points: sample(96, posAt), kind: "trace" },
          { points: [[0, 0, 0], pos], kind: "guide" },
        ],
        arrows: [],
        readouts: [
          { label: "distance now", value: num(r, "m") },
          { label: "closest approach", value: num(a * (1 - e), "m") },
          { label: "farthest", value: num(a * (1 + e), "m") },
        ],
        extent: a * (1 + e) * 1.05,
      };
    }
  }
}
