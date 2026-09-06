/**
 * The scene library the AI is allowed to draw with.
 *
 * The model does not author geometry. It picks a scene by name and supplies
 * numbers, and everything that ends up on screen is drawn by code in this
 * repository. That boundary is the whole design: a model that could emit an
 * arbitrary scene graph would be unbounded, untestable, and a straight path
 * from a student's pasted question into the renderer.
 *
 * Every parameter has a real range. Out-of-range numbers are clamped rather
 * than rejected, because a slightly wrong angle should still draw; an unknown
 * scene name is dropped entirely, because there is nothing honest to draw for
 * it. A dropped scene costs the student a picture. A trusted one costs more.
 *
 * English has no scenes, and that is the right answer rather than a gap. There
 * is no spatial fact about a passage of prose that a wireframe explains, and a
 * "story arc" drawn as a curve would be decoration pretending to be an
 * instrument.
 */

export type ParamSpec = {
  label: string;
  unit: string;
  min: number;
  max: number;
  fallback: number;
  step: number;
};

export type SceneSpec = {
  label: string;
  /** What the scene shows, printed under it so the drawing is never mute. */
  caption: string;
  /** Which subject's questions this scene is offered for. */
  subject: "Physics" | "Chemistry" | "Maths" | "Biology" | "Economics";
  /**
   * Where to stand. Derived from the geometry it turned out to be a trap: a
   * DNA helix is long and thin, so measuring its depth against its length
   * classifies it as flat and shows it edge-on, destroying the one thing it is
   * for. Each scene states its own view instead.
   */
  view: "planar" | "spatial";
  /**
   * What the dial does. "time" scrubs the motion. "spin" turns a static object
   * on its own axis, which is what you want from a shape you are trying to see
   * all sides of, and keeps the dial meaningful on a scene that does not move.
   */
  motion: "time" | "spin";
  params: Record<string, ParamSpec>;
};

const G: ParamSpec = { label: "gravity", unit: "m/s²", min: 1, max: 30, fallback: 9.8, step: 0.1 };

export const SCENES = {
  // ── Physics ──────────────────────────────────────────────────────────
  projectile: {
    label: "projectile",
    caption: "launch angle and speed against a flat ground",
    subject: "Physics",
    view: "planar",
    motion: "time",
    params: {
      speed: { label: "speed", unit: "m/s", min: 1, max: 120, fallback: 20, step: 1 },
      angle: { label: "angle", unit: "deg", min: 1, max: 89, fallback: 45, step: 1 },
      gravity: G,
    },
  },
  pendulum: {
    label: "pendulum",
    caption: "a bob on a rigid rod, swinging in one plane",
    subject: "Physics",
    view: "planar",
    motion: "time",
    params: {
      length: { label: "length", unit: "m", min: 0.1, max: 10, fallback: 1, step: 0.1 },
      amplitude: { label: "amplitude", unit: "deg", min: 1, max: 80, fallback: 25, step: 1 },
      gravity: G,
    },
  },
  circular: {
    label: "circular motion",
    caption: "velocity along the tangent, acceleration toward the centre",
    subject: "Physics",
    view: "spatial",
    motion: "time",
    params: {
      radius: { label: "radius", unit: "m", min: 0.2, max: 50, fallback: 5, step: 0.1 },
      speed: { label: "speed", unit: "m/s", min: 0.5, max: 100, fallback: 10, step: 0.5 },
    },
  },
  incline: {
    label: "inclined plane",
    caption: "a block on a slope, with friction opposing the slide",
    subject: "Physics",
    view: "planar",
    motion: "time",
    params: {
      angle: { label: "angle", unit: "deg", min: 1, max: 80, fallback: 30, step: 1 },
      friction: { label: "friction", unit: "μ", min: 0, max: 2, fallback: 0.2, step: 0.05 },
      gravity: G,
    },
  },
  wave: {
    label: "travelling wave",
    caption: "a transverse wave moving along a string",
    subject: "Physics",
    view: "planar",
    motion: "time",
    params: {
      wavelength: { label: "wavelength", unit: "m", min: 0.2, max: 20, fallback: 4, step: 0.1 },
      amplitude: { label: "amplitude", unit: "m", min: 0.05, max: 5, fallback: 1, step: 0.05 },
      speed: { label: "speed", unit: "m/s", min: 0.2, max: 50, fallback: 4, step: 0.2 },
    },
  },
  orbit: {
    label: "orbit",
    caption: "an elliptical orbit, sweeping equal areas in equal times",
    subject: "Physics",
    view: "spatial",
    motion: "time",
    params: {
      radius: { label: "semi-major axis", unit: "m", min: 1, max: 50, fallback: 8, step: 0.5 },
      eccentricity: { label: "eccentricity", unit: "", min: 0, max: 0.85, fallback: 0.4, step: 0.05 },
    },
  },

  // ── Chemistry ────────────────────────────────────────────────────────
  molecule: {
    label: "molecular shape",
    caption: "VSEPR geometry: bonding pairs and lone pairs around one centre",
    subject: "Chemistry",
    view: "spatial",
    motion: "spin",
    params: {
      bonds: { label: "bonded atoms", unit: "count", min: 1, max: 6, fallback: 4, step: 1 },
      lonePairs: { label: "lone pairs", unit: "count", min: 0, max: 3, fallback: 0, step: 1 },
    },
  },
  lattice: {
    label: "unit cell",
    caption: "the repeating cube of a cubic crystal",
    subject: "Chemistry",
    view: "spatial",
    motion: "spin",
    params: {
      type: {
        label: "lattice",
        unit: "1 simple, 2 body-centred, 3 face-centred",
        min: 1,
        max: 3,
        fallback: 3,
        step: 1,
      },
    },
  },

  // ── Maths ────────────────────────────────────────────────────────────
  conic: {
    label: "conic section",
    caption: "a plane cutting a double cone, and the curve it leaves",
    subject: "Maths",
    view: "spatial",
    motion: "spin",
    params: {
      tilt: { label: "plane tilt", unit: "deg", min: 0, max: 80, fallback: 30, step: 1 },
      coneAngle: { label: "cone half-angle", unit: "deg", min: 15, max: 70, fallback: 45, step: 1 },
    },
  },
  vectors: {
    label: "two vectors",
    caption: "two vectors, the parallelogram they span, and their cross product",
    subject: "Maths",
    view: "spatial",
    motion: "spin",
    params: {
      ax: { label: "a.x", unit: "", min: -10, max: 10, fallback: 3, step: 0.5 },
      ay: { label: "a.y", unit: "", min: -10, max: 10, fallback: 0, step: 0.5 },
      az: { label: "a.z", unit: "", min: -10, max: 10, fallback: 0, step: 0.5 },
      bx: { label: "b.x", unit: "", min: -10, max: 10, fallback: 1, step: 0.5 },
      by: { label: "b.y", unit: "", min: -10, max: 10, fallback: 2, step: 0.5 },
      bz: { label: "b.z", unit: "", min: -10, max: 10, fallback: 0, step: 0.5 },
    },
  },
  revolution: {
    label: "solid of revolution",
    caption: "a curve swept about the axis, and the volume it encloses",
    subject: "Maths",
    view: "spatial",
    motion: "time",
    params: {
      radius: { label: "radius at the end", unit: "units", min: 0.2, max: 10, fallback: 3, step: 0.1 },
      height: { label: "height", unit: "units", min: 0.5, max: 20, fallback: 6, step: 0.5 },
      power: {
        label: "curve power",
        unit: "0 cylinder, 1 cone, 0.5 paraboloid",
        min: 0,
        max: 3,
        fallback: 1,
        step: 0.5,
      },
    },
  },

  // ── Biology ──────────────────────────────────────────────────────────
  dna: {
    label: "DNA double helix",
    caption: "B-DNA: two antiparallel strands with base pairs between them",
    subject: "Biology",
    view: "spatial",
    motion: "spin",
    params: {
      turns: { label: "turns", unit: "count", min: 1, max: 8, fallback: 3, step: 1 },
    },
  },

  // ── Economics ────────────────────────────────────────────────────────
  supplydemand: {
    label: "supply and demand",
    caption: "two schedules and the price where they cross",
    subject: "Economics",
    view: "planar",
    motion: "time",
    params: {
      demandIntercept: { label: "demand at zero price", unit: "qty", min: 1, max: 200, fallback: 100, step: 1 },
      demandSlope: { label: "demand slope", unit: "qty per price", min: 0.1, max: 20, fallback: 2, step: 0.1 },
      supplyIntercept: { label: "supply at zero price", unit: "qty", min: -100, max: 100, fallback: 0, step: 1 },
      supplySlope: { label: "supply slope", unit: "qty per price", min: 0.1, max: 20, fallback: 2, step: 0.1 },
    },
  },
} as const satisfies Record<string, SceneSpec>;

export type SceneName = keyof typeof SCENES;

export const SCENE_NAMES = Object.keys(SCENES) as SceneName[];

export type Scene = {
  name: SceneName;
  params: Record<string, number>;
  note?: string;
};

const MAX_NOTE = 140;

function isSceneName(v: unknown): v is SceneName {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(SCENES, v);
}

export function clampParam(spec: ParamSpec, raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return spec.fallback;
  return Math.min(spec.max, Math.max(spec.min, n));
}

/**
 * Turn whatever the model returned into a scene this codebase can draw, or
 * nothing. Unknown names, missing params and hostile strings all end here.
 */
export function parseScene(raw: unknown): Scene | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!isSceneName(obj.name)) return null;

  const spec = SCENES[obj.name];
  const given = (obj.params && typeof obj.params === "object" ? obj.params : {}) as Record<
    string,
    unknown
  >;

  const params: Record<string, number> = {};
  for (const [key, ps] of Object.entries(spec.params as Record<string, ParamSpec>)) {
    params[key] = clampParam(ps, given[key]);
  }

  const note =
    typeof obj.note === "string"
      ? obj.note
          .replace(/[\p{C}\p{Zl}\p{Zp}]+/gu, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, MAX_NOTE)
      : "";

  return { name: obj.name, params, note: note || undefined };
}

/**
 * The instruction handed to the model, built from the registry so the two
 * cannot drift apart.
 *
 * Scoped to one subject on purpose. This text is inlined into the system prompt
 * of every doubt request, and listing all thirteen scenes with their parameter
 * ranges would spend tokens on twelve situations the question cannot be about.
 * A subject with no scenes gets no instruction at all.
 */
export function sceneInstruction(subject?: string): string {
  const names = SCENE_NAMES.filter(
    (n) => !subject || SCENES[n].subject.toLowerCase() === subject.trim().toLowerCase(),
  );
  if (names.length === 0) return "";

  // The worked example is built from this subject's own first scene. A
  // hardcoded one meant a chemistry prompt carried a projectile in it, which
  // both wastes tokens and points at a scene the question cannot be about.
  const first = SCENES[names[0]] as SceneSpec;
  const example = {
    name: names[0],
    params: Object.fromEntries(
      Object.entries(first.params).map(([k, v]) => [k, (v as ParamSpec).fallback]),
    ),
    note: `what the drawing shows for this question`,
  };

  const list = names
    .map((n) => {
      const s = SCENES[n] as SceneSpec;
      const ps = Object.entries(s.params)
        .map(([k, v]) => `${k} (${v.unit || "ratio"}, ${v.min} to ${v.max})`)
        .join(", ");
      return `"${n}": ${s.caption}. params: ${ps}`;
    })
    .join("\n");

  // Wording matters more here than it looks. An earlier version said "if, and
  // only if" and then repeated the omit case twice, and the model read the
  // whole instruction as a warning: it answered a textbook projectile question,
  // the most obvious match in the list, with no scene at all. State the include
  // case as the expectation, state the omit case once, and show one example.
  return `Before you answer, check this list of diagrams you can draw. If the question is about one of these situations, include a "scene" for it: the student gets a diagram they can turn and scrub alongside your answer, and these are the questions it helps most. If the question is not about any of them, leave "scene" out. Never invent a scene name or a parameter name, and never stretch a scene onto a question it does not fit.

${list}

Put "scene" first in the object, before "text". Shape: { "name": string, "params": { ... }, "note": string }, where the note is one short sentence saying what the drawing shows for THIS question.

Example of the shape, using ${example.name}:
{"scene":${JSON.stringify(example)},"text":"..."}`;
}
