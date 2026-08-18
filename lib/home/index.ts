/** M22 — Home composition. One import surface, mirroring `components/console/
 *  primitives/index.ts`'s "a single entry point is not tidiness." */

export * from "./types";
export { HOME_COMPONENT_REGISTRY, getHomeComponent, listHomeComponents } from "./registry";
export {
  buildImportanceSignal,
  capCriticalToOne,
  clampToRegistryCeiling,
  resolveHomeImportance,
  HomeImportanceConstructionError,
  type HomeImportanceResolution,
} from "./importance";
export { defaultHomeLayout, validateHomeLayout, resolveHomeComposition, type HomeLayoutValidation } from "./layout";
