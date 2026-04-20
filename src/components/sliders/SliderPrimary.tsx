import React, { useState, useEffect, useCallback } from "react";
import "../../styles/global.css";
import { View, Image } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withTiming,
} from "react-native-reanimated";
import turbulence from "../../../assets/turbulence.svg";

interface SliderPrimaryProps {
  value?: number;
  onValueChange?: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  className?: string;
}

const SliderPrimary = ({
  value = 0,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.1,
  className,
}: SliderPrimaryProps) => {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const isPressed = useSharedValue(false);
  const lastEmittedValue = useSharedValue(value);

  useEffect(() => {
    const range = maximumValue - minimumValue;
    if (range > 0) {
      progress.value = (value - minimumValue) / range;
      lastEmittedValue.value = value;
    }
  }, [value, minimumValue, maximumValue]);

  const onUpdateJS = useCallback(
    (newVal: number) => {
      onValueChange?.(newVal);
    },
    [onValueChange],
  );

  const handleUpdate = (x: number) => {
    "worklet";
    if (width <= 0) return;

    const rawProgress = Math.max(0, Math.min(1, x / width));
    const range = maximumValue - minimumValue;
    let newValue = minimumValue + rawProgress * range;

    if (step > 0) {
      newValue =
        minimumValue + Math.round((newValue - minimumValue) / step) * step;
    }
    newValue = Math.max(minimumValue, Math.min(maximumValue, newValue));

    // VISUAL SNAPPING: Set progress to the snapped value
    progress.value = (newValue - minimumValue) / range;

    if (newValue !== lastEmittedValue.value) {
      lastEmittedValue.value = newValue;
      runOnJS(onUpdateJS)(newValue);
    }
  };

  const pan = Gesture.Pan()
    .onBegin((e) => {
      isPressed.value = true;
      handleUpdate(e.x);
    })
    .onUpdate((e) => {
      handleUpdate(e.x);
    })
    .onEnd(() => {
      const range = maximumValue - minimumValue;
      const rawValue = minimumValue + progress.value * range;
      const steppedValue =
        minimumValue + Math.round((rawValue - minimumValue) / step) * step;
      const clampedValue = Math.max(
        minimumValue,
        Math.min(maximumValue, steppedValue),
      );
      const snappedProgress = (clampedValue - minimumValue) / range;

      progress.value = withTiming(snappedProgress, { duration: 100 });
      if (clampedValue !== lastEmittedValue.value) {
        lastEmittedValue.value = clampedValue;
        runOnJS(onUpdateJS)(clampedValue);
      }
    })
    .onFinalize(() => {
      isPressed.value = false;
    });

  const tap = Gesture.Tap().onBegin((e) => {
    handleUpdate(e.x);
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withTiming(isPressed.value ? 1.2 : 1, { duration: 100 }) },
    ],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    minWidth: 16,
  }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className={`${className} h-6 justify-center`}
    >
      <GestureDetector gesture={gesture}>
        <View className="h-3 w-full">
          <View className="flex justify-center items-start w-full h-1.5 m-1 bg-base-300 rounded-full overflow-visible">
            <Animated.View
              className="flex justify-center items-end absolute h-4 bg-secondary-lighter rounded-full overflow-hidden shadow-sm"
              style={trackStyle}
            >
              <Image
                className="opacity-30 bg-blend-overlay h-full w-full absolute"
                source={turbulence}
                style={{ height: "100%", width: width, position: "absolute" }}
                resizeMode="repeat"
              />
              <Animated.View
                className="w-2 h-2 m-1 bg-base-200 rounded-full"
                style={thumbStyle}
              />
            </Animated.View>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
};

export default SliderPrimary;
