import { useEffect } from "react";
import { Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { clamp, useSharedValue } from "react-native-reanimated";
import { MapTransformState } from "../../hooks/useMapTransform";

interface PanZoomGestureProps {
  transform: MapTransformState;
  minScale?: number;
  maxScale?: number;
  enabled: boolean;
}

export function usePanZoomGesture({
  transform,
  minScale = 0.5,
  maxScale = 3,
  enabled,
}: PanZoomGestureProps) {
  const {
    translationX,
    translationY,
    scale,
    setTranslation,
    setCursor,
    getContainerPoint,
  } = transform;

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(scale.value);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .minDistance(5)
    .onBegin(() => setCursor("grabbing"))
    .onStart(() => {
      startX.value = translationX.value;
      startY.value = translationY.value;
    })
    .onUpdate((e) =>
      setTranslation(startX.value + e.translationX, startY.value + e.translationY),
    )
    .onFinalize(() => setCursor())
    .runOnJS(true);

  const pinchGesture = Gesture.Pinch()
    .enabled(enabled)
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(startScale.value * e.scale, minScale, maxScale);
    })
    .runOnJS(true);

  useEffect(() => {
    if (Platform.OS !== "web" || !enabled) return;

    const handleWheel = (e: WheelEvent) => {
      setCursor("crosshair", 200);
      const container = getContainerPoint({ x: e.clientX, y: e.clientY });
      const prev = scale.value;
      const next = clamp(prev * (e.deltaY < 0 ? 1.2 : 1 / 1.2), minScale, maxScale);
      const contentX = (container.x - translationX.value) / prev;
      const contentY = (container.y - translationY.value) / prev;
      scale.value = next;
      setTranslation(container.x - contentX * next, container.y - contentY * next);
    };

    window.addEventListener("wheel", handleWheel);
    return () => window.removeEventListener("wheel", handleWheel);
  }, [
    enabled,
    minScale,
    maxScale,
    scale,
    translationX,
    translationY,
    getContainerPoint,
    setTranslation,
    setCursor,
  ]);

  return Gesture.Simultaneous(panGesture, pinchGesture);
}
