import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { set, get } from "idb-keyval";

const MAP_DATA_FILE = FileSystem.documentDirectory + "map_data_v2.json";
const WEB_STORAGE_KEY = "map_data_v2";

export interface MapSessionData {
  imageUri: string;
  name?: string;
  gridSpacing: number;
  lastModified: number;
  /** Saved state of each layer, keyed by layer id. */
  layers: Record<string, unknown>;
}

type GlobalMapData = Record<string, MapSessionData>;

async function readAll(): Promise<GlobalMapData> {
  try {
    if (Platform.OS === "web") {
      const data = await get(WEB_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    }
    const info = await FileSystem.getInfoAsync(MAP_DATA_FILE);
    if (!info.exists) return {};
    return JSON.parse(await FileSystem.readAsStringAsync(MAP_DATA_FILE));
  } catch (e) {
    console.error("Error loading map data:", e);
    return {};
  }
}

async function writeAll(data: GlobalMapData): Promise<void> {
  try {
    const serialized = JSON.stringify(data);
    if (Platform.OS === "web") {
      await set(WEB_STORAGE_KEY, serialized);
    } else {
      await FileSystem.writeAsStringAsync(MAP_DATA_FILE, serialized);
    }
  } catch (e) {
    console.error("Error saving map data:", e);
  }
}

const createDefaultSession = (imageUri: string): MapSessionData => ({
  imageUri,
  gridSpacing: 15,
  lastModified: Date.now(),
  layers: {},
});

export const getAllMapData = readAll;

export async function getMapData(mapUri: string): Promise<MapSessionData> {
  const existing = (await readAll())[mapUri];
  return existing
    ? { ...existing, layers: existing.layers ?? {} }
    : createDefaultSession(mapUri);
}

export async function saveMapData(
  mapUri: string,
  updates: Partial<MapSessionData>,
): Promise<void> {
  const all = await readAll();
  all[mapUri] = {
    ...(all[mapUri] ?? createDefaultSession(mapUri)),
    ...updates,
    lastModified: Date.now(),
  };
  await writeAll(all);
}

export async function deleteMapData(mapUri: string): Promise<void> {
  const all = await readAll();
  if (!all[mapUri]) return;
  delete all[mapUri];
  await writeAll(all);
}
