import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  SafeAreaView,
  Image,
  useWindowDimensions,
  Text,
} from "react-native";
import { MapInteractionConnector } from "../components/MapInteractionConnector";
import { MapGrid } from "../components/MapGrid";
import { MapControlsOverlay } from "../components/MapControlsOverlay";
import "../styles/global.css";
import FogShader from "../shaders/FogShader";
import { useMapTransform } from "../hooks/useMapTransform";
import { useFogOfWar } from "../hooks/useFogOfWar";
import * as MapDataStorage from "../utils/MapDataStorage";
import { InteractionMode } from "../types/common";

interface MapScreenProps {
  route: any;
}

const maxScale: number = 5;
const minScale: number = 0.25;
const initialScale: number = 1;
const maxResolution = 1024;

function MapScreen({ route }: MapScreenProps) {
  const { map: mapUri } = route.params || {};

  const [scale, setScale] = useState<number>(1);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(
    InteractionMode.PAN,
  );
  const [eraseSize, setEraseSize] = useState<number>(1);

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);

  const [mapName, setMapName] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState(false);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const containerSize = { width: windowWidth, height: windowHeight };

  const gridColor: string = "#ddddddb0";

  const [fogOfWarVisible, setFogOfWarVisible] = useState<boolean>(true);

  const {
    gridSpacing,
    setGridSpacing,
    revealedSquares,
    loadInitialSquares,
    toggleSquareArea,
    handleDraw,
    onRectErase,
    getRevealedSquareValues,
    clearFogOfWar,
  } = useFogOfWar(imageSize, 15);

  // Load initial data
  useEffect(() => {
    const loadInit = async () => {
      if (!mapUri) return;

      const session = await MapDataStorage.getMapData(mapUri);
      const displayUri = session.imageUri || mapUri;

      const getDimensions = (): Promise<{ width: number; height: number }> => {
        if (typeof displayUri === "number") {
          const resolved = Image.resolveAssetSource(displayUri);
          return Promise.resolve({
            width: resolved.width,
            height: resolved.height,
          });
        }
        return new Promise((resolve) => {
          Image.getSize(displayUri, (width, height) =>
            resolve({ width, height }),
          );
        });
      };

      const originalSize = await getDimensions();
      const downScaleFactor =
        Math.max(originalSize.width, originalSize.height) > maxResolution
          ? Math.max(originalSize.width, originalSize.height) / maxResolution
          : 1;

      const calculatedSize = {
        width: originalSize.width / downScaleFactor,
        height: originalSize.height / downScaleFactor,
      };

      setImageSize(calculatedSize);
      setGridSpacing(session.gridSpacing || 15);
      setMapName(session.name || "Unnamed Map");
      loadInitialSquares(session.revealedSquares);
      setIsLoading(false);
    };

    loadInit();
  }, [mapUri, setGridSpacing, loadInitialSquares]);

  const mapTransform = useMapTransform(
    containerSize,
    { width: imageSize.width, height: imageSize.height },
    initialScale,
  );

  const [currentDisplayUri, setCurrentDisplayUri] = useState<any>(mapUri);

  useEffect(() => {
    const fetchUri = async () => {
      if (mapUri) {
        const session = await MapDataStorage.getMapData(mapUri);
        setCurrentDisplayUri(session.imageUri || mapUri);
      }
    };
    fetchUri();
  }, [mapUri]);

  const handleSave = async () => {
    if (!mapUri) return;
    await MapDataStorage.saveMapData(mapUri, {
      name: mapName,
      revealedSquares: getRevealedSquareValues(),
      gridSpacing: gridSpacing,
      imageUri: currentDisplayUri,
    });
    setIsEditingName(false);
    alert("Map state saved!");
  };

  const onDrawProxy = (p: { x: number; y: number }) => {
    handleDraw(p, eraseSize);
  };

  const onTouchProxy = (p: { x: number; y: number }) => {
    toggleSquareArea(p, eraseSize);
  };

  if (isLoading || imageSize.width === 0) {
    return (
      <SafeAreaView className="bg-base-200 h-full w-screen items-center justify-center">
        <Text className="text-content-base text-xl">Loading Map...</Text>
      </SafeAreaView>
    );
  }

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
          onTouch={onTouchProxy}
          onDraw={onDrawProxy}
          onRectSelect={onRectErase}
          mode={
            interactionMode === InteractionMode.GRID
              ? InteractionMode.PAN
              : interactionMode
          }
        >
          <View
            style={{
              width: imageSize.width,
              height: imageSize.height,
              position: "relative",
              opacity: isMapReady ? 1 : 0,
            }}
            className="transition-opacity duration-300"
          >
            <Image
              source={
                typeof currentDisplayUri === "string"
                  ? { uri: currentDisplayUri }
                  : currentDisplayUri
              }
              style={{
                width: imageSize.width,
                height: imageSize.height,
              }}
              onLoad={() => {
                setTimeout(() => setIsMapReady(true), 50);
              }}
            />
            <View className="w-full h-full absolute z-20 left-0 top-0">
              {fogOfWarVisible && (
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
        </MapInteractionConnector>

        <MapControlsOverlay
          handleSave={handleSave}
          isEditingName={isEditingName}
          setIsEditingName={setIsEditingName}
          mapName={mapName}
          setMapName={setMapName}
          interactionMode={interactionMode}
          setInteractionMode={setInteractionMode}
          eraseSize={eraseSize}
          setEraseSize={setEraseSize}
          gridSpacing={gridSpacing}
          setGridSpacing={setGridSpacing}
          clearFogOfWar={clearFogOfWar}
          fogOfWarVisible={fogOfWarVisible}
          setFogOfWarVisible={setFogOfWarVisible}
        />
      </View>
    </SafeAreaView>
  );
}

export default MapScreen;
