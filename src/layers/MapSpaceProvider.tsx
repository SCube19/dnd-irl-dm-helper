import React, { createContext, useContext, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import type { SharedValue } from "react-native-reanimated";

export interface MapSpaceValue {
  imageSize: { width: number; height: number };
  gridSpacing: number;
  scale: SharedValue<number>;
  translationX: SharedValue<number>;
  translationY: SharedValue<number>;
  containerSize: { width: number; height: number };
}

const MapSpaceContext = createContext<MapSpaceValue | null>(null);

export function useMapSpace(): MapSpaceValue {
  const ctx = useContext(MapSpaceContext);
  if (!ctx) {
    throw new Error("useMapSpace must be called inside <MapSpaceProvider>.");
  }
  return ctx;
}

/** Map-sized box that map-space layers render into, plus its geometry. */
export function MapSpaceProvider({
  imageSize,
  gridSpacing,
  scale,
  translationX,
  translationY,
  containerSize,
  children,
}: MapSpaceValue & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ imageSize, gridSpacing, scale, translationX, translationY, containerSize }),
    [imageSize, gridSpacing, scale, translationX, translationY, containerSize],
  );

  return (
    <MapSpaceContext.Provider value={value}>
      <View
        style={{ width: imageSize.width, height: imageSize.height }}
        pointerEvents="box-none"
      >
        {children}
      </View>
    </MapSpaceContext.Provider>
  );
}

/** Full-map absolute container for one layer (z-index from `LAYER_Z`). */
export function MapSpaceLayerView({
  children,
  pointerEvents = "none",
  zIndex,
}: {
  children: React.ReactNode;
  pointerEvents?: "none" | "box-none";
  zIndex: number;
}) {
  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex }]}
      pointerEvents={pointerEvents}
    >
      {children}
    </View>
  );
}
