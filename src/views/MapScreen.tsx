import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  SafeAreaView,
  Image,
  useWindowDimensions,
  Text,
} from "react-native";
import "../styles/global.css";
import { useMapTransform } from "../hooks/useMapTransform";
import * as MapDataStorage from "../utils/MapDataStorage";
import { InteractionMode } from "../types/common";
import {
  LayerOrchestrator,
  OrchestratedInteractionConnector,
  FogLayer,
  GridLayer,
  TokenLayer,
  UILayer,
  MapSpaceLayerView,
  LAYER_Z,
} from "../layers";

const maxScale = 5;
const minScale = 0.25;
const initialScale = 1;
const maxResolution = 1024;

interface MapScreenProps {
  route: any;
}

/** Size of a stored image URI or a bundled asset (e.g. the placeholder map). */
function getImageDimensions(
  uri: string | number,
): Promise<{ width: number; height: number }> {
  const fallback = { width: maxResolution, height: maxResolution };
  if (typeof uri === "number") {
    const { width, height } = Image.resolveAssetSource(uri) ?? {};
    return Promise.resolve(width && height ? { width, height } : fallback);
  }
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(fallback),
    );
  });
}

function MapScreen({ route }: MapScreenProps) {
  const { map: mapUri } = route.params || {};

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [currentDisplayUri, setCurrentDisplayUri] = useState<any>(mapUri);
  const [mapName, setMapName] = useState<string>("");
  const [gridSpacing, setGridSpacing] = useState<number>(15);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(
    InteractionMode.PAN,
  );

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const containerSize = useMemo(
    () => ({ width: windowWidth, height: windowHeight }),
    [windowWidth, windowHeight],
  );
  const mapTransform = useMapTransform(containerSize, imageSize, initialScale);

  useEffect(() => {
    const loadInit = async () => {
      if (!mapUri) return;

      const session = await MapDataStorage.getMapData(mapUri);
      const displayUri = session.imageUri || mapUri;
      const originalSize = await getImageDimensions(displayUri);
      const maxDim = Math.max(originalSize.width, originalSize.height);
      const downScale = maxDim > maxResolution ? maxDim / maxResolution : 1;

      setImageSize({
        width: originalSize.width / downScale,
        height: originalSize.height / downScale,
      });
      setGridSpacing(session.gridSpacing || 15);
      setMapName(session.name || "Unnamed Map");
      setCurrentDisplayUri(displayUri);
      setIsLoading(false);
    };

    loadInit();
  }, [mapUri]);

  const handleSave = useCallback(async () => {
    if (!mapUri) return;
    await MapDataStorage.saveMapData(mapUri, {
      name: mapName,
      gridSpacing,
      imageUri: currentDisplayUri,
    });
    alert("Map state saved!");
  }, [mapUri, mapName, gridSpacing, currentDisplayUri]);

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
        style={{ width: containerSize.width, height: containerSize.height }}
        className="bg-base-300"
      >
        <LayerOrchestrator>
          <OrchestratedInteractionConnector
            transform={mapTransform}
            imageSize={imageSize}
            gridSpacing={gridSpacing}
            maxScale={maxScale}
            minScale={minScale}
            mode={
              interactionMode === InteractionMode.GRID
                ? InteractionMode.PAN
                : interactionMode
            }
          >
            <MapSpaceLayerView zIndex={LAYER_Z.MAP}>
              <Image
                source={
                  typeof currentDisplayUri === "string"
                    ? { uri: currentDisplayUri }
                    : currentDisplayUri
                }
                style={{ width: imageSize.width, height: imageSize.height }}
              />
            </MapSpaceLayerView>
            <GridLayer />
            <TokenLayer />
            <FogLayer />
          </OrchestratedInteractionConnector>

          <LayerOrchestrator.Layer order={10} passThrough>
            <UILayer
              mapName={mapName}
              onMapNameChange={setMapName}
              gridSpacing={gridSpacing}
              onGridSpacingChange={setGridSpacing}
              onSave={handleSave}
              interactionMode={interactionMode}
              onInteractionModeChange={setInteractionMode}
            />
          </LayerOrchestrator.Layer>
        </LayerOrchestrator>
      </View>
    </SafeAreaView>
  );
}

export default MapScreen;
