import React, { useState, useEffect } from "react";
import "../../styles/global.css";
import { View, Image, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import turbulence from "../../../assets/turbulence.svg";

interface SwitchPrimaryProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  className?: string;
}

const SwitchPrimary = ({
  value,
  onValueChange,
  className,
}: SwitchPrimaryProps) => {
  const progress = useSharedValue(value ? 1 : 0);

  const switchWidth = 56; // w-14 is 56px in Tailwind
  const thumbSize = 24; // h-6, w-6 is 24px
  const padding = 4;

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      mass: 0.8,
      damping: 15,
      stiffness: 200,
    });
  }, [value]);

  const handlePress = () => {
    console.log("Switch pressed");
    onValueChange(!value);
  };

  const activeOpacityStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const minTranslate = padding;
    const maxTranslate = switchWidth - thumbSize - padding;

    return {
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, 1],
            [minTranslate, maxTranslate],
          ),
        },
      ],
      width: interpolate(
        progress.value,
        [0, 0.5, 1],
        [thumbSize, thumbSize + 8, thumbSize],
      ),
    };
  });

  return (
    <Pressable
      onPress={handlePress}
      className={`${className || ""} h-8 w-14 justify-center active:scale-95 transition-transform duration-150`}
    >
      <View
        className="w-full h-full bg-base-300 rounded-full overflow-hidden border border-base-100 shadow-inner justify-center relative pointer-events-none"
        pointerEvents="none"
      >
        {/* Active Track Overlay */}
        <Animated.View
          className="absolute right-0 bottom-0 left-0 top-0 bg-secondary-lighter"
          style={activeOpacityStyle}
        />

        <Image
          className="opacity-30 mix-blend-overlay h-full w-full absolute pointer-events-none"
          source={turbulence}
          resizeMode="repeat"
        />

        {/* Thumb */}
        <Animated.View
          className="absolute h-6 bg-base-100 rounded-full shadow-lg border border-base-200"
          style={[{ left: 0 }, thumbStyle]}
        />
      </View>
    </Pressable>
  );
};

export default SwitchPrimary;
