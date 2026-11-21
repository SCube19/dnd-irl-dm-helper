import type { XY } from "../../../types/common";
import type { GridCell, Token, TokenSize } from "./tokenTypes";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const distSq = (a: XY, b: XY) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

export const occupiesCell = (token: Token, cell: GridCell): boolean =>
  cell.gridX >= token.gridX &&
  cell.gridX < token.gridX + token.size &&
  cell.gridY >= token.gridY &&
  cell.gridY < token.gridY + token.size;

/** Whether a `size × size` area at `cell` overlaps `other`. */
export const overlapsArea = (
  cell: GridCell,
  size: TokenSize,
  other: Token,
): boolean =>
  cell.gridX < other.gridX + other.size &&
  cell.gridX + size > other.gridX &&
  cell.gridY < other.gridY + other.size &&
  cell.gridY + size > other.gridY;

/** Last (top-most rendered) token matching `predicate`. */
export function findTopmost(
  tokens: readonly Token[],
  predicate: (token: Token) => boolean,
): Token | undefined {
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (predicate(tokens[i])) return tokens[i];
  }
  return undefined;
}

export interface TokenGridMetrics {
  gridSpacing: number;
  gridWidth: number;
  gridHeight: number;
  /** Clamp to the map horizontally/vertically (false while size unknown). */
  boundX: boolean;
  boundY: boolean;
}

/**
 * Pure pixel/cell math for tokens on a square grid. Positions returned by
 * `homePosition`/`topLeftForCenter` are the token view's top-left corner.
 */
export function createTokenGeometry({
  gridSpacing,
  gridWidth,
  gridHeight,
  boundX,
  boundY,
}: TokenGridMetrics) {
  const unitDiameter = Math.max(6, Math.round(gridSpacing * 0.8));
  const offset = (gridSpacing - unitDiameter) / 2;
  const borderWidth = Math.max(1.5, Math.round(gridSpacing * 0.06));

  const diameterFor = (size: TokenSize) =>
    (size - 1) * gridSpacing + unitDiameter;
  const radiusFor = (size: TokenSize) => diameterFor(size) / 2;
  /** How far from a token's center a press still grabs it. */
  const hitRadiusFor = (size: TokenSize) => gridSpacing * (size * 0.5 + 0.15);

  const pixelToCell = (p: XY): GridCell => ({
    gridX: Math.floor(p.x / gridSpacing),
    gridY: Math.floor(p.y / gridSpacing),
  });

  const clampCellForSize = (cell: GridCell, size: TokenSize): GridCell => ({
    gridX: boundX
      ? clamp(cell.gridX, 0, Math.max(0, gridWidth - size))
      : cell.gridX,
    gridY: boundY
      ? clamp(cell.gridY, 0, Math.max(0, gridHeight - size))
      : cell.gridY,
  });

  const cellCenter = (token: Token): XY => ({
    x: (token.gridX + token.size * 0.5) * gridSpacing,
    y: (token.gridY + token.size * 0.5) * gridSpacing,
  });

  const homePosition = (cell: GridCell): XY => ({
    x: cell.gridX * gridSpacing + offset,
    y: cell.gridY * gridSpacing + offset,
  });

  const topLeftForCenter = (center: XY, size: TokenSize): XY => {
    const r = radiusFor(size);
    return { x: center.x - r, y: center.y - r };
  };

  /** Keeps a token's center far enough inside the map that it fits. */
  const clampCenter = (raw: XY, size: TokenSize): XY => {
    const half = gridSpacing * size * 0.5;
    return {
      x: boundX
        ? clamp(raw.x, half, Math.max(half, (gridWidth - size * 0.5) * gridSpacing))
        : raw.x,
      y: boundY
        ? clamp(raw.y, half, Math.max(half, (gridHeight - size * 0.5) * gridSpacing))
        : raw.y,
    };
  };

  /** Top-left cell for a token of `size` whose center is at `center`. */
  const centerToCell = (center: XY, size: TokenSize): GridCell =>
    clampCellForSize(
      size === 1
        ? pixelToCell(center)
        : {
            gridX: Math.round(center.x / gridSpacing - size * 0.5),
            gridY: Math.round(center.y / gridSpacing - size * 0.5),
          },
      size,
    );

  return {
    gridSpacing,
    unitDiameter,
    borderWidth,
    diameterFor,
    radiusFor,
    hitRadiusFor,
    pixelToCell,
    clampCellForSize,
    cellCenter,
    homePosition,
    topLeftForCenter,
    clampCenter,
    centerToCell,
  };
}

export type TokenGeometry = ReturnType<typeof createTokenGeometry>;
