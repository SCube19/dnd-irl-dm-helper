import React, { memo } from "react";
import { View } from "react-native";
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
  const scaleInverse: number = 1 / scale;
  const lineWidth: number = clamp(scaleInverse, 0.4, 3);
  const gridStyle = {
    backgroundImage: `
      repeating-linear-gradient(0deg, ${color}, ${color} ${lineWidth}px, transparent 1px, transparent ${gridSpacing}px),
      repeating-linear-gradient(90deg, ${color}, ${color} ${lineWidth}px, transparent 1px, transparent ${gridSpacing}px)
    `,
    position: "absolute" as const,
    zIndex: 5,
    top: 0,
    left: 0,
    width: gridSize.width,
    height: gridSize.height,
    backgroundBlendMode: "difference" as const,
    mixBlendMode: "difference" as const,
  };

  return <View style={gridStyle}></View>;
});
