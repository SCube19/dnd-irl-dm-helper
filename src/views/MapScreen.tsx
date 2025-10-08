import React, { use, useEffect, useState } from "react";
import {
  View,
  SafeAreaView,
  Image,
  Dimensions,
  ImageLoadEventData,
  ImageSize,
} from "react-native";
import PanZoom from "../utils/PanZoom";
import "../styles/global.css";
import mapImage from "../../assets/placeholders/1.png";
import resolveAssetSource from "resolveAssetSource";
import { clamp } from "react-native-reanimated";

interface MapScreenProps {
  route: string;
}

interface MapGridProps {
  gridSize: number;
  color: string;
  containerSize: { width: number; height: number };
  scale: number;
}

function MapGrid({ gridSize, color, containerSize, scale }: MapGridProps) {
  const scaleInverse = 1 / scale;
  const gridWidth: number = 9 * containerSize.width * scaleInverse;
  const gridHeight: number = 9 * containerSize.height * scaleInverse;
  const displacementX: number = Math.floor(gridWidth / 3 / gridSize) * gridSize;
  const displacementY: number =
    Math.floor(gridHeight / 3 / gridSize + 1) * gridSize;
  const lineWidth: number = clamp(scaleInverse, 0.6, 1.5);

  const gridStyle = {
    // We use two repeating linear gradients, one for vertical lines and one for horizontal lines.
    backgroundImage: `
      repeating-linear-gradient(0deg, ${color}, ${color} ${lineWidth}px, transparent ${lineWidth}px, transparent ${gridSize}px),
      repeating-linear-gradient(90deg, ${color}, ${color} ${lineWidth}px, transparent ${lineWidth}px, transparent ${gridSize}px)
    `,
    backgroundSize: `${gridSize}px ${gridSize}px`,
    position: "absolute",
    zIndex: "999",
    top: -displacementX,
    left: -displacementY,
    width: gridWidth,
    height: gridHeight,
    backgroundBlendMode: "difference",
  };

  return <View style={gridStyle}></View>;
}

function MapScreen({ route }: MapScreenProps) {
  const mapImage = require("../../assets/placeholders/1.png");
  const originalImageSize = {
    width: mapImage.width,
    height: mapImage.height,
  };
  const [imageSize, setImageSize] = useState({
    width: mapImage.width,
    height: mapImage.height,
  });

  useEffect(() => {
    Image.getSize(mapImage.toString(), (width, height) => {
      console.log(width);
      setImageSize({ width, height });
    });
  });

  const [containerSize, setContainerSize] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      "change",
      ({ window, screen }) => {
        setContainerSize({ width: window.width, height: window.height });
      }
    );
    return () => subscription?.remove();
  });

  const [gridSize, setGridSize] = useState<number>(15);
  const color: string = "#ddddddb0";
  const [scale, setScale] = useState<number>(1);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  useEffect(() => {
    if (snapToGrid) {
      const snappedWidth =
        Math.floor(originalImageSize.width / gridSize) * gridSize;
      const snappedHeight =
        Math.floor(originalImageSize.height / gridSize) * gridSize;
      const deltaWidth = Math.abs(originalImageSize.width - snappedWidth);
      const deltaHeight = Math.abs(originalImageSize.height - snappedHeight);
      const snappedSize =
        deltaWidth < deltaHeight ? snappedWidth : snappedHeight;
      setImageSize({ width: snappedSize, height: snappedSize });
    } else {
      setImageSize(originalImageSize);
    }
  }, [snapToGrid, gridSize]);

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
          maxScale={5}
          minScale={0.25}
          initialScale={1}
          onScaleUpdate={(scale) => setScale(scale)}
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
            <MapGrid
              gridSize={gridSize}
              color={color}
              containerSize={containerSize}
              scale={scale}
            ></MapGrid>
          </View>
        </PanZoom>
      </View>
    </SafeAreaView>
  );
}

export default MapScreen;
