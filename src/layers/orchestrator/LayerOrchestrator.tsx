import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { LayerServicesContext } from "./OrchestratorContext";
import { createLayerStore } from "./store";
import { createLayerEventBus } from "./interaction";
import { createLayerPersistence, type LayerStorage } from "./persistence";

interface LayerOrchestratorProps {
  /** Default storage backend for layers that don't supply their own. */
  storage?: LayerStorage;
  children: React.ReactNode;
}

function LayerOrchestratorRoot({ storage, children }: LayerOrchestratorProps) {
  const [services] = useState(() => {
    const store = createLayerStore();
    return {
      store,
      events: createLayerEventBus(),
      persistence: createLayerPersistence(store, storage),
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
