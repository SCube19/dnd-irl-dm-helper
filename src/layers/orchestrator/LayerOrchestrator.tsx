import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { LayerServicesContext } from "./OrchestratorContext";
import { createLayerStore } from "./store";
import { createLayerEventBus } from "./interaction";

interface LayerOrchestratorProps {
  children: React.ReactNode;
}

function LayerOrchestratorRoot({ children }: LayerOrchestratorProps) {
  const [services] = useState(() => {
    const store = createLayerStore();
    return {
      store,
      events: createLayerEventBus(),
    };
  });

  return (
    <LayerServicesContext.Provider value={services}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>
    </LayerServicesContext.Provider>
  );
}

interface LayerProps {
  order: number;
  /** Let touches on empty areas fall through to layers below. */
  passThrough?: boolean;
  children: React.ReactNode;
}

function Layer({ order, passThrough = false, children }: LayerProps) {
  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: order }]}
      pointerEvents={passThrough ? "box-none" : "auto"}
    >
      {children}
    </View>
  );
}

export const LayerOrchestrator = Object.assign(LayerOrchestratorRoot, {
  Layer,
});
