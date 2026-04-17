import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { clamp } from "react-native-reanimated";
import { MapTransformState } from "./useMapTransform";
import { Point } from "../types/common";

interface PanZoomGestureProps {
  transform: MapTransformState;
  minScale?: number;
  maxScale?: number;
  onScaleUpdate?: (scale: number) => void;
  enabled: boolean;
}

export function usePanZoomGesture({
  transform,
  minScale = 0.5,
  maxScale = 3,
  onScaleUpdate,
  enabled,
}: PanZoomGestureProps) {
  const {
    translationX,
    translationY,
    prevTranslationX,
    prevTranslationY,
    scale,
    enableTransition,
    setTranslation,
    setCursor,
    getContainerPoint,
  } = transform;

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .minDistance(1)
    .onBegin(() => {
      setCursor("grabbing");
    })
    .onStart(() => {
      prevTranslationX.value = translationX.value;
      prevTranslationY.value = translationY.value;
      enableTransition.value = false;
    })
    .onUpdate((event) => {
      setTranslation(
        prevTranslationX.value + event.translationX,
        prevTranslationY.value + event.translationY,
      );
    })
    .onEnd(() => {
      enableTransition.value = true;
      setCursor();
    })
    .runOnJS(true);

  if (Platform.OS === "web") {
    const handleWheel = useCallback(
      (e: WheelEvent) => {
        if (!enabled) return;

        setCursor("crosshair", 200);
        const zoomDelta = e.deltaY < 0 ? 1.2 : 1 / 1.2;
        const container: Point = getContainerPoint({
          x: e.clientX,
          y: e.clientY,
        });

        const newScale = clamp(scale.value * zoomDelta, minScale, maxScale);

        const preTransitionedX =
          (container.x - translationX.value) / scale.value;
        const preTransitionedY =
          (container.y - translationY.value) / scale.value;

        scale.value = newScale;
        onScaleUpdate?.(scale.value);

        setTranslation(
          container.x - preTransitionedX * scale.value,
          container.y - preTransitionedY * scale.value,
        );
      },
      [
        enabled,
        scale,
        minScale,
        maxScale,
        translationX,
        translationY,
        getContainerPoint,
        setTranslation,
        setCursor,
        onScaleUpdate,
      ],
    );

    useEffect(() => {
      window.addEventListener("wheel", handleWheel);
      return () => {
        window.removeEventListener("wheel", handleWheel);
      };
    }, [handleWheel]);
  }

  return panGesture;
}
