import React, { memo, useMemo } from "react";
import { Skia, Canvas, Group, Path } from "@shopify/react-native-skia";
import Animated, {
  clamp,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import { useMapSpace } from "../MapSpaceProvider";
import { LAYER_Z } from "../zOrder";

export interface GridLayerProps {
  color?: string;
  casingColor?: string;
}

export const GridLayer = memo(function GridLayer({
  color = "rgba(250, 248, 240, 0.72)",
  casingColor = "rgba(10, 12, 18, 0.4)",
}: GridLayerProps) {
  const {
    imageSize,
    gridSpacing,
    scale,
    translationX,
    translationY,
    containerSize,
  } = useMapSpace();

  const { width, height } = containerSize;
  const safeSpacing = Math.max(1, gridSpacing);

  const coreWidth = useDerivedValue(() => {
    const s = Math.max(0.15, scale.value);
    const screenPx = clamp(0.75 + (s - 0.5) * 0.16, 0.75, 1.15);
    return Math.min(screenPx / s, safeSpacing * 0.1);
  }, [scale, safeSpacing]);

  const casingWidth = useDerivedValue(() => coreWidth.value * 2, [coreWidth]);

  const gridOpacity = useDerivedValue(() => {
    const s = Math.max(0.15, scale.value);
    const zoomFactor = clamp((s - 0.2) / 2.2, 0.16, 0.62);
    const spacingFactor = clamp((safeSpacing * s - 4) / 24, 0.2, 1.0);
    return clamp(zoomFactor * spacingFactor, 0.1, 0.62);
  }, [scale, safeSpacing]);

  const viewportStyle = useAnimatedStyle(() => {
    const s = Math.max(0.0001, scale.value);
    return {
      position: "absolute" as const,
      zIndex: LAYER_Z.GRID,
      width,
      height,
      transformOrigin: "0 0" as const,
      transform: [
        { scale: 1 / s },
        { translateX: -translationX.value },
        { translateY: -translationY.value },
      ],
    };
  });

  const cameraTransform = useDerivedValue(
    () => [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: Math.max(0.0001, scale.value) },
    ],
    [translationX, translationY, scale],
  );

  const gridPath = useMemo(() => {
    if (gridSpacing <= 0 || imageSize.width <= 0 || imageSize.height <= 0) {
      return null;
    }
    const path = Skia.Path.Make();
    for (let x = gridSpacing; x < imageSize.width; x += gridSpacing) {
      path.moveTo(x, 0);
      path.lineTo(x, imageSize.height);
    }
    for (let y = gridSpacing; y < imageSize.height; y += gridSpacing) {
      path.moveTo(0, y);
      path.lineTo(imageSize.width, y);
    }
    return path;
  }, [imageSize.width, imageSize.height, gridSpacing]);

  if (!gridPath || width <= 0 || height <= 0) return null;

  return (
    <Animated.View style={viewportStyle} pointerEvents="none">
      <Canvas style={{ width, height, pointerEvents: "none" }}>
        <Group transform={cameraTransform} opacity={gridOpacity}>
          <Path
            path={gridPath}
            color={casingColor}
            style="stroke"
            strokeWidth={casingWidth}
          />
          <Path
            path={gridPath}
            color={color}
            style="stroke"
            strokeWidth={coreWidth}
          />
        </Group>
      </Canvas>
    </Animated.View>
  );
});
