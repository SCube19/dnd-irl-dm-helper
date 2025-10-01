import React from "react";
import "../../styles/global.css";
import { Image, Pressable, StyleSheet, Text } from "react-native";

import turbulence from "../../../assets/turbulence.svg";

const ButtonPrimary = ({
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
      className={`${className} bg-primary h-field transition-colors transform hover:bg-primary-dark text-content-primary text-size-selector px-box font-bold border-primary-dark border-selector font rounded-field  focus:outline-none justify-center flex flex-nowrap items-center active:scale-[0.99] active:translate-y-0.5 relative overflow-hidden shadow-md active:shadow-sm`}
    >
      <Image
        className="opacity-30 bg-blend-overlay h-full w-full absolute"
        source={turbulence}
        style={{ height: "100%", width: "100%" }}
      ></Image>
      <Text className="text-content-primary font-bold">{children}</Text>
    </Pressable>
  );
};

export default ButtonPrimary;
