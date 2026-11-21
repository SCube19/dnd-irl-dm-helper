import React from "react";
import { Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MapTransformState } from "../hooks/useMapTransform";
import { usePanZoomGesture } from "./gestures/usePanZoomGesture";
import { useEraseGesture } from "./gestures/useEraseGesture";
import { useRectSelectGesture } from "./gestures/useRectSelectGesture";
import { InteractionMode } from "../types/common";
import { useLayerDispatch } from "../layers/orchestrator";
import { MapSpaceProvider } from "../layers/MapSpaceProvider";

interface OrchestratedInteractionConnectorProps {
  transform: MapTransformState;
  imageSize: { width: number; height: number };
  gridSpacing: number;
  minScale?: number;
  maxScale?: number;
  mode: InteractionMode;
  children: React.ReactNode;
}

/**
 * Turns gestures into layer events (in map space) and hosts the pan/zoom
 * transform that map-space layers render inside.
 */
export function OrchestratedInteractionConnector({
  transform,
  imageSize,
  gridSpacing,
  minScale,
  maxScale,
  mode,
  children,
}: OrchestratedInteractionConnectorProps) {
  const dispatch = useLayerDispatch();
  const {
    translationX,
    translationY,
    scale,
    cursor,
    containerRef,
    containerSize,
  } = transform;

  const panZoomGesture = usePanZoomGesture({
    transform,
    minScale,
    maxScale,
    enabled: mode === InteractionMode.PAN,
  });

  const eraseGesture = useEraseGesture({
    transform,
    onDraw: (point) => dispatch("draw", { point, mode }),
    onTouch: (point) => dispatch("tap", { point, mode }),
    enabled: mode === InteractionMode.DRAW || mode === InteractionMode.COVER,
  });

  const rectState = {
    isActive: useSharedValue(false),
    startX: useSharedValue(0),
    startY: useSharedValue(0),
    currentX: useSharedValue(0),
    currentY: useSharedValue(0),
  };

  const rectSelectGesture = useRectSelectGesture({
    transform,
    rectState,
    onRectSelect: (start, end) => dispatch("rectSelect", { start, end, mode }),
    enabled:
      mode === InteractionMode.RECT || mode === InteractionMode.COVER_RECT,
  });

  const gestures = Gesture.Race(panZoomGesture, eraseGesture, rectSelectGesture);

  const panZoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
    ],
    transformOrigin: "0 0" as const,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    width: containerSize.width,
    height: containerSize.height,
    overflow: "hidden" as const,
    ...(Platform.OS === "web" ? { cursor: cursor.value as any } : {}),
  }));

  const isCoverRect = mode === InteractionMode.COVER_RECT;
  const rectStyle = useAnimatedStyle(() => ({
    display: rectState.isActive.value ? "flex" : "none",
    position: "absolute" as const,
    left: Math.min(rectState.startX.value, rectState.currentX.value),
    top: Math.min(rectState.startY.value, rectState.currentY.value),
    width: Math.abs(rectState.currentX.value - rectState.startX.value),
    height: Math.abs(rectState.currentY.value - rectState.startY.value),
    borderWidth: 2,
    borderColor: isCoverRect
      ? "rgba(30, 41, 59, 0.9)"
      : "rgba(50, 150, 255, 0.8)",
    backgroundColor: isCoverRect
      ? "rgba(15, 23, 42, 0.55)"
      : "rgba(50, 150, 255, 0.3)",
    zIndex: 1000,
  }));

  return (
    <GestureDetector gesture={gestures}>
      <Animated.View
        ref={containerRef}
        style={containerStyle}
        onLayout={transform.onContainerLayout}
      >
        <Animated.View style={panZoomStyle}>
          <MapSpaceProvider
            imageSize={imageSize}
            gridSpacing={gridSpacing}
            scale={scale}
            translationX={translationX}
            translationY={translationY}
            containerSize={containerSize}
          >
            {children}
          </MapSpaceProvider>
          <Animated.View style={rectStyle} pointerEvents="none" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
