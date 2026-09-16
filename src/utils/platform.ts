import { Platform } from "react-native";
import { useRef, useCallback } from "react";
import { Point } from "../types/common";

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Measures the true on-screen bounding rectangle of a component across Web and Native.
 * - On Web: synchronously queries getBoundingClientRect().
 * - On Native: asynchronously queries measureInWindow() to get exact window-relative coordinates.
 * The caller does NOT need to pass manual measurements or guess offsets.
 */
export function measureElement(
  element: any,
  callback: (bounds: BoundingBox | null) => void,
): void {
  if (!element) {
    callback(null);
    return;
  }

  // Web: Direct DOM query
  if (Platform.OS === "web") {
    const domNode = element?.node || element;
    if (typeof domNode?.getBoundingClientRect === "function") {
      const rect = domNode.getBoundingClientRect();
      callback({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
      return;
    }
  }

  // Native: React Native measureInWindow (includes status bar, navigation bar & safe area offsets)
  if (typeof element?.measureInWindow === "function") {
    element.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        callback({ left: x, top: y, width, height });
      },
    );
    return;
  }

  // Native fallback: measure()
  if (typeof element?.measure === "function") {
    element.measure(
      (
        _x: number,
        _y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number,
      ) => {
        callback({ left: pageX, top: pageY, width, height });
      },
    );
    return;
  }

  callback(null);
}

/**
 * Hook to automatically track the exact on-screen bounds of a view across both Web and Native
 * using onLayout and native measurement, requiring no manual measurements from the caller.
 */
export function useAutoMeasuredBounds(elementRef: React.RefObject<any>) {
  const boundsRef = useRef<BoundingBox>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const updateBounds = useCallback(() => {
    measureElement(elementRef.current, (box) => {
      if (box) {
        boundsRef.current = box;
      }
    });
  }, [elementRef]);

  const onLayout = useCallback(() => {
    updateBounds();
  }, [updateBounds]);

  return { boundsRef, onLayout, updateBounds };
}

/**
 * Converts an absolute screen point to container-relative coordinates.
 * On Web: uses the current DOM rect.
 * On Native: uses the automatically measured bounds.
 */
export function screenToContainer(
  screenPoint: Point,
  element: any,
  autoMeasuredBounds?: BoundingBox,
): Point {
  if (Platform.OS === "web") {
    const domNode = element?.node || element;
    if (typeof domNode?.getBoundingClientRect === "function") {
      const rect = domNode.getBoundingClientRect();
      return new Point(
        Math.max(0, Math.min(screenPoint.x - rect.left, rect.width)),
        Math.max(0, Math.min(screenPoint.y - rect.top, rect.height)),
      );
    }
  }

  if (autoMeasuredBounds && autoMeasuredBounds.width > 0) {
    return new Point(
      Math.max(
        0,
        Math.min(
          screenPoint.x - autoMeasuredBounds.left,
          autoMeasuredBounds.width,
        ),
      ),
      Math.max(
        0,
        Math.min(
          screenPoint.y - autoMeasuredBounds.top,
          autoMeasuredBounds.height,
        ),
      ),
    );
  }

  return screenPoint;
}
