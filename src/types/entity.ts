export type ViewerRole = "dm" | "player";

export type EntitySize = 1 | 2 | 3 | 4; // 1 = Medium (1x1), 2 = Large (2x2), 3 = Huge (3x3), 4 = Gargantuan (4x4)

export interface EntityStats {
  hp: {
    current: number;
    max: number;
  };
  ac: number;
  speed: number;
  initiative?: number;
}

export interface MapToken {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  size: EntitySize;
  avatarUri?: string;
  color?: string;
  visibleToPlayers: boolean;
  controlledBy: "dm" | string;
  srdSlug?: string;
  stats?: EntityStats;
}

export function gridToCanvasPoint(
  gridPos: { gridX: number; gridY: number },
  gridSpacing: number,
): { x: number; y: number } {
  return {
    x: gridPos.gridX * gridSpacing,
    y: gridPos.gridY * gridSpacing,
  };
}

export function canvasToGridPoint(
  canvasPos: { x: number; y: number },
  gridSpacing: number,
): { gridX: number; gridY: number } {
  return {
    gridX: Math.floor(canvasPos.x / gridSpacing),
    gridY: Math.floor(canvasPos.y / gridSpacing),
  };
}
