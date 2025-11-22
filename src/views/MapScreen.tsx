import React, { memo, useEffect, useRef, useState } from "react";
import {
  View,
  SafeAreaView,
  Image,
  Dimensions,
  ImageURISource,
} from "react-native";
import PanZoomTouch from "../components/PanZoomTouch";
import "../styles/global.css";
import { clamp } from "react-native-reanimated";
import FogShader from "../shaders/FogShader";
import { Measure, Point } from "../types/common";
import { useSet } from "../utils/hooks";
import SliderPrimary from "../components/sliders/SliderPrimary";
import SwitchPrimary from "../components/switches/SwitchPrimary";
import { getMapData, saveMapData } from "../utils/MapDataStorage";

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
  const lineWidth: number = clamp(scaleInverse, 0.3, 3);
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

function MapScreen({ route }: any) {
  const map = route.params.map;

  const [originalImageSize, setOriginalImageSize] = useState({
    width: map.width ?? 0,
    height: map.height ?? 0,
  });

  const [gridSpacing, setGridSpacing] = useState<number>(15);
  const [scale, setScale] = useState<number>(1);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showFog, setShowFog] = useState<boolean>(true);
  const [interactionMode, setInteractionMode] = useState<"pan" | "draw">("pan");

  const [containerSize, setContainerSize] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  const gridColor: string = "#ddddddb0";

  let imageSize = {
    width: originalImageSize.width,
    height: originalImageSize.height,
  };

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setContainerSize({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (map.width && map.height) {
      setOriginalImageSize({ width: map.width, height: map.height });
    } else if (map.uri && originalImageSize.width === 0) {
      Image.getSize(map.uri, (width, height) => {
        setOriginalImageSize({ width, height });
      });
    }
  }, [map]);

  if (snapToGrid) {
    const snappedWidth =
      Math.floor(originalImageSize.width / gridSpacing) * gridSpacing;
    const snappedHeight =
      Math.floor(originalImageSize.height / gridSpacing) * gridSpacing;
    imageSize = { width: snappedWidth, height: snappedHeight };
  }

  const [revealedSquares, setRevealedSquares] = useState<Set<Point>>(new Set());
  const revealedSquareDict = useRef<Record<string, Point>>({});

  useEffect(() => {
    const loadData = async () => {
      if (map.uri) {
        const points = await getMapData(map.uri);
        revealedSquareDict.current = {};
        points.forEach((p) => {
          revealedSquareDict.current[p.toString()] = p;
        });
        setRevealedSquares(new Set(points));
      }
    };
    loadData();
  }, [map.uri]);

  useEffect(() => {
    const saveData = async () => {
      if (map.uri) {
        await saveMapData(map.uri, Array.from(revealedSquares));
      }
    };
    // Simple debounce could be added here if needed, but for now we save on every update
    // given the frequency of updates isn't extremely high (user taps).
    saveData();
  }, [revealedSquares, map.uri]);

  const revealSquares = (e: Point, eraseMode: boolean = false) => {
    if (e.x < 0 || e.y < 0 || e.x > imageSize.width || e.y > imageSize.height)
      return;
    const clickedSquare: Point = new Point(
      Math.floor(e.x / gridSpacing),
      Math.floor(e.y / gridSpacing)
    );
    if (clickedSquare.toString() in revealedSquareDict.current) {
      if (eraseMode) return;
      delete revealedSquareDict.current[clickedSquare.toString()];
    } else revealedSquareDict.current[clickedSquare.toString()] = clickedSquare;

    setRevealedSquares(new Set(Object.values(revealedSquareDict.current)));
  };

  if (originalImageSize.width === 0 || originalImageSize.height === 0) {
    return <View className="bg-base-200 h-full w-screen" />;
  }

  //TODO: Map should be it's own component in the final product
  //So everything inside PanZoomTouch goes into its own thing
  return (
    <SafeAreaView className="bg-base-200 h-full w-screen">
      <View>
        <SliderPrimary
          value={gridSpacing}
          onValueChange={setGridSpacing}
          minimumValue={1}
          maximumValue={100}
          step={1}
          className="w-full"
        />
        <SwitchPrimary
          value={showFog}
          onValueChange={setShowFog}
          className="w-10"
        />
        <SwitchPrimary
          value={interactionMode === "draw"}
          onValueChange={(val) => setInteractionMode(val ? "draw" : "pan")}
          className="w-10 ml-4"
        />
      </View>
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
          interactionMode={interactionMode}
          onDraw={(p) => revealSquares(p, true)}
        >
          <View
            style={{
              width: imageSize.width,
              height: imageSize.height,
              position: "relative",
            }}
          >
            <Image
              source={map}
              style={{
                width: imageSize.width,
                height: imageSize.height,
              }}
            />
            <View className="w-full h-full absolute z-20 left-0 top-0">
              {showFog && (
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
              )}
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
