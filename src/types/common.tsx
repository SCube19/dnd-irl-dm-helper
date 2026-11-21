export type ViewerRole = "dm" | "player";

export interface XY {
  x: number;
  y: number;
}

export enum InteractionMode {
  PAN = "pan",
  DRAW = "draw",
  RECT = "rect",
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
