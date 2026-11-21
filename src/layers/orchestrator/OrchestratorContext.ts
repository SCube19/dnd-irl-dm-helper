import { createContext, useContext } from "react";
import type { LayerStore } from "./store";
import type { LayerEventBus } from "./interaction";

/** Stable for the orchestrator's lifetime, so reading it never re-renders. */
export interface LayerServices {
  store: LayerStore;
  events: LayerEventBus;
}

export const LayerServicesContext = createContext<LayerServices | null>(null);

export function useLayerServices(): LayerServices {
  const services = useContext(LayerServicesContext);
  if (!services) {
    throw new Error("Layer hooks must be used inside <LayerOrchestrator>.");
  }
  return services;
}
