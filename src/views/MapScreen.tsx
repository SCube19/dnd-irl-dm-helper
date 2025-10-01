import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Image,
  Modal,
  Dimensions,
  ImageComponent,
  Platform,
} from "react-native";
import PanZoom from "../utils/PanZoom";

function MapScreen({ route }) {
  //   const mapImage = [
  //     {
  //       url: "",
  //       props: {
  //         source: route.params.map,
  //       },
  //     },
  //   ];
  const mapImage: NodeJS.Require = require("../../assets/placeholders/1.png");
  //   if (Platform.OS === "web") {
  //     Image.resolveAssetSource = (source) => {
  //       uri: source;
  //     };
  //   }

  //   const imageInfo: ImageComponent = Image.resolveAssetSource(mapImage);

  //   return (
  //     <SafeAreaView className="bg-base-200 h-full w-screen">
  //       <PanPinchView
  //         minScale={0.25}
  //         maxScale={5}
  //         initialScale={1}
  //         containerDimensions={{
  //           width: Dimensions.get("window").width,
  //           height: Dimensions.get("window").height,
  //         }}
  //       >
  //         <Image source={mapImage} />
  //       </PanPinchView>
  //     </SafeAreaView>
  //   );

  return (
    <SafeAreaView className="bg-base-200 h-full w-screen">
      <View
        style={{
          width: 1200,
          height: 1200,
          display: "flex",
          backgroundColor: "red",
        }}
      >
        <PanZoom
          contentSize={{ width: 1000, height: 1000 }}
          containerSize={{ width: 1200, height: 1200 }}
          maxScale={5}
          minScale={0.25}
          initialScale={1}
        >
          <Image
            source={mapImage}
            style={{
              width: 1000,
              height: 1000,
            }}
          />
        </PanZoom>
      </View>
    </SafeAreaView>
  );
}

export default MapScreen;
