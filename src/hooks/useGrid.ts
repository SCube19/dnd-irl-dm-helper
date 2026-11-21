import { useMemo } from "react";
import { useMapSpace } from "../layers/MapSpaceProvider";
import { XY } from "../types/common";

/** Grid metrics for the current map space. */
export function useGrid() {
  const { imageSize, gridSpacing: rawSpacing } = useMapSpace();
  const gridSpacing = Math.max(1, rawSpacing);

  return useMemo(
    () => ({
      gridSpacing,
      gridWidth: Math.max(1, Math.ceil(imageSize.width / gridSpacing)),
      gridHeight: Math.max(1, Math.ceil(imageSize.height / gridSpacing)),
      imageSize,
      pixelToGrid: (p: XY) => ({
        gridX: Math.floor(p.x / gridSpacing),
        gridY: Math.floor(p.y / gridSpacing),
      }),
    }),
    [gridSpacing, imageSize],
  );
}
