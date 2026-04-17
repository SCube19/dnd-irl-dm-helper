import { Gesture } from "react-native-gesture-handler";
import { MapTransformState } from "./useMapTransform";
import { Point } from "../types/common";

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
    .onStart((event) => {
      onDraw?.(getContentPoint({ x: event.absoluteX, y: event.absoluteY }));
    })
    .onUpdate((event) => {
      onDraw?.(getContentPoint({ x: event.absoluteX, y: event.absoluteY }));
    })
    .runOnJS(true);

  const tapGesture = Gesture.Tap()
    .enabled(enabled)
    .maxDuration(250)
    .onStart((event) => {
      onTouch?.(getContentPoint({ x: event.absoluteX, y: event.absoluteY }));
    })
    .runOnJS(true);

  return Gesture.Race(dragGesture, tapGesture);
}
