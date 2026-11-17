import { layout } from "@/config/site";

// ★ ONE scroll position for the whole visit:
//   0 = the frosted door, SPLIT = zoomed into the main carpet, 1 = end of the carpet's turn
export const journey = { target: 0 };

// share of the scroll used by the gallery walk; the rest is the revolving carpet
export const SPLIT = 0.55;

// in the carpet's turn: the first 86% is the four slides, the rest is the finale into the shop
export const MAIN_END = 0.86;

// gallery distances: door closed → zoomed into the main carpet
export const DOOR_SPAN = 6;
export const FAR_Z = layout.galleryStartZ + DOOR_SPAN;
export const END_Z = layout.zoomEndZ;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// journey position → where the gallery camera should be
export const zFromJourney = (j: number) => FAR_Z - clamp01(j / SPLIT) * (FAR_Z - END_Z);
// gallery camera position → journey position
export const journeyFromZ = (z: number) => clamp01((FAR_Z - z) / (FAR_Z - END_Z)) * SPLIT;
// journey position → progress through the carpet's turn (0..1)
export const turnFromJourney = (j: number) => clamp01((j - SPLIT) / (1 - SPLIT));
// progress through the carpet's turn → journey position
export const journeyFromTurn = (t: number) => SPLIT + clamp01(t) * (1 - SPLIT);