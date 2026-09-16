import { useRef, useEffect, useCallback } from "react";
import { View } from "react-native";
import { useSharedValue, clamp } from "react-native-reanimated";
import { Point } from "../types/common";
import {
  measureElement,
  screenToContainer,
  BoundingBox,
} from "../utils/platform";

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

  // Auto-tracked on-screen bounds for native window coordinate conversion
  const containerBounds = useRef<BoundingBox>({
    left: 0,
    top: 0,
    width: containerSize.width,
    height: containerSize.height,
  });

  const updateContainerBounds = useCallback(() => {
    measureElement(containerRef.current, (box) => {
      if (box) {
        containerBounds.current = box;
      }
    });
  }, []);

  const onContainerLayout = useCallback(() => {
    updateContainerBounds();
  }, [updateContainerBounds]);

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
    scale,
    translationX,
    translationY,
    enableTransition,
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

  /**
   * Converts absolute screen coordinates (such as browser WheelEvent clientX/Y)
   * into coordinates relative to this container view.
   */
  const getContainerPoint = (screenPoint: Point): Point => {
    return screenToContainer(screenPoint, containerRef.current, containerBounds.current);
  };

  /**
   * Converts container-relative coordinates into content coordinates (accounting for pan & zoom).
   * Note: Touch coordinates from gesture events (event.x, event.y) are ALREADY container-relative.
   */
  const getContentPoint = (containerPoint: Point): Point => {
    const contentX = (containerPoint.x - translationX.value) / scale.value;
    const contentY = (containerPoint.y - translationY.value) / scale.value;
    return new Point(contentX, contentY);
  };

  /**
   * Convenience helper to convert absolute screen coordinates all the way to content coordinates.
   */
  const screenToContentPoint = (screenPoint: Point): Point => {
    const containerPoint = getContainerPoint(screenPoint);
    return getContentPoint(containerPoint);
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
    onContainerLayout,
    getContainerPoint,
    getContentPoint,
    screenToContentPoint,
    containerSize,
    contentSize,
  };
}

export type MapTransformState = ReturnType<typeof useMapTransform>;
