/** Stacking order of map-space layers; keep every layer's z-index here. */
export const LAYER_Z = {
  MAP: 0,
  GRID: 10,
  TOKENS: 15,
  FOG: 20,
  TOKEN_OVERLAY: 25,
} as const;
