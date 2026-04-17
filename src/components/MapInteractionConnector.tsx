import React from "react";
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
import { Point } from "../types/common";

interface MapInteractionConnectorProps {
  transform: MapTransformState;
  minScale?: number;
  maxScale?: number;
  onScaleUpdate?: (scale: number) => void;
  onTouch?: (p: Point) => void;
  onDraw?: (p: Point) => void;
  onRectSelect?: (start: Point, end: Point) => void;
  mode: "pan" | "draw" | "rect";
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
    enabled: mode === "pan",
  });

  const eraseGesture = useEraseGesture({
    transform,
    onDraw,
    onTouch,
    enabled: mode === "draw",
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
    enabled: mode === "rect",
  });

  const gestures = Gesture.Race(panZoomGesture, eraseGesture, rectSelectGesture);

  const {
    translationX,
    translationY,
    scale,
    enableTransition,
    cursor,
    containerRef,
    containerSize,
  } = transform;

  const panZoomStyle = useAnimatedStyle(() => ({
    // @ts-ignore Ignore React Native's lack of support for template string transforms in some older TS definitions
    transform: `translate(${translationX.value}px, ${translationY.value}px) scale(${scale.value})`,
    transformOrigin: "0 0",
    transition: enableTransition.value ? "transform 0.15s ease-out" : "none",
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
          style={[
            {
              width: containerSize.width,
              height: containerSize.height,
              overflow: "hidden",
              // @ts-ignore web-only style property
              cursor: cursor,
            },
          ]}
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
