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
 */

export type ParamSpec = {
  label: string;
  unit: string;
  min: number;
  max: number;
  fallback: number;
  /** Step used by the dial that scrubs this parameter. */
  step: number;
};

export type SceneSpec = {
  label: string;
  /** What the scene shows, printed under it so the drawing is never mute. */
  caption: string;
  params: Record<string, ParamSpec>;
};

export const SCENES = {
  projectile: {
    label: "projectile",
    caption: "launch angle and speed against a flat ground",
    params: {
      speed: { label: "speed", unit: "m/s", min: 1, max: 120, fallback: 20, step: 1 },
      angle: { label: "angle", unit: "deg", min: 1, max: 89, fallback: 45, step: 1 },
      gravity: { label: "gravity", unit: "m/s²", min: 1, max: 30, fallback: 9.8, step: 0.1 },
    },
  },
  pendulum: {
    label: "pendulum",
    caption: "a bob on a rigid rod, swinging in one plane",
    params: {
      length: { label: "length", unit: "m", min: 0.1, max: 10, fallback: 1, step: 0.1 },
      amplitude: { label: "amplitude", unit: "deg", min: 1, max: 80, fallback: 25, step: 1 },
      gravity: { label: "gravity", unit: "m/s²", min: 1, max: 30, fallback: 9.8, step: 0.1 },
    },
  },
  circular: {
    label: "circular motion",
    caption: "velocity along the tangent, acceleration toward the centre",
    params: {
      radius: { label: "radius", unit: "m", min: 0.2, max: 50, fallback: 5, step: 0.1 },
      speed: { label: "speed", unit: "m/s", min: 0.5, max: 100, fallback: 10, step: 0.5 },
    },
  },
  incline: {
    label: "inclined plane",
    caption: "a block on a slope, with friction opposing the slide",
    params: {
      angle: { label: "angle", unit: "deg", min: 1, max: 80, fallback: 30, step: 1 },
      friction: { label: "friction", unit: "μ", min: 0, max: 2, fallback: 0.2, step: 0.05 },
      gravity: { label: "gravity", unit: "m/s²", min: 1, max: 30, fallback: 9.8, step: 0.1 },
    },
  },
  wave: {
    label: "travelling wave",
    caption: "a transverse wave moving along a string",
    params: {
      wavelength: { label: "wavelength", unit: "m", min: 0.2, max: 20, fallback: 4, step: 0.1 },
      amplitude: { label: "amplitude", unit: "m", min: 0.05, max: 5, fallback: 1, step: 0.05 },
      speed: { label: "speed", unit: "m/s", min: 0.2, max: 50, fallback: 4, step: 0.2 },
    },
  },
  orbit: {
    label: "orbit",
    caption: "an elliptical orbit, sweeping equal areas in equal times",
    params: {
      radius: { label: "semi-major axis", unit: "m", min: 1, max: 50, fallback: 8, step: 0.5 },
      eccentricity: { label: "eccentricity", unit: "", min: 0, max: 0.85, fallback: 0.4, step: 0.05 },
    },
  },
} as const satisfies Record<string, SceneSpec>;

export type SceneName = keyof typeof SCENES;

export const SCENE_NAMES = Object.keys(SCENES) as SceneName[];

export type Scene = {
  name: SceneName;
  params: Record<string, number>;
  /** One line saying what this drawing is doing in this particular answer. */
  note?: string;
};

const MAX_NOTE = 140;

function isSceneName(v: unknown): v is SceneName {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(SCENES, v);
}

/** Clamp to the spec's range, and fall back whenever the number is not one. */
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
  for (const [key, ps] of Object.entries(spec.params)) {
    params[key] = clampParam(ps, given[key]);
  }

  // Control characters and runaway length are stripped the same way every other
  // model-authored string in this codebase is.
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

/** The instruction handed to the model, built from the registry so the two
 *  cannot drift apart. */
export function sceneInstruction(): string {
  const list = SCENE_NAMES.map((n) => {
    const s = SCENES[n];
    const ps = Object.entries(s.params)
      .map(([k, v]) => `${k} (${v.unit || "ratio"}, ${v.min} to ${v.max})`)
      .join(", ");
    return `"${n}": ${s.caption}. params: ${ps}`;
  }).join("\n");

  return `If, and only if, the question is about one of the situations below, add a "scene" so the student gets a diagram they can turn and scrub. Omit "scene" entirely for anything else, including any question these do not genuinely fit. Never invent a scene name or a parameter name.

${list}

Scene shape: { "name": string, "params": { ... }, "note": string }. The note is one short sentence saying what the drawing shows for THIS question.`;
}
