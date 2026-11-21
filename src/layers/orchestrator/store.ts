import { useCallback, useSyncExternalStore } from "react";
import { useLayerServices } from "./OrchestratorContext";
import { addToSetMap } from "./utils";

/** Typed handle for a layer's state slot: storage/save id + default state. */
export interface LayerKey<S> {
  readonly id: string;
  readonly initialState: S;
}

export function defineLayerKey<S>(id: string, initialState: S): LayerKey<S> {
  return { id, initialState };
}

export type LayerStateAction<S> = S | ((prev: S) => S);
export type SetLayerState<S> = (action: LayerStateAction<S>) => void;
type Listener = () => void;

/** Keyed state shared between layers. Unwritten slots read as `initialState`. */
export interface LayerStore {
  get<S>(key: LayerKey<S>): S;
  set<S>(key: LayerKey<S>, action: LayerStateAction<S>): void;
  subscribe(layerId: string, listener: Listener): () => void;
}

export function createLayerStore(): LayerStore {
  const values = new Map<string, unknown>();
  const listeners = new Map<string, Set<Listener>>();

  const get = <S>(key: LayerKey<S>): S =>
    (values.has(key.id) ? values.get(key.id) : key.initialState) as S;

  return {
    get,
    set<S>(key: LayerKey<S>, action: LayerStateAction<S>) {
      const prev = get(key);
      const next =
        typeof action === "function"
          ? (action as (prev: S) => S)(prev)
          : action;
      if (Object.is(next, prev)) return;
      values.set(key.id, next);
      [...(listeners.get(key.id) ?? [])].forEach((notify) => notify());
    },
    subscribe: (layerId, listener) => addToSetMap(listeners, layerId, listener),
  };
}

/** `useState`-like access to a layer slot; re-renders only when it changes. */
export function useLayerStore<S>(key: LayerKey<S>): [S, SetLayerState<S>] {
  const { store } = useLayerServices();
  const subscribe = useCallback(
    (listener: Listener) => store.subscribe(key.id, listener),
    [store, key.id],
  );
  const getSnapshot = () => store.get(key);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setState = useCallback(
    (action: LayerStateAction<S>) => store.set(key, action),
    [store, key],
  );
  return [state, setState];
}
