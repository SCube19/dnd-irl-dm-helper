import React, { memo, useMemo } from "react";
import { Skia, Canvas, Path } from "@shopify/react-native-skia";
import { clamp } from "react-native-reanimated";

export interface MapGridProps {
  gridSize: {
    width: number;
    height: number;
  };
  gridSpacing: number;
  color: string;
  scale: number;
}

export const MapGrid = memo(function MapGrid({
  gridSize,
  gridSpacing,
  color,
  scale,
}: MapGridProps) {
  const scaleInverse: number = (1 / scale) * 0.7;
  const lineWidth: number = clamp(scaleInverse, 0.5, 2.5);

  const gridPath = useMemo(() => {
    if (gridSpacing <= 0 || gridSize.width <= 0 || gridSize.height <= 0) {
      return null;
    }
    const path = Skia.Path.Make();
    // Vertical grid lines
    for (let x = gridSpacing; x < gridSize.width; x += gridSpacing) {
      path.moveTo(x, 0);
      path.lineTo(x, gridSize.height);
    }
    // Horizontal grid lines
    for (let y = gridSpacing; y < gridSize.height; y += gridSpacing) {
      path.moveTo(0, y);
      path.lineTo(gridSize.width, y);
    }
    return path;
  }, [gridSize.width, gridSize.height, gridSpacing]);

  if (!gridPath) return null;

  return (
    <Canvas
      style={{
        position: "absolute",
        zIndex: 5,
        top: 0,
        left: 0,
        width: gridSize.width,
        height: gridSize.height,
        pointerEvents: "none",
      }}
    >
      <Path
        path={gridPath}
        color={color}
        style="stroke"
        strokeWidth={lineWidth}
      />
    </Canvas>
  );
});
