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

    case "molecule": {
      const bonds = Math.round(param(scene, "bonds"));
      const lone = Math.round(param(scene, "lonePairs"));
      const steric = Math.min(6, bonds + lone);
      const dirs = VSEPR[steric] ?? VSEPR[4];
      const shape = shapeName(bonds, lone);
      // Lone pairs take the roomiest sites, which for a trigonal bipyramid are
      // the equatorial ones. That is why SF4 is a seesaw and not a flattened
      // tetrahedron, so the drawing has to place them the same way.
      const order = steric === 5 ? [0, 1, 2, 3, 4] : dirs.map((_, i) => i);
      const bonded = order.slice(lone, lone + bonds).map((i) => dirs[i]);
      const pairs = order.slice(0, lone).map((i) => dirs[i]);

      return {
        body: [0, 0, 0],
        segments: [
          ...bonded.map((d) => ({ points: [[0, 0, 0], d] as Vec3[], kind: "trace" as const })),
          ...pairs.map((d) => ({
            points: [[0, 0, 0], [d[0] * 0.62, d[1] * 0.62, d[2] * 0.62]] as Vec3[],
            kind: "guide" as const,
          })),
        ],
        arrows: bonded.map((d) => ({ from: d, to: d, label: "" })),
        readouts: [
          { label: "shape", value: shape },
          { label: "electron geometry", value: GEOMETRY[steric] },
          { label: "ideal bond angle", value: IDEAL_ANGLE[steric] },
        ],
        extent: 1.2,
      };
    }

    case "lattice": {
      const kind = Math.round(param(scene, "type"));
      const h = 1;
      const corners: Vec3[] = [];
      for (const x of [-h, h]) for (const y of [-h, h]) for (const z of [-h, h]) corners.push([x, y, z]);
      const edges: Vec3[][] = [];
      for (const a of corners) {
        for (const b of corners) {
          // One edge per adjacent pair, counted once.
          const diff = a.map((v, i) => Math.abs(v - b[i]));
          const moved = diff.filter((d) => d > 0).length;
          if (moved === 1 && a[0] + a[1] * 2 + a[2] * 4 < b[0] + b[1] * 2 + b[2] * 4) {
            edges.push([a, b]);
          }
        }
      }

      const sites: Vec3[] = [...corners];
      if (kind === 2) sites.push([0, 0, 0]);
      if (kind === 3) {
        sites.push([0, 0, -h], [0, 0, h], [0, -h, 0], [0, h, 0], [-h, 0, 0], [h, 0, 0]);
      }

      // Atoms per cell, counting the fraction of each atom inside it: a corner
      // atom is shared by eight cells, a face atom by two.
      const perCell = kind === 1 ? 1 : kind === 2 ? 2 : 4;
      const packing = kind === 1 ? 0.524 : kind === 2 ? 0.68 : 0.74;

      return {
        body: sites[0],
        segments: [
          ...edges.map((e) => ({ points: e, kind: "guide" as const })),
          ...sites.map((v) => ({ points: [v, v] as Vec3[], kind: "trace" as const })),
        ],
        arrows: sites.map((v) => ({ from: v, to: v, label: "" })),
        readouts: [
          { label: "lattice", value: LATTICE[kind] ?? LATTICE[3] },
          { label: "atoms per cell", value: String(perCell) },
          { label: "packing fraction", value: packing.toFixed(2) },
        ],
        extent: h * 1.6,
      };
    }

    case "conic": {
      const tilt = rad(param(scene, "tilt"));
      const half = rad(param(scene, "coneAngle"));
      const H = 6;
      const k = Math.tan(half);
      // The cutting plane passes through a fixed point on the axis and is
      // tilted about x. Its normal is what decides which curve appears.
      const p0: Vec3 = [0, H * 0.45, 0];
      const n: Vec3 = [0, Math.cos(tilt), -Math.sin(tilt)];
      const nd = n[0] * p0[0] + n[1] * p0[1] + n[2] * p0[2];

      const cone: Vec3[][] = [];
      for (let i = 0; i < 24; i++) {
        const th = (i / 24) * TAU;
        cone.push([
          [-H * k * Math.cos(th), -H, -H * k * Math.sin(th)],
          [H * k * Math.cos(th), H, H * k * Math.sin(th)],
        ]);
      }
      for (const yy of [-H, -H / 2, H / 2, H]) {
        cone.push(sample(32, (u) => [Math.abs(yy) * k * Math.cos(TAU * u), yy, Math.abs(yy) * k * Math.sin(TAU * u)]));
      }

      // Intersect every generator with the plane. A generator that runs
      // parallel to the plane, or meets it beyond the cone, simply has no
      // point here, which is exactly how a parabola and a hyperbola escape.
      const runs: Vec3[][] = [];
      let run: Vec3[] = [];
      for (let i = 0; i <= 96; i++) {
        const th = (i / 96) * TAU;
        let placed = false;
        for (const sign of [1, -1]) {
          const d: Vec3 = [sign * k * Math.cos(th), sign, sign * k * Math.sin(th)];
          const den = n[0] * d[0] + n[1] * d[1] + n[2] * d[2];
          if (Math.abs(den) < 1e-9) continue;
          const t2 = nd / den;
          if (t2 > 0 && t2 <= H) {
            run.push([d[0] * t2, d[1] * t2, d[2] * t2]);
            placed = true;
            break;
          }
        }
        if (!placed && run.length > 1) {
          runs.push(run);
          run = [];
        } else if (!placed) {
          run = [];
        }
      }
      if (run.length > 1) runs.push(run);

      // The section is decided by the angle between the cutting plane and the
      // cone's axis, not between the plane's normal and the axis. `tilt` is the
      // latter, so the plane itself sits at 90 - tilt from the axis, and it is
      // that which is compared against the half-angle: parabola when they are
      // equal, ellipse when the plane is steeper than the generator, hyperbola
      // when it is shallower.
      //
      // Comparing tilt against `half` directly is the same test only when the
      // cone is 45 degrees, which is the fallback value, so it looked correct
      // for every casual check. At any other cone it named the curve wrongly,
      // including calling a visibly closed loop a hyperbola.
      const planeToAxis = Math.PI / 2 - tilt;
      const curve =
        Math.abs(tilt) < 1e-6
          ? "circle"
          : planeToAxis > half + 1e-6
            ? "ellipse"
            : planeToAxis > half - 1e-6
              ? "parabola"
              : "hyperbola";

      const planeQuad: Vec3[] = [
        [-H * k * 1.3, p0[1] + H * k * 1.3 * Math.tan(tilt), -H * k * 1.3],
        [H * k * 1.3, p0[1] + H * k * 1.3 * Math.tan(tilt), -H * k * 1.3],
        [H * k * 1.3, p0[1] - H * k * 1.3 * Math.tan(tilt), H * k * 1.3],
        [-H * k * 1.3, p0[1] - H * k * 1.3 * Math.tan(tilt), H * k * 1.3],
      ];

      return {
        body: runs[0]?.[0] ?? [0, 0, 0],
        segments: [
          ...cone.map((c) => ({ points: c, kind: "guide" as const })),
          { points: [...planeQuad, planeQuad[0]], kind: "guide" as const },
          ...runs.map((r2) => ({ points: r2, kind: "trace" as const })),
        ],
        arrows: [],
        readouts: [
          { label: "curve", value: curve },
          { label: "plane tilt", value: num((tilt * 180) / Math.PI, "deg") },
          { label: "cone half-angle", value: num((half * 180) / Math.PI, "deg") },
        ],
        extent: H,
      };
    }

    case "vectors": {
      const a: Vec3 = [param(scene, "ax"), param(scene, "ay"), param(scene, "az")];
      const b: Vec3 = [param(scene, "bx"), param(scene, "by"), param(scene, "bz")];
      const cross: Vec3 = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
      const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const magA = Math.hypot(...a);
      const magB = Math.hypot(...b);
      const area = Math.hypot(...cross);
      const angle =
        magA * magB > 0 ? (Math.acos(Math.min(1, Math.max(-1, dot / (magA * magB)))) * 180) / Math.PI : 0;
      const sum: Vec3 = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

      return {
        body: cross,
        segments: [
          { points: [[0, 0, 0], a], kind: "trace" },
          { points: [[0, 0, 0], b], kind: "trace" },
          { points: [[0, 0, 0], cross], kind: "trace" },
          { points: [a, sum, b], kind: "guide" },
        ],
        arrows: [
          { from: [0, 0, 0], to: a, label: "a" },
          { from: [0, 0, 0], to: b, label: "b" },
          { from: [0, 0, 0], to: cross, label: "a x b" },
        ],
        readouts: [
          { label: "a · b", value: num(dot) },
          { label: "|a x b|", value: num(area) },
          { label: "angle between", value: num(angle, "deg") },
        ],
        extent: Math.max(magA, magB, area, 1e-6) * 1.2,
      };
    }

    case "revolution": {
      const R = param(scene, "radius");
      const H = param(scene, "height");
      const pw = param(scene, "power");
      // r(x) = R (x/H)^p, so p = 0 is a cylinder, p = 1 a cone, p = 0.5 a
      // paraboloid. The volume is the exact integral of pi r^2 dx, not a sum
      // of slices: this scene exists to show where that integral comes from.
      const rAt = (x: number) => R * Math.pow(Math.max(0, x) / H, pw);
      const volume = (Math.PI * R * R * H) / (2 * pw + 1);
      const sweep = TAU * t;

      const profile = sample(32, (u) => [u * H, rAt(u * H), 0] as Vec3);
      const swept: Vec3[][] = [];
      for (let i = 0; i <= 16; i++) {
        const th = (i / 16) * sweep;
        swept.push(
          sample(24, (u) => {
            const x = u * H;
            const r2 = rAt(x);
            return [x, r2 * Math.cos(th), r2 * Math.sin(th)];
          }),
        );
      }
      const rims: Vec3[][] = [];
      for (const x of [H / 3, (2 * H) / 3, H]) {
        const r2 = rAt(x);
        rims.push(sample(24, (u) => [x, r2 * Math.cos(u * sweep), r2 * Math.sin(u * sweep)]));
      }

      return {
        body: [H, rAt(H) * Math.cos(sweep), rAt(H) * Math.sin(sweep)],
        segments: [
          { points: [[0, 0, 0], [H, 0, 0]], kind: "guide" },
          ...swept.map((c) => ({ points: c, kind: "guide" as const })),
          ...rims.map((c) => ({ points: c, kind: "guide" as const })),
          { points: profile, kind: "trace" },
        ],
        arrows: [],
        readouts: [
          { label: "volume", value: num(volume, "units³") },
          { label: "solid", value: pw === 0 ? "cylinder" : pw === 1 ? "cone" : "paraboloid" },
          { label: "swept", value: `${Math.round((sweep / TAU) * 360)} deg` },
        ],
        extent: Math.max(H, R * 2) * 0.6,
      };
    }

    case "dna": {
      const turns = Math.round(param(scene, "turns"));
      // B-DNA, the numbers the syllabus gives: 10 base pairs and 3.4 nm per
      // turn, 2 nm across.
      const bpPerTurn = 10;
      const rise = 0.34;
      const radius = 1;
      const bp = turns * bpPerTurn;
      const height = bp * rise;
      const strand = (offset: number) =>
        sample(turns * 32, (u) => {
          const a = TAU * turns * u + offset;
          return [radius * Math.cos(a), u * height - height / 2, radius * Math.sin(a)] as Vec3;
        });
      // The two strands are not diametrically opposite; the 140 degree offset
      // is what leaves a major and a minor groove.
      const groove = rad(140);
      const rungs: Vec3[][] = [];
      for (let i = 0; i <= bp; i++) {
        const u = i / bp;
        const a = TAU * turns * u;
        const y = u * height - height / 2;
        rungs.push([
          [radius * Math.cos(a), y, radius * Math.sin(a)],
          [radius * Math.cos(a + groove), y, radius * Math.sin(a + groove)],
        ]);
      }

      return {
        body: [radius, height / 2, 0],
        segments: [
          ...rungs.map((r2) => ({ points: r2, kind: "guide" as const })),
          { points: strand(0), kind: "trace" },
          { points: strand(groove), kind: "trace" },
        ],
        arrows: [],
        readouts: [
          { label: "base pairs", value: String(bp) },
          { label: "length", value: num(height, "nm") },
          { label: "diameter", value: "2.00 nm" },
        ],
        extent: Math.max(height, radius * 2) * 0.6,
      };
    }

    case "supplydemand": {
      const d0 = param(scene, "demandIntercept");
      const ds = param(scene, "demandSlope");
      const s0 = param(scene, "supplyIntercept");
      const ss = param(scene, "supplySlope");
      // The dial shifts demand, which is the move most questions are actually
      // about: what happens to price and quantity when demand rises.
      const shift = d0 * (t - 0.5) * 0.6;
      const dNow = d0 + shift;
      // dNow - ds*P = s0 + ss*P
      const pStar = (dNow - s0) / (ds + ss);
      const qStar = s0 + ss * pStar;
      const pMax = Math.max(1e-6, dNow / ds);
      const scaleQ = Math.max(Math.abs(dNow), Math.abs(qStar), 1);
      const X = (q: number) => (q / scaleQ) * 6;
      const Y = (pr: number) => (pr / pMax) * 6;

      const demand = sample(2, (u) => [X(dNow - ds * u * pMax), Y(u * pMax), 0] as Vec3);
      const supply = sample(2, (u) => [X(s0 + ss * u * pMax), Y(u * pMax), 0] as Vec3);

      return {
        body: [X(qStar), Y(pStar), 0],
        segments: [
          { points: [[0, 0, 0], [X(scaleQ), 0, 0]], kind: "guide" },
          { points: [[0, 0, 0], [0, 6, 0]], kind: "guide" },
          { points: [[0, Y(pStar), 0], [X(qStar), Y(pStar), 0], [X(qStar), 0, 0]], kind: "guide" },
          { points: demand, kind: "trace" },
          { points: supply, kind: "trace" },
        ],
        arrows: [
          { from: demand[1], to: demand[1], label: "D" },
          { from: supply[1], to: supply[1], label: "S" },
        ],
        readouts: [
          { label: "equilibrium price", value: num(pStar) },
          { label: "equilibrium quantity", value: num(qStar) },
          { label: "demand shift", value: `${shift >= 0 ? "+" : ""}${num(shift)}` },
        ],
        extent: 6,
      };
    }
  }
}

/** Where the electron pairs point, for each steric number. Unit vectors, so a
 *  scene can scale them to whatever bond length reads well. */
const VSEPR: Record<number, Vec3[]> = {
  1: [[0, 1, 0]],
  2: [[0, 1, 0], [0, -1, 0]],
  3: [
    [1, 0, 0],
    [-0.5, 0, Math.sqrt(3) / 2],
    [-0.5, 0, -Math.sqrt(3) / 2],
  ],
  4: [
    [0.5774, 0.5774, 0.5774],
    [0.5774, -0.5774, -0.5774],
    [-0.5774, 0.5774, -0.5774],
    [-0.5774, -0.5774, 0.5774],
  ],
  5: [
    [1, 0, 0],
    [-0.5, 0, Math.sqrt(3) / 2],
    [-0.5, 0, -Math.sqrt(3) / 2],
    [0, 1, 0],
    [0, -1, 0],
  ],
  6: [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ],
};

const GEOMETRY: Record<number, string> = {
  1: "linear",
  2: "linear",
  3: "trigonal planar",
  4: "tetrahedral",
  5: "trigonal bipyramidal",
  6: "octahedral",
};

const IDEAL_ANGLE: Record<number, string> = {
  1: "n/a",
  2: "180 deg",
  3: "120 deg",
  4: "109.5 deg",
  5: "120 and 90 deg",
  6: "90 deg",
};

const LATTICE: Record<number, string> = {
  1: "simple cubic",
  2: "body-centred cubic",
  3: "face-centred cubic",
};

/** The VSEPR table a student is given: the shape is named for where the atoms
 *  are, not for where the electron pairs are. */
function shapeName(bonds: number, lone: number): string {
  const key = `${bonds}-${lone}`;
  return (
    {
      "2-0": "linear",
      "2-1": "bent",
      "2-2": "bent",
      "3-0": "trigonal planar",
      "3-1": "trigonal pyramidal",
      "3-2": "T-shaped",
      "4-0": "tetrahedral",
      "4-1": "seesaw",
      "4-2": "square planar",
      "5-0": "trigonal bipyramidal",
      "5-1": "square pyramidal",
      "6-0": "octahedral",
      "1-0": "diatomic",
    }[key] ?? "irregular"
  );
}
