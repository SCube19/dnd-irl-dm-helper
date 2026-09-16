import React from "react";
import { Platform } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { MapTransformState } from "../hooks/useMapTransform";
import { usePanZoomGesture } from "../hooks/usePanZoomGesture";
import { useEraseGesture } from "../hooks/useEraseGesture";
import { useRectSelectGesture } from "../hooks/useRectSelectGesture";
import { Point, InteractionMode } from "../types/common";

interface MapInteractionConnectorProps {
  transform: MapTransformState;
  minScale?: number;
  maxScale?: number;
  onScaleUpdate?: (scale: number) => void;
  onTouch?: (p: Point) => void;
  onDraw?: (p: Point) => void;
  onRectSelect?: (start: Point, end: Point) => void;
  mode: InteractionMode;
  children: React.ReactNode;
}

export const MapInteractionConnector = ({
  transform,
  minScale,
  maxScale,
  onScaleUpdate,
  onTouch,
  onDraw,
  onRectSelect,
  mode,
  children,
}: MapInteractionConnectorProps) => {
  const panZoomGesture = usePanZoomGesture({
    transform,
    minScale,
    maxScale,
    onScaleUpdate,
    enabled: mode === InteractionMode.PAN,
  });

  const eraseGesture = useEraseGesture({
    transform,
    onDraw,
    onTouch,
    enabled: mode === InteractionMode.DRAW,
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
    onRectSelect,
    enabled: mode === InteractionMode.RECT,
  });

  const gestures = Gesture.Race(panZoomGesture, eraseGesture, rectSelectGesture);

  const {
    translationX,
    translationY,
    scale,
    cursor,
    containerRef,
    containerSize,
  } = transform;

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

  const rectStyle = useAnimatedStyle(() => ({
    display: rectState.isActive.value ? "flex" : "none",
    position: "absolute" as const,
    left: Math.min(rectState.startX.value, rectState.currentX.value),
    top: Math.min(rectState.startY.value, rectState.currentY.value),
    width: Math.abs(rectState.currentX.value - rectState.startX.value),
    height: Math.abs(rectState.currentY.value - rectState.startY.value),
    borderWidth: 2,
    borderColor: "rgba(50, 150, 255, 0.8)",
    backgroundColor: "rgba(50, 150, 255, 0.3)",
    zIndex: 100,
  }));

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={gestures}>
        <Animated.View
          ref={containerRef}
          style={containerStyle}
          onLayout={transform.onContainerLayout}
        >
          <Animated.View style={panZoomStyle}>
            <Animated.View>
              {children}
              <Animated.View style={rectStyle} pointerEvents="none" />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};
