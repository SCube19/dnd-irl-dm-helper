import React, { useState, useEffect } from "react";
import "../../styles/global.css";
import { View, Image } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
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

  useEffect(() => {
    const range = maximumValue - minimumValue;
    if (range > 0) {
      progress.value = (value - minimumValue) / range;
    }
  }, [value, minimumValue, maximumValue]);

  const updateValue = (newProgress: number) => {
    const range = maximumValue - minimumValue;
    let newValue = minimumValue + newProgress * range;
    if (step > 0) {
      newValue = Math.round(newValue / step) * step;
    }
    newValue = Math.max(minimumValue, Math.min(maximumValue, newValue));
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  const pan = Gesture.Pan()
    .onBegin((e) => {
      isPressed.value = true;
      if (width > 0) {
        const newProgress = Math.max(0, Math.min(1, e.x / width));
        progress.value = newProgress;
        runOnJS(updateValue)(newProgress);
      }
    })
    .onUpdate((e) => {
      if (width > 0) {
        const newProgress = Math.max(0, Math.min(1, e.x / width));
        progress.value = newProgress;
        runOnJS(updateValue)(newProgress);
      }
    })
    .onEnd(() => {
      const range = maximumValue - minimumValue;
      const rawValue = minimumValue + progress.value * range;
      const steppedValue = Math.round(rawValue / step) * step;
      const clampedValue = Math.max(
        minimumValue,
        Math.min(maximumValue, steppedValue)
      );
      const snappedProgress = (clampedValue - minimumValue) / range;

      progress.value = withTiming(snappedProgress, { duration: 100 });
      runOnJS(updateValue)(snappedProgress);
    })
    .onFinalize(() => {
      isPressed.value = false;
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withTiming(isPressed.value ? 1.1 : 1, { duration: 100 }) },
    ],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1, justifyContent: "center" }}>
      <GestureDetector gesture={pan}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          className={`${className} h-6 justify-center`}
        >
          <View className="flex justify-center items-begin w-full h-1.5 m-1 bg-base-300 rounded-full">
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
    </GestureHandlerRootView>
  );
};

export default SliderPrimary;
