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

/**
 * Standardized key generator for 2D points/grid coordinates.
 * Supports both pointKey(x, y) and pointKey(point).
 */
export function pointKey(x: number, y: number): string;
export function pointKey(point: XY): string;
export function pointKey(xOrPoint: number | XY, maybeY?: number): string {
  if (typeof xOrPoint === "number") {
    return `${xOrPoint}|${maybeY}`;
  }
  return `${xOrPoint.x}|${xOrPoint.y}`;
}

export class Point implements XY {
  x: number;
  y: number;

  public constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public toString(): string {
    return pointKey(this.x, this.y);
  }
}
