import React from "react";
import { View } from "react-native";

const Card = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <View
      className={`bg-base-100/90 p-4 rounded-2xl shadow-xl flex-col border border-base-300 pointer-events-auto  ${className}`}
    >
      {children}
    </View>
  );
};

export default Card;
