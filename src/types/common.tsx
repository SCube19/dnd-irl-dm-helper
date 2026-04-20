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
  x: number;
  y: number;

  public constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public toString(): string {
    return `${this.x}|${this.y}`;
  }
}
