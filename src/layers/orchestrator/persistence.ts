import { useEffect } from "react";
import { useLatest } from "../../hooks/useLatest";
import type { LayerKey, LayerStore } from "./store";
import { useLayerServices } from "./OrchestratorContext";

/**
 * Converts a layer's live state `S` to its saved form `T` and back.
 * `deserialize` gets data from storage (possibly an older app version).
 */
export interface LayerPersistenceHandler<S, T> {
  serialize(state: S): T;
  deserialize(data: T): void;
}

export type SerializedLayers = Record<string, unknown>;

export interface LayerPersistence {
  register<S, T>(
    key: LayerKey<S>,
    handler: LayerPersistenceHandler<S, T>,
  ): () => void;
  serializeAll(): SerializedLayers;
}

interface Entry {
  key: LayerKey<unknown>;
  handler: LayerPersistenceHandler<unknown, unknown>;
}

/**
 * Saved data is handed to each layer once, when it first registers, so a
 * remounted layer keeps its live state instead of reloading the save.
 */
export function createLayerPersistence(
  store: LayerStore,
  savedData: SerializedLayers = {},
): LayerPersistence {
  const entries = new Map<string, Entry>();
  const pending = new Map(Object.entries(savedData));

  return {
    register: (key, handler) => {
      const entry = { key, handler } as Entry;
      entries.set(key.id, entry);
      if (pending.has(key.id)) {
        const data = pending.get(key.id);
        pending.delete(key.id);
        try {
          handler.deserialize(data as never);
        } catch (err) {
          console.error(`Failed to load layer "${key.id}":`, err);
        }
      }
      return () => {
        if (entries.get(key.id) === entry) entries.delete(key.id);
      };
    },

    serializeAll: () => {
      const result: SerializedLayers = {};
      for (const [id, { key, handler }] of entries) {
        try {
          result[id] = handler.serialize(store.get(key));
        } catch (err) {
          console.error(`Failed to save layer "${id}":`, err);
        }
      }
      return result;
    },
  };
}

/** Registers a layer for save/load under its key's id. */
export function useLayerPersistence<S, T>(
  key: LayerKey<S>,
  handler: LayerPersistenceHandler<S, T>,
): void {
  const { persistence } = useLayerServices();
  const handlerRef = useLatest(handler);

  useEffect(
    () =>
      persistence.register(key, {
        serialize: (state) => handlerRef.current.serialize(state),
        deserialize: (data) => handlerRef.current.deserialize(data),
      }),
    [persistence, key, handlerRef],
  );
}

/** Returns a function that collects every registered layer's saved form. */
export function useSerializeLayers(): () => SerializedLayers {
  return useLayerServices().persistence.serializeAll;
}
