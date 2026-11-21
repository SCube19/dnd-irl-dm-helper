export type ViewerRole = "dm" | "player";

export interface XY {
  x: number;
  y: number;
}

export enum InteractionMode {
  PAN = "pan",
  DRAW = "draw",
  RECT = "rect",
  COVER = "cover",
  COVER_RECT = "cover_rect",
  TOKEN_ADD = "token_add",
  TOKEN_MOVE = "token_move",
  TOKEN_REMOVE = "token_remove",
  GRID = "grid",
}

export interface Measure {
  width: number;
  height: number;
}

export class Point implements XY {
  constructor(
    public x: number,
    public y: number,
  ) {}
}
