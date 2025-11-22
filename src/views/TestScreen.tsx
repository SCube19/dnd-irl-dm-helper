import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, Image, Modal } from "react-native";
import ButtonPrimary from "../components/buttons/ButtonPrimary";
import ButtonSecondary from "../components/buttons/ButtonSecondary";
import Card from "../components/cards/Card";
import MapCard from "../components/cards/MapCard";
import UploadPopup from "../components/UploadPopup";
import { useNavigation } from "@react-navigation/native";
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
