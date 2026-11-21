import { useEffect } from "react";
import { useLatest } from "../../hooks/useLatest";
import type { LayerKey, LayerStore } from "./store";
import { useLayerServices } from "./OrchestratorContext";

/**
 * Backend-agnostic storage contract for layers. Implement this to persist a
 * layer (or the whole map) to JSON, FileSystem, IndexedDB, a remote API, etc.
 */
export interface LayerStorage {
  load(layerId: string): unknown | Promise<unknown>;
  save(layerId: string, data: unknown): void | Promise<void>;
  /** Optional hook invoked once after all layers finish saving (e.g. batch write). */
  flush?(): void | Promise<void>;
}

/**
 * Converts a layer's live state `S` to its saved form `T` and back.
 * Pass `storage` to override the orchestrator's default storage for this layer.
 */
export interface LayerPersistenceHandler<S, T = unknown> {
  serialize(state: S): T | Promise<T>;
  deserialize(data: T): void | Promise<void>;
  storage?: LayerStorage;
}

export type SerializedLayers = Record<string, unknown>;

export interface LayerPersistence {
  register<S, T>(
    key: LayerKey<S>,
    handler: LayerPersistenceHandler<S, T>,
  ): () => void;
  saveAll(): Promise<void>;
  loadAll(): Promise<void>;
}

/**
 * In-memory `LayerStorage` backed by a plain record. Preserves entries for
 * unmounted layers and hands the combined snapshot to `onFlush` on save.
 */
export function createRecordLayerStorage(
  initial: SerializedLayers = {},
  onFlush?: (snapshot: SerializedLayers) => void | Promise<void>,
): LayerStorage {
  const data: SerializedLayers = { ...initial };
  return {
    load: (id) => data[id],
    save: (id, value) => {
      data[id] = value;
    },
    flush: () => onFlush?.({ ...data }),
  };
}

interface Entry {
  key: LayerKey<unknown>;
  handler: LayerPersistenceHandler<unknown, unknown>;
}

/**
 * Coordinates layer save/load. Each layer hydrates once on first registration
 * so remounting preserves live state; `loadAll()` forces a fresh reload.
 */
export function createLayerPersistence(
  store: LayerStore,
  defaultStorage: LayerStorage = createRecordLayerStorage(),
): LayerPersistence {
  const entries = new Map<string, Entry>();
  const hydrated = new Set<string>();

  const storageFor = (entry: Entry) => entry.handler.storage ?? defaultStorage;

  const hydrate = async (id: string, entry: Entry) => {
    try {
      const data = await storageFor(entry).load(id);
      if (data === undefined || entries.get(id) !== entry) return;
      await entry.handler.deserialize(data);
    } catch (err) {
      console.error(`Failed to load layer "${id}":`, err);
    }
  };

  return {
    register: (key, handler) => {
      const entry = { key, handler } as Entry;
      entries.set(key.id, entry);
      if (!hydrated.has(key.id)) {
        hydrated.add(key.id);
        void hydrate(key.id, entry);
      }
      return () => {
        if (entries.get(key.id) === entry) entries.delete(key.id);
      };
    },

    saveAll: async () => {
      const touched = new Set<LayerStorage>();
      await Promise.all(
        [...entries.entries()].map(async ([id, entry]) => {
          try {
            const storage = storageFor(entry);
            const data = await entry.handler.serialize(store.get(entry.key));
            await storage.save(id, data);
            touched.add(storage);
          } catch (err) {
            console.error(`Failed to save layer "${id}":`, err);
          }
        }),
      );
      await Promise.all(
        [...touched].map(async (storage) => {
          try {
            await storage.flush?.();
          } catch (err) {
            console.error("Failed to flush layer storage:", err);
          }
        }),
      );
    },

    loadAll: async () => {
      hydrated.clear();
      await Promise.all(
        [...entries.entries()].map(([id, entry]) => {
          hydrated.add(id);
          return hydrate(id, entry);
        }),
      );
    },
  };
}

/** Registers a layer for save/load under its key's id. */
export function useLayerPersistence<S, T = unknown>(
  key: LayerKey<S>,
  handler: LayerPersistenceHandler<S, T>,
): void {
  const { persistence } = useLayerServices();
  const handlerRef = useLatest(handler);

  useEffect(
    () =>
      persistence.register(key, {
        get storage() {
          return handlerRef.current.storage;
        },
        serialize: (state) => handlerRef.current.serialize(state),
        deserialize: (data) => handlerRef.current.deserialize(data),
      }),
    [persistence, key, handlerRef],
  );
}

/** Imperative save/load triggers across all registered layers. */
export function useLayerPersistenceControls() {
  const { persistence } = useLayerServices();
  return {
    saveAll: persistence.saveAll,
    loadAll: persistence.loadAll,
  };
}
