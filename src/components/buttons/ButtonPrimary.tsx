import React from "react";
import "../../styles/global.css";
import { Image, Pressable, StyleSheet, Text } from "react-native";

import turbulence from "../../../assets/turbulence.svg";

const ButtonPrimary = ({
  onClick,
  children,
}: {
  onClick?: () => void;
  children?: React.ReactNode;
}) => {
  return (
    <Pressable
      onClick={onClick}
      className={`bg-primary h-field transition-colors transform hover:bg-primary-dark text-content-primary text-size-selector px-box font-bold border-primary-dark border-selector font rounded-field  focus:outline-none justify-center flex flex-nowrap items-center active:scale-[0.99] active:translate-y-0.5 relative overflow-hidden shadow-md active:shadow-sm w-fit`}
    >
      <Image
        className="opacity-30 bg-blend-overlay h-full w-full absolute"
        source={turbulence}
      ></Image>
      <Text className="text-content-primary font-bold">{children}</Text>
    </Pressable>
  );
};

export default ButtonPrimary;
