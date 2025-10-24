import React, { memo, useEffect, useRef, useState } from "react";
import { View, SafeAreaView, Image, Dimensions } from "react-native";
import PanZoomTouch from "../components/PanZoomTouch";
import "../styles/global.css";
import { clamp } from "react-native-reanimated";
import FogShader from "../shaders/FogShader";
import { Point } from "../types/common";
import { useSet } from "../utils/hooks";

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
  const lineWidth: number = clamp(scaleInverse, 0.4, 3);
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

  const [revealedSquares, setRevealedSquares] = useState<Set<Point>>(new Set());
  const revealedSquareDict = useRef<Record<string, Point>>({});
  const revealSquares = (e: Point) => {
    if (e.x < 0 || e.y < 0 || e.x > imageSize.width || e.y > imageSize.height)
      return;
    const clickedSquare: Point = new Point(
      Math.floor(e.x / gridSpacing),
      Math.floor(e.y / gridSpacing)
    );
    console.log(clickedSquare.toString());
    if (clickedSquare.toString() in revealedSquareDict.current) {
      delete revealedSquareDict.current[clickedSquare.toString()];
    } else revealedSquareDict.current[clickedSquare.toString()] = clickedSquare;

    setRevealedSquares(new Set(Object.values(revealedSquareDict.current)));
  };

  //TODO: Map should be it's own component in the final product
  //So everything inside PanZoomTouch goes into its own thing
  return (
    <SafeAreaView className="bg-base-200 h-full w-screen">
      <View
        style={{
          width: containerSize.width,
          height: containerSize.height,
        }}
        className="bg-base-300"
      >
        <PanZoomTouch
          contentSize={{ width: imageSize.width, height: imageSize.height }}
          containerSize={{
            width: containerSize.width,
            height: containerSize.height,
          }}
          maxScale={maxScale}
          minScale={minScale}
          initialScale={initialScale}
          onScaleUpdate={(newScale) => setScale(newScale)}
          onTouch={revealSquares}
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
            <View className="w-full h-full absolute z-20 left-0 top-0">
              <FogShader
                shaderSize={{
                  width: imageSize.width,
                  height: imageSize.height,
                }}
                squareSize={{
                  width: gridSpacing,
                  height: gridSpacing,
                }}
                revealedSquares={revealedSquares}
              ></FogShader>
            </View>
            <MapGrid
              gridSpacing={gridSpacing}
              color={gridColor}
              gridSize={{ width: imageSize.width, height: imageSize.height }}
              scale={scale}
            ></MapGrid>
          </View>
        </PanZoomTouch>
      </View>
    </SafeAreaView>
  );
}

export default MapScreen;
