import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { set, get, del, keys } from "idb-keyval";

const IMAGES_DIR = FileSystem.documentDirectory + "saved_images/";
const WEB_STORAGE_PREFIX = "saved_image_";

export const initializeStorage = async () => {
  if (Platform.OS === "web") return;
  const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
};

export const saveImage = async (uri: string): Promise<string> => {
  if (Platform.OS === "web") {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const key = `${WEB_STORAGE_PREFIX}${Date.now()}`;
          set(key, base64data).then(() => resolve(base64data));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Error saving image on web:", e);
      throw e;
    }
  }

  await initializeStorage();
  const filename = uri.split("/").pop() || `image_${Date.now()}.jpg`;
  const newPath = IMAGES_DIR + filename;
  await FileSystem.copyAsync({
    from: uri,
    to: newPath,
  });
  return newPath;
};

export const getImages = async (): Promise<string[]> => {
  if (Platform.OS === "web") {
    const allKeys = await keys();
    const images: string[] = [];
    for (const key of allKeys) {
      if (typeof key === "string" && key.startsWith(WEB_STORAGE_PREFIX)) {
        const value = await get(key);
        if (value) images.push(value);
      }
    }
    return images;
  }

  await initializeStorage();
  const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);
  return files.map((filename) => IMAGES_DIR + filename);
};

export const deleteImage = async (uri: string): Promise<void> => {
  if (Platform.OS === "web") {
    const allKeys = await keys();
    for (const key of allKeys) {
      if (typeof key === "string" && key.startsWith(WEB_STORAGE_PREFIX)) {
        const value = await get(key);
        if (value === uri) {
          await del(key);
          break;
        }
      }
    }
    return;
  }

  await FileSystem.deleteAsync(uri);
};
