import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { set, get, del, keys } from "idb-keyval";

const IMAGES_DIR = FileSystem.documentDirectory + "saved_images/";
const TOKEN_IMAGES_DIR = FileSystem.documentDirectory + "token_images/";
const WEB_STORAGE_PREFIX = "saved_image_";
const MAX_TOKEN_IMAGE_DIM = 256;

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

const isAnimatedImageUri = (uri: string): boolean =>
  /^data:image\/(gif|webp)/i.test(uri) || /\.(gif|webp)(\?|#|$)/i.test(uri);

/** Turns Giphy page links and Imgur .gifv links into direct .gif URLs. */
export const normalizeTokenImageUri = (raw: string): string => {
  const trimmed = raw.trim();
  const giphyId = trimmed.match(
    /^https?:\/\/(?:www\.)?giphy\.com\/gifs\/(?:.*-)?([a-zA-Z0-9]+)(?:[/?#].*)?$/i,
  )?.[1];
  if (giphyId) return `https://media.giphy.com/media/${giphyId}/giphy.gif`;
  if (/^https?:\/\/i\.imgur\.com\/[^/?#]+\.gifv(\?|#|$)/i.test(trimmed)) {
    return trimmed.replace(/\.gifv(\?|#|$)/i, ".gif$1");
  }
  return trimmed;
};

/** Web: shrinks still images to MAX_TOKEN_IMAGE_DIM (animated ones untouched). */
const downscaleWebImage = (dataUrl: string): Promise<string> => {
  if (isAnimatedImageUri(dataUrl)) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx || !w || !h || Math.max(w, h) <= MAX_TOKEN_IMAGE_DIM) {
        resolve(dataUrl);
        return;
      }
      const scale = MAX_TOKEN_IMAGE_DIM / Math.max(w, h);
      ctx.canvas.width = Math.max(1, Math.round(w * scale));
      ctx.canvas.height = Math.max(1, Math.round(h * scale));
      ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
      resolve(ctx.canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

/** Copies a token image into app storage; returns the URI to store. */
export const saveTokenImage = async (uri: string): Promise<string> => {
  const normalized = normalizeTokenImageUri(uri);
  try {
    if (Platform.OS === "web") {
      return await downscaleWebImage(await toDataUrl(normalized));
    }
    await ensureDir(TOKEN_IMAGES_DIR);
    const name = (normalized.split("/").pop() || "").split(/[?#]/)[0] || "token";
    const fileName =
      isAnimatedImageUri(normalized) && !/\.(gif|webp)$/i.test(name)
        ? `${name}.gif`
        : name;
    const newPath = `${TOKEN_IMAGES_DIR}tok_${Date.now()}_${fileName}`;
    await FileSystem.copyAsync({ from: normalized, to: newPath });
    return newPath;
  } catch (e) {
    console.error("Error saving token image:", e);
    return normalized;
  }
};

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
