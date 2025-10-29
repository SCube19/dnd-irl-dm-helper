import { useCallback, useRef, useState } from "react";

export function useSet<T>(initialValue?: T[]) {
  // a peice of state to trigger a re-render whenever the set changes
  // imo this is less hacky than re-creating the set on every state change
  const [_, setInc] = useState(false);

  //use a ref for the set instead
  const set = useRef(new Set<T>(initialValue));

  const add = useCallback(
    (item: T) => {
      if (set.current.has(item)) return;
      setInc((prev) => !prev);
      set.current.add(item);
    },
    [setInc]
  );

  const remove = useCallback(
    (item: T) => {
      if (!set.current.has(item)) return;
      setInc((prev) => !prev);
      set.current.delete(item);
    },
    [setInc]
  );

  return [set.current, add, remove] as const;
}
