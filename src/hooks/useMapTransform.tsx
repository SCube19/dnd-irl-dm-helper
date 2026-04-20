import { useRef, useEffect } from "react";
import { View } from "react-native";
import { useSharedValue, clamp } from "react-native-reanimated";
import { Point } from "../types/common";

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
  const prevTranslationX = useSharedValue(0);
  const prevTranslationY = useSharedValue(0);

  const scale = useSharedValue(initialScale);
  const containerRef = useRef<View>(null);
  const hasCentered = useRef(false);

  const enableTransition = useSharedValue(false);
  const defaultCursor = "move";
  const cursor = useSharedValue(defaultCursor);
  const cursorChangeTimer = useRef<NodeJS.Timeout | null>(null);

  // Re-center ONLY ONCE when sizes change (useful for initial load where contentSize starts at 0,0)
  useEffect(() => {
    if (
      contentSize.width > 0 &&
      contentSize.height > 0 &&
      !hasCentered.current
    ) {
      translationX.value =
        containerSize.width / 2 - (contentSize.width * scale.value) / 2;
      translationY.value =
        containerSize.height / 2 - (contentSize.height * scale.value) / 2;
      hasCentered.current = true;

      // Delay enabling the pan zoom transition to avoid animating from 0,0 origin
      setTimeout(() => {
        enableTransition.value = true;
      }, 50);
    }
  }, [
    containerSize.width,
    containerSize.height,
    contentSize.width,
    contentSize.height,
  ]);

  function setTranslation(xValue: number, yValue: number) {
    const minPixelsVisible = 100;
    const maxTranslateX = containerSize.width - minPixelsVisible;
    const maxTranslateY = containerSize.height - minPixelsVisible;
    const minTranslateX = minPixelsVisible - contentSize.width * scale.value;
    const minTranslateY = minPixelsVisible - contentSize.height * scale.value;
    translationX.value = clamp(xValue, minTranslateX, maxTranslateX);
    translationY.value = clamp(yValue, minTranslateY, maxTranslateY);
  }

  function setCursor(newCursor: string = defaultCursor, resetTimeout?: number) {
    if (cursorChangeTimer.current) {
      clearTimeout(cursorChangeTimer.current);
    }
    if (resetTimeout !== undefined) {
      cursorChangeTimer.current = setTimeout(
        () => (cursor.value = defaultCursor),
        resetTimeout,
      );
    }
    cursor.value = newCursor;
  }

  const getContainerPoint = (absolute: Point): Point => {
    const rect = (containerRef.current as any)?.getBoundingClientRect?.();
    if (!rect) return absolute; // fallback
    const containerX = clamp(absolute.x - rect.left, 0, rect.width);
    const containerY = clamp(absolute.y - rect.top, 0, rect.height);
    return { x: containerX, y: containerY };
  };

  const getContentPoint = (absolute: Point): Point => {
    const containerPoint = getContainerPoint(absolute);
    const contentX = (containerPoint.x - translationX.value) / scale.value;
    const contentY = (containerPoint.y - translationY.value) / scale.value;
    return { x: contentX, y: contentY };
  };

  return {
    translationX,
    translationY,
    prevTranslationX,
    prevTranslationY,
    scale,
    containerRef,
    enableTransition,
    cursor,
    setTranslation,
    setCursor,
    getContainerPoint,
    getContentPoint,
    containerSize,
    contentSize,
  };
}

export type MapTransformState = ReturnType<typeof useMapTransform>;
