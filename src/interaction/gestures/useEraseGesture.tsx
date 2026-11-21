import { Gesture } from "react-native-gesture-handler";
import { MapTransformState } from "../../hooks/useMapTransform";
import { Point } from "../../types/common";

interface EraseGestureProps {
  transform: MapTransformState;
  onDraw?: (p: Point) => void;
  onTouch?: (p: Point) => void;
  enabled: boolean;
}

export function useEraseGesture({
  transform,
  onDraw,
  onTouch,
  enabled,
}: EraseGestureProps) {
  const { getContentPoint } = transform;

  const dragGesture = Gesture.Pan()
    .enabled(enabled)
    .minDistance(1)
    .onStart((e) => onDraw?.(getContentPoint({ x: e.x, y: e.y })))
    .onUpdate((e) => onDraw?.(getContentPoint({ x: e.x, y: e.y })))
    .runOnJS(true);

  const tapGesture = Gesture.Tap()
    .enabled(enabled)
    .maxDuration(250)
    .onStart((e) => onTouch?.(getContentPoint({ x: e.x, y: e.y })))
    .runOnJS(true);

  return Gesture.Race(dragGesture, tapGesture);
}
