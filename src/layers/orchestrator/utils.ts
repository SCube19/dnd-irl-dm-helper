/** Adds `value` to the set stored under `key`; returns a remover. */
export function addToSetMap<K, V>(
  map: Map<K, Set<V>>,
  key: K,
  value: V,
): () => void {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(value);
  return () => {
    map.get(key)?.delete(value);
  };
}
