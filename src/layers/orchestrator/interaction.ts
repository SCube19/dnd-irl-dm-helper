import { useEffect, type RefObject } from "react";
import type { InteractionMode, XY } from "../../types/common";
import { useLatest } from "../../hooks/useLatest";
import { useLayerServices } from "./OrchestratorContext";
import { addToSetMap } from "./utils";

export interface PointerPayload {
  point: XY;
  mode: InteractionMode;
}

/**
 * Events sent from the interaction connector to layers, keyed by type.
 * Points are in map (content) space. Extend with declaration merging.
 */
export interface LayerEventMap {
  tap: PointerPayload;
  draw: PointerPayload;
  rectSelect: { start: XY; end: XY; mode: InteractionMode };
  hover: PointerPayload;
  hoverLeave: Record<string, never>;
  dragStart: PointerPayload;
  dragMove: PointerPayload;
  /** `point` is absent when the drag is cancelled (e.g. mode switch). */
  dragEnd: { point?: XY; mode: InteractionMode };
}

export type LayerEventType = keyof LayerEventMap;
export type LayerEventHandler<K extends LayerEventType> = (
  payload: LayerEventMap[K],
) => void;
export type LayerEventHandlers = {
  [K in LayerEventType]?: LayerEventHandler<K>;
};
export type LayerDispatch = <K extends LayerEventType>(
  type: K,
  payload: LayerEventMap[K],
) => void;

export interface LayerEventBus {
  dispatch: LayerDispatch;
  subscribe<K extends LayerEventType>(
    type: K,
    handler: LayerEventHandler<K>,
  ): () => void;
}

export function createLayerEventBus(): LayerEventBus {
  const handlers = new Map<LayerEventType, Set<(payload: unknown) => void>>();
  return {
    dispatch: (type, payload) =>
      [...(handlers.get(type) ?? [])].forEach((handle) => handle(payload)),
    subscribe: (type, handler) =>
      addToSetMap(handlers, type, handler as (payload: unknown) => void),
  };
}

function subscribeLatest<K extends LayerEventType>(
  events: LayerEventBus,
  type: K,
  handlersRef: RefObject<LayerEventHandlers>,
) {
  return events.subscribe(type, (payload) =>
    handlersRef.current[type]?.(payload),
  );
}

/**
 * Subscribes a layer to events with a handler map, e.g.
 * `useLayerInteraction({ tap: ({ point, mode }) => ... })`.
 * Handlers always see the latest render's state.
 */
export function useLayerInteraction(handlers: LayerEventHandlers): void {
  const { events } = useLayerServices();
  const handlersRef = useLatest(handlers);
  const typesKey = (Object.keys(handlers) as LayerEventType[])
    .filter((type) => handlers[type])
    .sort()
    .join(",");

  useEffect(() => {
    if (!typesKey) return;
    const unsubscribers = (typesKey.split(",") as LayerEventType[]).map(
      (type) => subscribeLatest(events, type, handlersRef),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [typesKey, events, handlersRef]);
}

export function useLayerDispatch(): LayerDispatch {
  return useLayerServices().events.dispatch;
}
