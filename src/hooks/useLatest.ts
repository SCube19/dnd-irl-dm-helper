import { useLayoutEffect, useRef } from "react";

/**
 * Returns a ref that always points at the latest committed `value`.
 *
 * Use it to read fresh props/state from long-lived callbacks (event
 * subscriptions, window listeners) without re-subscribing every render.
 * The ref is updated in a layout effect so discarded concurrent renders
 * never leak into it.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
