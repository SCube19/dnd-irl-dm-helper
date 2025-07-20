import React from "react";
import "../../styles/global.css";
import { Image, StyleSheet } from "react-native";

import turbulence from "../../../assets/turbulence.svg";

const ButtonPrimary = ({
  onClick,
  children,
}: {
  onClick?: () => void;
  children?: React.ReactNode;
}) => {
  return (
    <button
      onClick={onClick}
      className={`bg-primary h-field transition-colors transform hover:bg-primary-dark text-content-primary text-size-selector px-box font-bold border-primary-darker border-selector font rounded-field  focus:outline-none justify-center flex flex-nowrap items-center active:scale-[0.99] active:translate-y-0.5 relative overflow-hidden shadow-md active:shadow-sm`}
    >
      <Image
        className="opacity-30 bg-blend-overlay h-full w-full"
        source={turbulence}
        style={styles.cover}
      ></Image>
      {children}
    </button>
  );
};

export default ButtonPrimary;

const styles = StyleSheet.create({
  cover: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
});
