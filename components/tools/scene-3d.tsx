"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";
import { Knob } from "@/components/ui/knob";
import { SCENES, type Scene } from "@/lib/scenes/registry";
import { frameAt, type Vec3 } from "@/lib/scenes/frame";

/**
 * A live diagram for an answer: the situation drawn in three dimensions, turned
 * with the mouse and scrubbed with a dial.
 *
 * Hand-rolled rather than built on a 3D library, for three reasons. The whole
 * app has eight dependencies and a wireframe projection is forty lines of
 * maths. A lit, shaded, material-based scene would need exactly the gradients
 * and glossy surfaces REFERENCE.md §5 rules out. And a physics engine would
 * make the drawing an approximation of the formula rather than the formula
 * itself, which is the one thing a study tool cannot afford.
 *
 * It does not start on its own. That is a settled decision in this product: a
 * thing that moves the moment a page opens reads as a distraction, so the play
 * button is the student's to press and the dial is theirs to turn.
 */

/** Steps the dial divides the motion into. */
const STEPS = 48;
/** Seconds for one full cycle when playing. */
const CYCLE = 4;
/** A wide frame, because every one of these scenes is wider than it is tall
 *  and a square one spent most of its pixels on empty sky. */
const VIEW_W = 660;
const VIEW_H = 420;
const FOCAL = 760;

type Camera = { yaw: number; pitch: number };

/** Where to stand to look at a scene. A projectile, a pendulum and a wave all
 *  live in one vertical plane, and a three-quarter view foreshortens the very
 *  thing they are about: a parabola seen down its own axis is a line. Those get
 *  a nearly head-on view with just enough turn to read as solid. Scenes that
 *  genuinely use the floor, an orbit or a circle, get the three-quarter view. */
function startCamera(planar: boolean): Camera {
  return planar ? { yaw: 0.22, pitch: 0.16 } : { yaw: 0.62, pitch: 0.42 };
}

function project(p: Vec3, cam: Camera, scale: number, dist: number, centre: Vec3) {
  const [x0, y0, z0] = [
    (p[0] - centre[0]) * scale,
    (p[1] - centre[1]) * scale,
    (p[2] - centre[2]) * scale,
  ];
  // Yaw about the vertical axis, then pitch the camera down toward the ground.
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const x1 = x0 * cy + z0 * sy;
  const z1 = -x0 * sy + z0 * cy;
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const y2 = y0 * cp - z1 * sp;
  const z2 = y0 * sp + z1 * cp;
  const depth = z2 + dist;
  const f = FOCAL / Math.max(1, depth);
  return { x: VIEW_W / 2 + x1 * f, y: VIEW_H / 2 - y2 * f, depth };
}

/** The box the whole drawing lives in, so the camera can frame any scene
 *  without each scene having to know how it will be looked at. A projectile
 *  starts at the origin and lands far to one side; centring on the origin put
 *  half of it outside the frame. */
function bounds(points: Vec3[]) {
  const lo: Vec3 = [Infinity, Infinity, Infinity];
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < lo[i]) lo[i] = p[i];
      if (p[i] > hi[i]) hi[i] = p[i];
    }
  }
  const centre: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const span = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2], 1e-6);
  const radius =
    Math.max(1e-6, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2);
  return { centre, span, radius, lo, hi };
}

export function Scene3D({ scene }: { scene: Scene }) {
  const spec = SCENES[scene.name];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cam, setCam] = useState<Camera>(() => {
    const f = frameAt(scene, 0);
    const pts = f.segments.flatMap((s) => s.points).concat([f.body]);
    const b = bounds(pts);
    return startCamera(b.hi[2] - b.lo[2] < b.span * 0.2);
  });
  const drag = useRef<{ x: number; y: number; cam: Camera } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const phase = step / STEPS;
  const frame = frameAt(scene, phase);

  // Framed from the full path rather than from where the body happens to be,
  // so the drawing does not jump around as the dial is turned.
  const all = frame.segments.flatMap((s) => s.points).concat([frame.body]);
  const { centre, span, radius, lo, hi } = bounds(all);
  const dist = 1000;
  // Fit the scene's bounding sphere, not its widest axis. A sphere looks the
  // same from every angle, so the drawing fills the frame at the angle it opens
  // at and does not swell or shrink while it is being turned. The perspective
  // divide is in here too: without it everything came out about a quarter
  // smaller than the frame it was fitted to.
  const persp = FOCAL / dist;
  const scale = (VIEW_H * 0.43) / Math.max(1e-6, radius * persp);

  // Playing advances the dial itself, so the control and the drawing can never
  // disagree about where in the motion this is.
  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const d = (now - last) / 1000;
      last = now;
      setStep((s) => (s + (d / CYCLE) * STEPS) % STEPS);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Dragging needs the newest camera without re-subscribing on every move.
  const camRef = useRef(cam);
  camRef.current = cam;

  const onDown = useCallback((e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, cam: { ...camRef.current } };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setCam({
      yaw: d.cam.yaw + (e.clientX - d.x) * 0.008,
      // Stop short of straight down: past vertical the scene turns inside out.
      pitch: Math.max(-0.2, Math.min(1.35, d.cam.pitch + (e.clientY - d.y) * 0.006)),
    });
  }, []);

  const onUp = useCallback(() => {
    drag.current = null;
  }, []);

  const to = (p: Vec3) => project(p, cam, scale, dist, centre);
  const path = (pts: Vec3[]) =>
    pts.map((p, i) => {
      const s = to(p);
      return `${i ? "L" : "M"}${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
    }).join(" ");

  // A ground grid, so the perspective is legible and the body has somewhere to
  // be. Drawn in the ground colour: it is the graph paper, not a data series.
  const half = span / 2;
  const floor = Math.min(0, lo[1]);
  const gridLines: Vec3[][] = [];
  for (let i = -4; i <= 4; i++) {
    const u = (i / 4) * half;
    gridLines.push([[centre[0] + u, floor, centre[2] - half], [centre[0] + u, floor, centre[2] + half]]);
    gridLines.push([[centre[0] - half, floor, centre[2] + u], [centre[0] + half, floor, centre[2] + u]]);
  }

  const bodyAt = to(frame.body);

  return (
    <section className="u-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="u-label">{spec.label}</span>
        <span className="u-mono text-2xs text-text-3">drag to turn</span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_210px]">
        <div
          className="relative touch-none select-none bg-bg"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <svg
            ref={svg}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block aspect-[660/420] w-full cursor-grab active:cursor-grabbing"
            role="img"
            aria-label={`${spec.label}: ${spec.caption}`}
          >
            {gridLines.map((g, i) => (
              <path key={`g${i}`} d={path(g)} fill="none" stroke="var(--surface-3)" strokeWidth={1} />
            ))}

            {frame.segments
              .filter((s) => s.kind === "guide")
              .map((s, i) => (
                <path
                  key={`s${i}`}
                  d={path(s.points)}
                  fill="none"
                  stroke="var(--border-2)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              ))}

            {frame.arrows.map((a, i) => {
              const from = to(a.from);
              const at = to(a.to);
              return (
                <g key={`a${i}`}>
                  <path
                    d={`M${from.x.toFixed(1)} ${from.y.toFixed(1)} L${at.x.toFixed(1)} ${at.y.toFixed(1)}`}
                    stroke="var(--text-3)"
                    strokeWidth={1.5}
                    fill="none"
                  />
                  <circle cx={at.x} cy={at.y} r={3} fill="var(--text-3)" />
                  <text
                    x={at.x + 8}
                    y={at.y - 6}
                    className="u-mono"
                    fontSize={12}
                    fill="var(--text-2)"
                  >
                    {a.label}
                  </text>
                </g>
              );
            })}

            {/* The path taken and the thing taking it are one instrument, so
                they are one hue: the body at full lime, the trace behind it
                dimmed. That is the same resolution the landing dial uses for
                its meters, and it keeps the panel to a single accent. */}
            {frame.segments
              .filter((s) => s.kind === "trace")
              .map((s, i) => (
                <path
                  key={`t${i}`}
                  d={path(s.points)}
                  fill="none"
                  stroke="var(--accent-strong)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.42}
                />
              ))}

            <circle cx={bodyAt.x} cy={bodyAt.y} r={6} fill="var(--accent-strong)" />
            <circle cx={bodyAt.x} cy={bodyAt.y} r={11} fill="none" stroke="var(--accent-strong)" strokeWidth={1} opacity={0.35} />
          </svg>
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4 lg:border-l lg:border-t-0">
          <div className="space-y-2">
            {frame.readouts.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-2">
                <span className="u-label truncate">{r.label}</span>
                <span className="u-mono shrink-0 text-2xs text-text">{r.value}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3">
            <div className="space-y-1">
              {Object.entries(spec.params).map(([key, ps]) => (
                <div key={key} className="flex items-baseline justify-between gap-2">
                  <span className="u-mono truncate text-2xs text-text-3">{ps.label}</span>
                  <span className="u-mono shrink-0 text-2xs text-text-2">
                    {scene.params[key]} {ps.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center gap-3 border-t border-border pt-3">
            <Knob
              label="scrub the motion"
              hint={`${Math.round(phase * 100)}%`}
              positions={Array.from({ length: STEPS + 1 }, (_, i) => String(i))}
              value={String(Math.round(step))}
              onChange={(v) => {
                setPlaying(false);
                setStep(Number(v));
              }}
              size={56}
              sweep={300}
            />
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  playClick("tap");
                  setPlaying((p) => !p);
                }}
                aria-pressed={playing}
                className={cn(
                  "u-tap u-mono inline-flex items-center gap-1.5 rounded-md border border-border-2 bg-surface-2 px-2 py-1 text-2xs text-text-2",
                  "transition-colors hover:text-text",
                )}
              >
                {playing ? <Pause size={11} /> : <Play size={11} />}
                {playing ? "pause" : "play"}
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick("soft");
                  setCam(startCamera(hi[2] - lo[2] < span * 0.2));
                }}
                className="u-tap u-mono inline-flex items-center gap-1.5 rounded-md border border-border-2 bg-surface-2 px-2 py-1 text-2xs text-text-2 transition-colors hover:text-text"
              >
                <RotateCcw size={11} /> view
              </button>
            </div>
          </div>
        </div>
      </div>

      {scene.note && (
        <p className="border-t border-border px-4 py-2.5 text-xs text-text-2">{scene.note}</p>
      )}
    </section>
  );
}
