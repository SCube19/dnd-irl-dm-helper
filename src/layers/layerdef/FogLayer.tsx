import React from "react";
import FogShader from "../../shaders/FogShader";
import { useFogOfWar } from "../../hooks/useFogOfWar";
import { useGrid } from "../../hooks/useGrid";
import {
  defineLayerKey,
  useLayerInteraction,
  useLayerStore,
  type PointerPayload,
} from "../orchestrator";
import { MapSpaceLayerView } from "../MapSpaceProvider";
import { LAYER_Z } from "../zOrder";
import { Point, InteractionMode, ViewerRole } from "../../types/common";

export interface FogLayerState {
  visible: boolean;
  viewerRole: ViewerRole;
  eraseSize: number;
}

export const FogLayerKey = defineLayerKey<FogLayerState>("fog", {
  visible: true,
  viewerRole: "dm",
  eraseSize: 1,
});

const REVEAL_MODES = new Set([InteractionMode.DRAW, InteractionMode.RECT]);

export function FogLayer() {
  const { imageSize, gridSpacing, pixelToGrid } = useGrid();
  const [{ visible, viewerRole, eraseSize }] = useLayerStore(FogLayerKey);
  const { revealTexture, handleReveal, getFogEpochNow } = useFogOfWar(
    imageSize,
    gridSpacing,
  );

  const paintFor = (mode: InteractionMode) => {
    if (!visible) return null;
    if (REVEAL_MODES.has(mode)) return handleReveal;
    return null;
  };

  const paintBrush = ({ point, mode }: PointerPayload) => {
    const paint = paintFor(mode);
    if (!paint) return;
    const { gridX, gridY } = pixelToGrid(point);
    const half = Math.floor(eraseSize / 2);
    paint(new Point(gridX - half, gridY - half), {
      width: eraseSize,
      height: eraseSize,
    });
  };

  useLayerInteraction({
    draw: paintBrush,
    tap: paintBrush,
    rectSelect: ({ start, end, mode }) => {
      const paint = paintFor(mode);
      if (!paint) return;
      const a = pixelToGrid(start);
      const b = pixelToGrid(end);
      const minX = Math.min(a.gridX, b.gridX);
      const minY = Math.min(a.gridY, b.gridY);
      paint(new Point(minX, minY), {
        width: Math.max(a.gridX, b.gridX) - minX + 1,
        height: Math.max(a.gridY, b.gridY) - minY + 1,
      });
    },
  });

  if (!visible || !revealTexture || imageSize.width === 0) return null;

  return (
    <MapSpaceLayerView zIndex={LAYER_Z.FOG}>
      <FogShader
        shaderSize={imageSize}
        squareSize={{ width: gridSpacing, height: gridSpacing }}
        revealTexture={revealTexture}
        fogOpacity={viewerRole === "dm" ? 0.35 : 1.0}
        getFogEpochNow={getFogEpochNow}
      />
    </MapSpaceLayerView>
  );
}
