import React from "react";
import "../../styles/global.css";
import { Image, Pressable, Text } from "react-native";

import turbulence from "../../../assets/turbulence.svg";

const ButtonSecondary = ({
  onClick,
  children,
}: {
  onClick?: () => void;
  children?: React.ReactNode;
}) => {
  return (
    <Pressable
      onClick={onClick}
      className={`bg-base-200 h-field transition-colors transform hover:bg-base-300 text-content-base-200 text-size-selector px-box font-bold border-base-300 border-selector font rounded-field  focus:outline-none justify-center flex flex-nowrap items-center active:scale-[0.99] active:translate-y-0.5 relative overflow-hidden shadow-md active:shadow-sm w-fit`}
    >
      <Image
        className="absolute opacity-30 bg-blend-overlay h-full w-full"
        source={turbulence}
      ></Image>
      <Text className="text-content-base-200 font-bold">{children}</Text>
    </Pressable>
  );
};

export default ButtonSecondary;
