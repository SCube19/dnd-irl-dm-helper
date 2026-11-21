import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { set, get, del, keys } from "idb-keyval";

const IMAGES_DIR = FileSystem.documentDirectory + "saved_images/";
const WEB_STORAGE_PREFIX = "saved_image_";

export interface SavedImage {
  id: string;
  uri: string;
}

async function ensureDir(dir: string) {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
}

/** Web: fetches any URI (blob:, http:) into a base64 data URL. */
async function toDataUrl(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const saveImage = async (uri: string): Promise<SavedImage> => {
  if (Platform.OS === "web") {
    const key = `${WEB_STORAGE_PREFIX}${Date.now()}`;
    const dataUrl = await toDataUrl(uri);
    await set(key, dataUrl);
    return { id: key, uri: dataUrl };
  }
  await ensureDir(IMAGES_DIR);
  const filename = `img_${Date.now()}_${uri.split("/").pop() || "image.jpg"}`;
  const newPath = IMAGES_DIR + filename;
  await FileSystem.copyAsync({ from: uri, to: newPath });
  return { id: filename, uri: newPath };
};

export const getImages = async (): Promise<SavedImage[]> => {
  try {
    if (Platform.OS === "web") {
      const imageKeys = (await keys()).filter(
        (k): k is string =>
          typeof k === "string" && k.startsWith(WEB_STORAGE_PREFIX),
      );
      const values = await Promise.all(imageKeys.map((id) => get<string>(id)));
      return imageKeys.flatMap((id, i) => {
        const uri = values[i];
        return uri ? [{ id, uri }] : [];
      });
    }
    await ensureDir(IMAGES_DIR);
    const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);
    return files.map((id) => ({ id, uri: IMAGES_DIR + id }));
  } catch (e) {
    console.error("Error fetching images:", e);
    return [];
  }
};

export const deleteImage = async (id: string): Promise<void> => {
  try {
    if (Platform.OS === "web") {
      await del(id);
      return;
    }
    await FileSystem.deleteAsync(IMAGES_DIR + id, { idempotent: true });
  } catch (e) {
    console.error("Error deleting image:", e);
  }
};
