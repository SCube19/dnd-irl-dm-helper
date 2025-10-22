type MappedObject<T, V> = {
  [K in keyof T]: V;
};

export const objectMap = <T extends Record<string, any>, V>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T, index: number) => V
): MappedObject<T, V> =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v], i) => [
      k,
      fn(v as T[keyof T], k as keyof T, i),
    ])
  ) as MappedObject<T, V>;
