import React, { memo, Profiler, useEffect, useState } from "react";
import { View, SafeAreaView, Image, Dimensions } from "react-native";
import PanZoom from "../utils/PanZoom";
import "../styles/global.css";
import { clamp } from "react-native-reanimated";

interface MapScreenProps {
  route: string;
}

interface MapGridProps {
  gridSize: {
    width: number;
    height: number;
  };
  gridSpacing: number;
  color: string;
  scale: number;
}

const maxScale: number = 5;
const minScale: number = 0.25;
const initialScale: number = 1;

const MapGrid = memo(function MapGrid({
  gridSize,
  gridSpacing,
  color,
  scale,
}: MapGridProps) {
  const scaleInverse: number = 1 / scale;
  const lineWidth: number = clamp(scaleInverse, 0.6, 3);
  const gridStyle = {
    backgroundImage: `
      repeating-linear-gradient(0deg, ${color}, ${color} ${lineWidth}px, transparent 1px, transparent ${gridSpacing}px),
      repeating-linear-gradient(90deg, ${color}, ${color} ${lineWidth}px, transparent 1px, transparent ${gridSpacing}px)
    `,
    position: "absolute",
    zIndex: "5",
    top: 0,
    left: 0,
    width: gridSize.width,
    height: gridSize.height,
    backgroundBlendMode: "difference",
    mixBlendMode: "difference",
  };

  return <View style={gridStyle}></View>;
});

const fow = require("../../assets/fog.svg");
const mapImage = require("../../assets/placeholders/1.png");

const originalImageSize = {
  width: mapImage.width,
  height: mapImage.height,
};

function MapScreen({ route }: MapScreenProps) {
  const [gridSpacing, setGridSpacing] = useState<number>(15);
  const [scale, setScale] = useState<number>(1);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  const [containerSize, setContainerSize] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  const gridColor: string = "#ddddddb0";

  let imageSize = {
    width: mapImage.width,
    height: mapImage.height,
  };

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      "change",
      ({ window, screen }) => {
        setContainerSize({ width: window.width, height: window.height });
      }
    );
    return () => subscription?.remove();
  }, []);

  if (snapToGrid) {
    const snappedWidth =
      Math.floor(originalImageSize.width / gridSpacing) * gridSpacing;
    const snappedHeight =
      Math.floor(originalImageSize.height / gridSpacing) * gridSpacing;
    const deltaWidth = Math.abs(originalImageSize.width - snappedWidth);
    const deltaHeight = Math.abs(originalImageSize.height - snappedHeight);
    const snappedSize = deltaWidth < deltaHeight ? snappedWidth : snappedHeight;
    imageSize = { width: snappedSize, height: snappedSize };
  }

  const fowStyle = {
    width: "100%",
    height: "100%",
    position: "absolute",
    zIndex: "20",
    boxShadow: "25px 25px 50px 0 white inset, -25px -25px 50px 0 white inset",
  };

  return (
    <SafeAreaView className="bg-base-200 h-full w-screen">
      <View
        style={{
          width: containerSize.width,
          height: containerSize.height,
        }}
        className="bg-base-300"
      >
        <PanZoom
          contentSize={{ width: imageSize.width, height: imageSize.height }}
          containerSize={{
            width: containerSize.width,
            height: containerSize.height,
          }}
          maxScale={maxScale}
          minScale={minScale}
          initialScale={initialScale}
          onScaleUpdate={(newScale) => setScale(newScale)}
        >
          <View
            style={{
              width: imageSize.width,
              height: imageSize.height,
              position: "relative",
            }}
          >
            <Image
              source={mapImage}
              style={{
                width: imageSize.width,
                height: imageSize.height,
              }}
            />
            <Image source={fow} style={fowStyle}></Image>
            <MapGrid
              gridSpacing={gridSpacing}
              color={gridColor}
              gridSize={{ width: imageSize.width, height: imageSize.height }}
              scale={scale}
            ></MapGrid>
          </View>
        </PanZoom>
      </View>
    </SafeAreaView>
  );
}

export default MapScreen;
