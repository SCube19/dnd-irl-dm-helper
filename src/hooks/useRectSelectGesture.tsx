import { Gesture } from "react-native-gesture-handler";
import { SharedValue } from "react-native-reanimated";
import { MapTransformState } from "./useMapTransform";
import { Point } from "../types/common";

export interface RectSelectState {
  isActive: SharedValue<boolean>;
  startX: SharedValue<number>;
  startY: SharedValue<number>;
  currentX: SharedValue<number>;
  currentY: SharedValue<number>;
}

interface RectSelectGestureProps {
  transform: MapTransformState;
  rectState: RectSelectState;
  onRectSelect?: (start: Point, end: Point) => void;
  enabled: boolean;
}

export function useRectSelectGesture({
  transform,
  rectState,
  onRectSelect,
  enabled,
}: RectSelectGestureProps) {
  const { getContentPoint } = transform;

  const dragGesture = Gesture.Pan()
    .enabled(enabled)
    .minDistance(1)
    .onStart((event) => {
      const pt = getContentPoint({ x: event.absoluteX, y: event.absoluteY });
      rectState.isActive.value = true;
      rectState.startX.value = pt.x;
      rectState.startY.value = pt.y;
      rectState.currentX.value = pt.x;
      rectState.currentY.value = pt.y;
    })
    .onUpdate((event) => {
      const pt = getContentPoint({ x: event.absoluteX, y: event.absoluteY });
      rectState.currentX.value = pt.x;
      rectState.currentY.value = pt.y;
    })
    .onEnd(() => {
      if (onRectSelect) {
        onRectSelect(
          new Point(rectState.startX.value, rectState.startY.value),
          new Point(rectState.currentX.value, rectState.currentY.value),
        );
      }
    })
    .onFinalize(() => {
      rectState.isActive.value = false;
    })
    .runOnJS(true);

  return dragGesture;
}
