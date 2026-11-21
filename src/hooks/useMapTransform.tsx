import { useRef, useEffect, useCallback } from "react";
import { View } from "react-native";
import { useSharedValue, clamp } from "react-native-reanimated";
import { Point } from "../types/common";
import {
  measureElement,
  screenToContainer,
  BoundingBox,
} from "../utils/platform";

const DEFAULT_CURSOR = "move";
const MIN_PIXELS_VISIBLE = 100;

export function useMapTransform(
  containerSize: { width: number; height: number },
  contentSize: { width: number; height: number },
  initialScale: number = 1,
) {
  const translationX = useSharedValue(
    containerSize.width / 2 - contentSize.width / 2,
  );
  const translationY = useSharedValue(
    containerSize.height / 2 - contentSize.height / 2,
  );
  const scale = useSharedValue(initialScale);
  const cursor = useSharedValue(DEFAULT_CURSOR);
  const containerRef = useRef<View>(null);
  const hasCentered = useRef(false);
  const cursorChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerBounds = useRef<BoundingBox>({
    left: 0,
    top: 0,
    width: containerSize.width,
    height: containerSize.height,
  });

  const onContainerLayout = useCallback(() => {
    measureElement(containerRef.current, (box) => {
      if (box) containerBounds.current = box;
    });
  }, []);

  useEffect(() => {
    if (contentSize.width > 0 && contentSize.height > 0 && !hasCentered.current) {
      translationX.value =
        containerSize.width / 2 - (contentSize.width * scale.value) / 2;
      translationY.value =
        containerSize.height / 2 - (contentSize.height * scale.value) / 2;
      hasCentered.current = true;
    }
  }, [
    containerSize.width,
    containerSize.height,
    contentSize.width,
    contentSize.height,
    scale,
    translationX,
    translationY,
  ]);

  const setTranslation = useCallback(
    (x: number, y: number) => {
      translationX.value = clamp(
        x,
        MIN_PIXELS_VISIBLE - contentSize.width * scale.value,
        containerSize.width - MIN_PIXELS_VISIBLE,
      );
      translationY.value = clamp(
        y,
        MIN_PIXELS_VISIBLE - contentSize.height * scale.value,
        containerSize.height - MIN_PIXELS_VISIBLE,
      );
    },
    [
      containerSize.width,
      containerSize.height,
      contentSize.width,
      contentSize.height,
      scale,
      translationX,
      translationY,
    ],
  );

  const setCursor = useCallback(
    (newCursor: string = DEFAULT_CURSOR, resetTimeout?: number) => {
      if (cursorChangeTimer.current) clearTimeout(cursorChangeTimer.current);
      if (resetTimeout !== undefined) {
        cursorChangeTimer.current = setTimeout(
          () => (cursor.value = DEFAULT_CURSOR),
          resetTimeout,
        );
      }
      cursor.value = newCursor;
    },
    [cursor],
  );

  const getContainerPoint = useCallback(
    (screenPoint: Point): Point =>
      screenToContainer(
        screenPoint,
        containerRef.current,
        containerBounds.current,
      ),
    [],
  );

  const getContentPoint = useCallback(
    (containerPoint: Point): Point =>
      new Point(
        (containerPoint.x - translationX.value) / scale.value,
        (containerPoint.y - translationY.value) / scale.value,
      ),
    [scale, translationX, translationY],
  );

  return {
    translationX,
    translationY,
    scale,
    containerRef,
    cursor,
    setTranslation,
    setCursor,
    onContainerLayout,
    getContainerPoint,
    getContentPoint,
    containerSize,
  };
}

export type MapTransformState = ReturnType<typeof useMapTransform>;
