import React from "react";
import { View } from "react-native";

const Card = ({ children }: { children?: React.ReactNode }) => {
  return (
    <View
      className={`
        bg-base-100 rounded-box border-box border-base-300 p-box w-fit h-fit`}
    >
      {children}
    </View>
  );
};

export default Card;
