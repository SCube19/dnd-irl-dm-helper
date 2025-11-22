import React, { useEffect } from "react";
import "../../styles/global.css";
import { View, Image, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
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
  const [width, setWidth] = React.useState(0);
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value]);

  const handlePress = () => {
    onValueChange(!value);
  };

  const trackStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100])}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [0, width - 16]),
      },
    ],
  }));

  return (
    <Pressable
      onPress={handlePress}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className={`${className} h-6 w-12 justify-center`}
    >
      <View className="flex justify-center items-begin w-full h-1.5 m-1 bg-base-300 rounded-full">
        {/* Active Track (Clipped) */}
        <Animated.View
          className="absolute h-4 bg-secondary-lighter rounded-full overflow-hidden shadow-sm"
          style={trackStyle}
        >
          <Image
            className="opacity-30 bg-blend-overlay h-full w-full absolute"
            source={turbulence}
            style={{ height: "100%", width: width, position: "absolute" }}
            resizeMode="repeat"
          />
        </Animated.View>

        {/* Thumb (Overlay to ensure visibility) */}
        <Animated.View className="absolute h-4 w-full justify-center pointer-events-none">
          <Animated.View
            className="w-2 h-2 bg-base-200 rounded-full shadow-sm absolute"
            style={[{ left: 4 }, thumbStyle]}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
};

export default SwitchPrimary;
