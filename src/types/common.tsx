export interface XY {
  x: number;
  y: number;
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
