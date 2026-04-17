import React, { memo, useRef, useState } from "react";
import {
  View,
  SafeAreaView,
  Image,
  useWindowDimensions,
  Text,
} from "react-native";
import { MapInteractionConnector } from "../components/MapInteractionConnector";
import ButtonSecondary from "../components/buttons/ButtonSecondary";
import SliderPrimary from "../components/sliders/SliderPrimary";
import "../styles/global.css";
import { clamp } from "react-native-reanimated";
import FogShader from "../shaders/FogShader";
import { Point } from "../types/common";
import { useMapTransform } from "../hooks/useMapTransform";

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
    position: "absolute" as const,
    zIndex: 5,
    top: 0,
    left: 0,
    width: gridSize.width,
    height: gridSize.height,
    backgroundBlendMode: "difference" as const,
    mixBlendMode: "difference" as const,
  };

  return <View style={gridStyle}></View>;
});

const mapImage = require("../../assets/placeholders/4.png");

const maxResolution = 1024;

const originalImageSize = {
  width: mapImage.width,
  height: mapImage.height,
};

function calculateImageSize(snapToGrid: boolean, gridSpacing: number) {
  const downScaleFactor: number =
    Math.max(mapImage.width, mapImage.height) > maxResolution
      ? Math.max(mapImage.width, mapImage.height) / maxResolution
      : 1;

  let imageSize = {
    width: mapImage.width / downScaleFactor,
    height: mapImage.height / downScaleFactor,
  };

  if (snapToGrid) {
    const snappedWidth =
      Math.floor(imageSize.width / gridSpacing) * gridSpacing;
    const snappedHeight =
      Math.floor(imageSize.height / gridSpacing) * gridSpacing;
    const deltaWidth = Math.abs(imageSize.width - snappedWidth);
    const deltaHeight = Math.abs(imageSize.height - snappedHeight);
    const snappedSize = deltaWidth < deltaHeight ? snappedWidth : snappedHeight;
    imageSize = { width: snappedSize, height: snappedSize };
  }
  return imageSize;
}

function MapScreen({ route }: MapScreenProps) {
  const [gridSpacing, setGridSpacing] = useState<number>(15);
  const [scale, setScale] = useState<number>(1);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [interactionMode, setInteractionMode] = useState<"pan" | "draw" | "rect">("pan");
  const [eraseSize, setEraseSize] = useState<number>(1);

  // useWindowDimensions automatically updates when screen size changes
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const containerSize = { width: windowWidth, height: windowHeight };

  const gridColor: string = "#ddddddb0";

  let imageSize = calculateImageSize(snapToGrid, gridSpacing);

  const mapTransform = useMapTransform(
    containerSize,
    { width: imageSize.width, height: imageSize.height },
    initialScale,
  );

  const [revealedSquares, setRevealedSquares] = useState<Set<Point>>(new Set());
  const revealedSquareDict = useRef<Record<string, Point>>({});

  const toggleSquareArea = (centerPoint: Point, size: number) => {
    const centerGridX = Math.floor(centerPoint.x / gridSpacing);
    const centerGridY = Math.floor(centerPoint.y / gridSpacing);
    
    const centerKey = new Point(centerGridX, centerGridY).toString();
    const isAdding = !(centerKey in revealedSquareDict.current);

    const startX = centerGridX - Math.floor(size / 2);
    const endX = centerGridX + Math.floor((size - 1) / 2) + 1;
    const startY = centerGridY - Math.floor(size / 2);
    const endY = centerGridY + Math.floor((size - 1) / 2) + 1;

    let changed = false;

    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        if (
          x >= 0 &&
          y >= 0 &&
          x * gridSpacing < imageSize.width &&
          y * gridSpacing < imageSize.height
        ) {
          const pt = new Point(x, y);
          const key = pt.toString();
          if (isAdding) {
            if (!(key in revealedSquareDict.current)) {
               revealedSquareDict.current[key] = pt;
               changed = true;
            }
          } else {
             if (key in revealedSquareDict.current) {
               delete revealedSquareDict.current[key];
               changed = true;
             }
          }
        }
      }
    }
    
    if (changed) setRevealedSquares(new Set(Object.values(revealedSquareDict.current)));
  };

  const handleDraw = (e: Point) => {
    const centerGridX = Math.floor(e.x / gridSpacing);
    const centerGridY = Math.floor(e.y / gridSpacing);

    const startX = centerGridX - Math.floor(eraseSize / 2);
    const endX = centerGridX + Math.floor((eraseSize - 1) / 2) + 1;
    const startY = centerGridY - Math.floor(eraseSize / 2);
    const endY = centerGridY + Math.floor((eraseSize - 1) / 2) + 1;

    let changed = false;

    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        if (
          x >= 0 &&
          y >= 0 &&
          x * gridSpacing < imageSize.width &&
          y * gridSpacing < imageSize.height
        ) {
          const pt = new Point(x, y);
          const key = pt.toString();
          if (!(key in revealedSquareDict.current)) {
            revealedSquareDict.current[key] = pt;
            changed = true;
          }
        }
      }
    }
    if (changed) setRevealedSquares(new Set(Object.values(revealedSquareDict.current)));
  };

  const revealSquares = (e: Point) => {
    toggleSquareArea(e, eraseSize);
  };

  const onRectErase = (start: Point, end: Point) => {
    const minX = Math.max(0, Math.floor(Math.min(start.x, end.x) / gridSpacing));
    const maxX = Math.min(Math.floor(imageSize.width / gridSpacing) - 1, Math.floor(Math.max(start.x, end.x) / gridSpacing));
    const minY = Math.max(0, Math.floor(Math.min(start.y, end.y) / gridSpacing));
    const maxY = Math.min(Math.floor(imageSize.height / gridSpacing) - 1, Math.floor(Math.max(start.y, end.y) / gridSpacing));

    let changed = false;
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const pt = new Point(x, y);
        const key = pt.toString();
        if (!(key in revealedSquareDict.current)) {
          revealedSquareDict.current[key] = pt;
          changed = true;
        }
      }
    }
    if (changed) setRevealedSquares(new Set(Object.values(revealedSquareDict.current)));
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
        <MapInteractionConnector
          transform={mapTransform}
          maxScale={maxScale}
          minScale={minScale}
          onScaleUpdate={(newScale) => setScale(newScale)}
          onTouch={revealSquares}
          onDraw={handleDraw}
          onRectSelect={onRectErase}
          mode={interactionMode}
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
        </MapInteractionConnector>

        {/* Draw Mode Toggle Overlay */}
        <View className="absolute top-6 right-6 z-50 bg-base-100 p-4 rounded-xl shadow-lg opacity-90 border border-base-300">
          <View className="flex-row gap-2">
            <ButtonSecondary onPress={() => setInteractionMode('pan')} className={`w-24 ${interactionMode !== 'pan' ? 'opacity-50' : ''}`}>Pan</ButtonSecondary>
            <ButtonSecondary onPress={() => setInteractionMode('draw')} className={`w-24 ${interactionMode !== 'draw' ? 'opacity-50' : ''}`}>Erase</ButtonSecondary>
            <ButtonSecondary onPress={() => setInteractionMode('rect')} className={`w-24 ${interactionMode !== 'rect' ? 'opacity-50' : ''}`}>Rect</ButtonSecondary>
          </View>
          {interactionMode === 'draw' && (
            <View className="mt-4 flex-row items-center w-full">
              <Text className="mr-4 font-bold text-content-base">Size: {eraseSize}</Text>
              <SliderPrimary 
                value={eraseSize} 
                onValueChange={setEraseSize}
                minimumValue={1}
                maximumValue={7}
                step={2}
                className="w-48"
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default MapScreen;
