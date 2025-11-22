import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { Point } from "../types/common";
import { set, get } from "idb-keyval";

const MAP_DATA_FILE = FileSystem.documentDirectory + "map_data.json";
const WEB_STORAGE_KEY = "map_data";

interface MapData {
  [mapUri: string]: { x: number; y: number }[];
}

export const saveMapData = async (
  mapUri: string,
  revealedSquares: Point[]
): Promise<void> => {
  const dataToSave = revealedSquares.map((p) => ({ x: p.x, y: p.y }));

  if (Platform.OS === "web") {
    try {
      const existingDataJSON = await get(WEB_STORAGE_KEY);
      const existingData: MapData = existingDataJSON
        ? JSON.parse(existingDataJSON)
        : {};
      existingData[mapUri] = dataToSave;
      await set(WEB_STORAGE_KEY, JSON.stringify(existingData));
    } catch (e) {
      console.error("Error saving map data on web:", e);
    }
    return;
  }

  try {
    let existingData: MapData = {};
    const fileInfo = await FileSystem.getInfoAsync(MAP_DATA_FILE);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(MAP_DATA_FILE);
      existingData = JSON.parse(content);
    }

    existingData[mapUri] = dataToSave;

    await FileSystem.writeAsStringAsync(
      MAP_DATA_FILE,
      JSON.stringify(existingData)
    );
  } catch (e) {
    console.error("Error saving map data:", e);
  }
};

export const getMapData = async (mapUri: string): Promise<Point[]> => {
  if (Platform.OS === "web") {
    try {
      const existingDataJSON = await get(WEB_STORAGE_KEY);
      if (!existingDataJSON) return [];
      const existingData: MapData = JSON.parse(existingDataJSON);
      const points = existingData[mapUri] || [];
      return points.map((p) => new Point(p.x, p.y));
    } catch (e) {
      console.error("Error loading map data on web:", e);
      return [];
    }
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(MAP_DATA_FILE);
    if (!fileInfo.exists) return [];

    const content = await FileSystem.readAsStringAsync(MAP_DATA_FILE);
    const existingData: MapData = JSON.parse(content);
    const points = existingData[mapUri] || [];
    return points.map((p) => new Point(p.x, p.y));
  } catch (e) {
    console.error("Error loading map data:", e);
    return [];
  }
};
