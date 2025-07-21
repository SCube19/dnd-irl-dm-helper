import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView } from "react-native";
import ButtonPrimary from "./src/components/buttons/ButtonPrimary";
import ButtonSecondary from "./src/components/buttons/ButtonSecondary";
import Card from "./src/components/cards/Card";
import MapCard from "./src/components/cards/MapCard";

import "./src/styles/global.css";

export default function App() {
  const maps = [
    require("./assets/placeholders/1.png"),
    require("./assets/placeholders/2.png"),
    require("./assets/placeholders/3.png"),
    require("./assets/placeholders/4.png"),
  ];

  return (
    <SafeAreaView className="bg-base-200 h-full w-screen">
      <View>
        <View className="m-10">
          <ButtonPrimary onClick={() => console.log("Button clicked!")}>
            Click Me
          </ButtonPrimary>
        </View>
        <View className="m-10">
          <ButtonSecondary>I'm second option</ButtonSecondary>
        </View>
        <Card></Card>
        <View className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-5 w-3/4 mx-auto">
          <MapCard></MapCard>
          {maps.map((map, index) => (
            <MapCard key={index} photoUri={map} />
          ))}
          {maps.map((map, index) => (
            <MapCard key={index} photoUri={map} />
          ))}
          {maps.map((map, index) => (
            <MapCard key={index} photoUri={map} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
