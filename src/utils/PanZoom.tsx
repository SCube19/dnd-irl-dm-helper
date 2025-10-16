import React, {
  createRef,
  memo,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  SharedValue,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { View, Platform } from "react-native";
import { clamp } from "react-native-reanimated";

interface PanZoomProps {
  containerSize: { width: number; height: number };
  contentSize: { width: number; height: number };
  children?: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  onScaleUpdate?: (scale: number) => void;
}

const PanZoom = memo(function PanZoom({
  containerSize,
  contentSize,
  children,
  minScale = 0.5,
  maxScale = 3,
  initialScale = 1,
  onScaleUpdate,
}: PanZoomProps) {
  const translationX = useSharedValue(
    containerSize.width / 2 - contentSize.width / 2
  );
  const translationY = useSharedValue(
    containerSize.height / 2 - contentSize.height / 2
  );
  const prevTranslationX = useSharedValue(0);
  const prevTranslationY = useSharedValue(0);

  const scale: SharedValue<number> = useSharedValue(initialScale);
  const containerRef: React.RefObject<View | null> = useRef(null);

  const enableTransition: SharedValue<boolean> = useSharedValue(true);

  const defaultCursor: string = "move";
  const cursor: SharedValue<string> = useSharedValue(defaultCursor);
  let cursorChangeTimer: NodeJS.Timeout | null = null;

  function setTranslation(xValue: number, yValue: number) {
    const minPixelsVisible: number = 100;
    const maxTranslateX = containerSize.width - minPixelsVisible;
    const maxTranslateY = containerSize.height - minPixelsVisible;
    const minTranslateX = minPixelsVisible - contentSize.width * scale.value;
    const minTranslateY = minPixelsVisible - contentSize.height * scale.value;
    translationX.value = clamp(xValue, minTranslateX, maxTranslateX);
    translationY.value = clamp(yValue, minTranslateY, maxTranslateY);
  }

  function setCursor(
    newCursor: string = defaultCursor,
    resetTimeout: number | undefined = undefined
  ) {
    clearTimeout(cursorChangeTimer);
    if (resetTimeout !== undefined) {
      cursorChangeTimer = setTimeout(
        () => (cursor.value = defaultCursor),
        resetTimeout
      );
    }
    cursor.value = newCursor;
  }

  const panZoomStyle = useAnimatedStyle(() => ({
    transform: `translate(${translationX.value}px, ${translationY.value}px) scale(${scale.value})`,
    transformOrigin: "0 0",
    transition: enableTransition.value ? "transform 0.15s ease-out" : "none",
  }));

  const pan = Gesture.Pan()
    .minDistance(1)
    .onBegin(() => {
      setCursor("grabbing");
    })
    .onStart(() => {
      prevTranslationX.value = translationX.value;
      prevTranslationY.value = translationY.value;
      enableTransition.value = false;
    })
    .onEnd(() => {
      enableTransition.value = true;
      setCursor();
    })
    .onUpdate((event) => {
      setTranslation(
        prevTranslationX.value + event.translationX,
        prevTranslationY.value + event.translationY
      );
    })
    .runOnJS(true);

  let gestureArray: any[] = [pan];
  if (Platform.OS == "web") {
    const handleWheel = useCallback((e: WheelEvent) => {
      setCursor("crosshair", 200);
      // Determine zoom direction and factor
      const zoomDelta = e.deltaY < 0 ? 1.2 : 1 / 1.2; // 10% zoom in/out

      // Get mouse position relative to container top-left
      const rect = containerRef.current?.getBoundingClientRect();
      const containerX = clamp(e.clientX - rect.left, 0, rect.width);
      const containerY = clamp(e.clientY - rect.top, 0, rect.height);

      const newScale = clamp(scale.value * zoomDelta, minScale, maxScale);

      // Revert all transforms on the point that is pointed to
      const preTransitionedX = (containerX - translationX.value) / scale.value;
      const preTransitionedY = (containerY - translationY.value) / scale.value;

      scale.value = newScale;
      onScaleUpdate?.(scale.value);

      // Set transition value so that we solve for translation in
      // scale * point_if_not_transformed + translation = point_if_transformed
      // So the point remains in the same position after new scale
      setTranslation(
        containerX - preTransitionedX * scale.value,
        containerY - preTransitionedY * scale.value
      );
    }, []);

    useEffect(() => {
      window.addEventListener("wheel", handleWheel);

      return () => {
        window.removeEventListener("wheel", handleWheel);
      };
    }, []);
  } else {
  }

  const gestures = Gesture.Race(...gestureArray);

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
              cursor: cursor,
            },
          ]}
        >
          <Animated.View style={panZoomStyle}>
            <Animated.View>{children}</Animated.View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
});

export default PanZoom;
