import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { set, get, del, keys } from "idb-keyval";

const IMAGES_DIR = FileSystem.documentDirectory + "saved_images/";
const WEB_STORAGE_PREFIX = "saved_image_";

/**
 * Initializes the storage directory on native platforms.
 */
export const initializeStorage = async () => {
  if (Platform.OS === "web") return;
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
    }
  } catch (e) {
    console.error("Failed to initialize ImageStorage:", e);
  }
};

export interface SavedImage {
  id: string;
  uri: string;
}

/**
 * Saves an image to local storage.
 * @param uri - The source URI of the image (can be a local path, base64, or remote URL)
 * @returns The unique ID and new permanent URI of the saved image.
 */
export const saveImage = async (uri: string): Promise<SavedImage> => {
  if (Platform.OS === "web") {
    try {
      // If it's already a saved image (starts with data:), we might still want to save it with a key
      // But if it's a blob/remote URI, we fetch and convert to base64 for persistence
      let base64data = uri;
      if (!uri.startsWith("data:")) {
        const response = await fetch(uri);
        const blob = await response.blob();
        base64data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const key = `${WEB_STORAGE_PREFIX}${Date.now()}`;
      await set(key, base64data);
      return { id: key, uri: base64data }; // On web, we return the storage key and base64 string

    } catch (e) {
      console.error("Error saving image on web:", e);
      throw e;
    }
  }

  await initializeStorage();
  try {
    const filename = `img_${Date.now()}_${uri.split("/").pop() || "image.jpg"}`;
    const newPath = IMAGES_DIR + filename;
    await FileSystem.copyAsync({
      from: uri,
      to: newPath,
    });
    return { id: filename, uri: newPath };
  } catch (e) {
    console.error("Error saving image on native:", e);
    throw e;
  }
};

/**
 * Retrieves all saved images.
 */
export const getImages = async (): Promise<SavedImage[]> => {
  if (Platform.OS === "web") {
    try {
      const allKeys = await keys();
      const images: SavedImage[] = [];
      for (const key of allKeys) {
        if (typeof key === "string" && key.startsWith(WEB_STORAGE_PREFIX)) {
          const value = await get(key);
          if (value) images.push({ id: key, uri: value });
        }
      }
      return images;
    } catch (e) {
      console.error("Error fetching images on web:", e);
      return [];
    }
  }

  try {
    await initializeStorage();
    const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);
    return files.map((filename) => ({ id: filename, uri: IMAGES_DIR + filename }));
  } catch (e) {
    console.error("Error fetching images on native:", e);
    return [];
  }
};

/**
 * Deletes a saved image by its unique ID.
 */
export const deleteImage = async (id: string): Promise<void> => {
  if (Platform.OS === "web") {
    try {
      const allKeys = await keys();
      for (const key of allKeys) {
        if (typeof key === "string" && key.startsWith(WEB_STORAGE_PREFIX)) {
          const value = await get(key);
          if (key === id) {
            await del(key);
            break;
          }
        }
      }
    } catch (e) {
      console.error("Error deleting image on web:", e);
    }
    return;
  }

  try {
    const filePath = IMAGES_DIR + id;
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) {
      await FileSystem.deleteAsync(filePath);
    }
  } catch (e) {
    console.error("Error deleting image on native:", e);
  }
};

