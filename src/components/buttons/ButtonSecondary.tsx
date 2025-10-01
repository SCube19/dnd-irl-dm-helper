import React from "react";
import "../../styles/global.css";
import { Image, Pressable, Text } from "react-native";

import turbulence from "../../../assets/turbulence.svg";

const ButtonSecondary = ({
  onPress,
  children,
  className,
}: {
  onPress?: () => void;
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <Pressable
      onPress={onPress}
      className={`${className} bg-base-200 h-field transition-colors transform hover:bg-base-300 text-content-base-200 text-size-selector px-box font-bold border-base-300 border-selector font rounded-field  focus:outline-none justify-center flex flex-nowrap items-center active:scale-[0.99] active:translate-y-0.5 relative overflow-hidden shadow-md active:shadow-sm`}
    >
      <Image
        className="absolute opacity-30 bg-blend-overlay"
        source={turbulence}
        style={{ height: "100%", width: "100%" }}
      ></Image>
      <Text className="text-content-base-200 font-bold">{children}</Text>
    </Pressable>
  );
};

export default ButtonSecondary;
