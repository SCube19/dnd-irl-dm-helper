import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { Point, XY } from "../types/common";
import { set, get } from "idb-keyval";

const MAP_DATA_FILE = FileSystem.documentDirectory + "map_data_v2.json";
const WEB_STORAGE_KEY = "map_data_v2";

export interface MapSessionData {
  imageUri: string;
  name?: string;
  revealedSquares: XY[];
  gridSpacing: number;
  lastModified: number;
}


interface GlobalMapData {
  [mapUri: string]: MapSessionData;
}

const DEFAULT_SESSION: MapSessionData = {
  imageUri: "",
  revealedSquares: [],
  gridSpacing: 15,
  lastModified: Date.now(),
};

/**
 * Loads the entire map data storage object.
 */
const loadGlobalData = async (): Promise<GlobalMapData> => {
  if (Platform.OS === "web") {
    try {
      const data = await get(WEB_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error("Error loading global map data on web:", e);
      return {};
    }
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(MAP_DATA_FILE);
    if (!fileInfo.exists) return {};
    const content = await FileSystem.readAsStringAsync(MAP_DATA_FILE);
    return JSON.parse(content);
  } catch (e) {
    console.error("Error loading global map data:", e);
    return {};
  }
};

/**
 * Saves the entire map data storage object.
 */
const saveGlobalData = async (data: GlobalMapData): Promise<void> => {
  if (Platform.OS === "web") {
    try {
      await set(WEB_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving global map data on web:", e);
    }
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(MAP_DATA_FILE, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving global map data:", e);
  }
};

/**
 * Saves or updates a session for a specific map.
 */
export const saveMapData = async (
  mapUri: string,
  updates: Partial<MapSessionData>,
): Promise<void> => {
  const globalData = await loadGlobalData();
  const existingSession = globalData[mapUri] || {
    ...DEFAULT_SESSION,
    imageUri: mapUri,
  };

  globalData[mapUri] = {
    ...existingSession,
    ...updates,
    lastModified: Date.now(),
  };

  await saveGlobalData(globalData);
};

/**
 * Retrieves the session data for a specific map.
 */
export const getMapData = async (mapUri: string): Promise<MapSessionData> => {
  const globalData = await loadGlobalData();
  return globalData[mapUri] || { ...DEFAULT_SESSION, imageUri: mapUri };
};

/**
 * Retrieves all saved map data sessions.
 */
export const getAllMapData = async (): Promise<GlobalMapData> => {
  return await loadGlobalData();
};

/**
 * Resets the session data for a specific map.
 */
export const resetMapData = async (mapUri: string): Promise<void> => {
  const globalData = await loadGlobalData();
  if (globalData[mapUri]) {
    globalData[mapUri] = {
      ...DEFAULT_SESSION,
      imageUri: mapUri,
      gridSpacing: globalData[mapUri].gridSpacing, // Keep grid spacing even on reset? Usually yes.
    };
    await saveGlobalData(globalData);
  }
};

/**
 * Deletes the session data for a specific map.
 */
export const deleteMapData = async (mapUri: string): Promise<void> => {
  const globalData = await loadGlobalData();
  if (globalData[mapUri]) {
    delete globalData[mapUri];
    await saveGlobalData(globalData);
  }
};

