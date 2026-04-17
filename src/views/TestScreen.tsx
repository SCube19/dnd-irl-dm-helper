import React from "react";
import { SafeAreaView } from "react-native";
import ButtonPrimary from "../components/buttons/ButtonPrimary";
import ButtonSecondary from "../components/buttons/ButtonSecondary";
import SliderPrimary from "../components/sliders/SliderPrimary";

function TestScreen() {
  return (
    <SafeAreaView className="bg-base-200 h-full w-screen">
      <ButtonPrimary>Test Button</ButtonPrimary>
      <ButtonSecondary>Test Button</ButtonSecondary>
      <SliderPrimary></SliderPrimary>
    </SafeAreaView>
  );
}

export default TestScreen;
