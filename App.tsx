import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView } from "react-native";
import ButtonPrimary from "./src/components/buttons/ButtonPrimary";
import ButtonSecondary from "./src/components/buttons/ButtonSecondary";
import Card from "./src/components/cards/Card";
import MapCard from "./src/components/cards/MapCard";

import "./src/styles/global.css";

export default function App() {
  return (
    <SafeAreaView>
      <View className="bg-base-200">
        <ButtonPrimary onClick={() => console.log("Button clicked!")}>
          Click Me
        </ButtonPrimary>
        <ButtonSecondary>I'm second option</ButtonSecondary>
        <Card></Card>
        <MapCard></MapCard>
      </View>
    </SafeAreaView>
  );
}
