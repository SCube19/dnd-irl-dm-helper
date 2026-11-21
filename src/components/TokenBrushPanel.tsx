import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  type GestureResponderEvent,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageStorage from "../utils/ImageStorage";
import { TokenImage } from "./TokenImage";
import {
  TOKEN_SIZES,
  type TokenSize,
} from "../layers/layerdef/token/tokenTypes";
import {
  RgbColor,
  hexToRgb,
  hslToRgb,
  isSameRgb,
  rgbToHex,
  rgbToHsl,
  toRgbString,
} from "../utils/color";

const PRESET_SWATCHES: RgbColor[] = [
  { r: 239, g: 68, b: 68 },
  { r: 249, g: 115, b: 22 },
  { r: 234, g: 179, b: 8 },
  { r: 34, g: 197, b: 94 },
  { r: 6, g: 182, b: 212 },
  { r: 59, g: 130, b: 246 },
  { r: 99, g: 102, b: 241 },
  { r: 168, g: 85, b: 247 },
  { r: 236, g: 72, b: 153 },
  { r: 226, g: 232, b: 240 },
  { r: 30, g: 41, b: 59 },
];

const SATURATION = 85;
const MIN_LIGHTNESS = 18;
const MAX_LIGHTNESS = 86;
const HUE_COLORS = Array.from(
  { length: 36 },
  (_, i) => `hsl(${i * 10}, ${SATURATION}%, 52%)`,
);
const SHADE_STEPS = Array.from({ length: 18 }, (_, i) => 18 + i * 3.8);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clampLightness = (l: number) =>
  Math.max(MIN_LIGHTNESS, Math.min(MAX_LIGHTNESS, l));

/** Horizontal press position within `node`, as 0..1. */
function getBarRatio(
  e: GestureResponderEvent,
  node: View | null,
  fallbackWidth: number,
) {
  const ne = e.nativeEvent as any;
  if (Platform.OS === "web") {
    const el = (node as any)?.node ?? node;
    const clientX = ne.clientX ?? ne.pageX;
    if (typeof clientX === "number" && el?.getBoundingClientRect) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) return clamp01((clientX - rect.left) / rect.width);
    }
  }
  return clamp01((ne.locationX ?? ne.offsetX ?? 0) / fallbackWidth);
}

function SpectrumBar({
  colors,
  position,
  thumbColor,
  thumbSize,
  onPick,
}: {
  colors: string[];
  /** Thumb position, 0..1. */
  position: number;
  thumbColor: string;
  thumbSize: number;
  onPick: (ratio: number) => void;
}) {
  const ref = useRef<View>(null);
  const [width, setWidth] = useState(1);
  const pick = (e: GestureResponderEvent) =>
    onPick(getBarRatio(e, ref.current, width));

  return (
    <View
      ref={ref}
      onLayout={(e) => setWidth(Math.max(1, e.nativeEvent.layout.width))}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={pick}
      onResponderMove={pick}
      style={{ height: thumbSize + 4 }}
      className="w-full rounded-full overflow-hidden flex-row border border-black/20 relative justify-center"
    >
      <View pointerEvents="none" className="flex-row w-full h-full">
        {colors.map((color, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: `${Math.min(96, Math.max(0, position * 96))}%`,
          top: 1,
          width: thumbSize,
          height: thumbSize,
          borderRadius: thumbSize / 2,
          backgroundColor: thumbColor,
          borderWidth: 2,
          borderColor: "#ffffff",
        }}
      />
    </View>
  );
}

interface TokenBrushPanelProps {
  color: RgbColor;
  onColorChange: (color: RgbColor) => void;
  size: TokenSize;
  onSizeChange: (size: TokenSize) => void;
  imageUri?: string;
  onImageChange: (uri: string | undefined) => void;
}

/** Color, size and image settings for newly placed tokens. */
export function TokenBrushPanel({
  color,
  onColorChange,
  size,
  onSizeChange,
  imageUri,
  onImageChange,
}: TokenBrushPanelProps) {
  const [hue, setHue] = useState(() => rgbToHsl(color).h);
  const [lightness, setLightness] = useState(() =>
    clampLightness(rgbToHsl(color).l),
  );
  const [hexText, setHexText] = useState(() => rgbToHex(color));
  const [urlInput, setUrlInput] = useState(
    imageUri && !imageUri.startsWith("data:") ? imageUri : "",
  );
  // Color we last emitted, so the sync effect below doesn't fight the picker.
  const lastEmittedRef = useRef<RgbColor | null>(null);

  useEffect(() => {
    if (lastEmittedRef.current && isSameRgb(lastEmittedRef.current, color)) {
      return;
    }
    setHexText(rgbToHex(color));
    const hsl = rgbToHsl(color);
    if (hsl.s > 8) setHue(hsl.h);
    setLightness(clampLightness(hsl.l));
  }, [color.r, color.g, color.b]);

  useEffect(() => {
    if (!imageUri) setUrlInput("");
    else if (!imageUri.startsWith("data:")) setUrlInput(imageUri);
  }, [imageUri]);

  // Web: paste an image (or image URL) anywhere while the panel is open.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handlePaste = (e: ClipboardEvent) => {
      const clipboard = e.clipboardData;
      if (!clipboard) return;

      // Prefer the <img src> of pasted HTML so animated GIFs stay animated.
      const htmlSrc = clipboard
        .getData("text/html")
        ?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
      const gifSrc = htmlSrc && ImageStorage.normalizeTokenImageUri(htmlSrc);
      if (gifSrc && /(\.gif(\?|#|$))|^data:image\/gif/i.test(gifSrc)) {
        e.preventDefault();
        ImageStorage.saveTokenImage(gifSrc).then(onImageChange);
        return;
      }

      const file = Array.from(clipboard.items)
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (file) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onloadend = async () => {
          if (typeof reader.result === "string") {
            onImageChange(await ImageStorage.saveTokenImage(reader.result));
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
      const text = ImageStorage.normalizeTokenImageUri(
        clipboard.getData("text/plain") || "",
      );
      if (/^(https?:\/\/|data:image\/)/i.test(text)) {
        e.preventDefault();
        onImageChange(text);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onImageChange]);

  const emitColor = (rgb: RgbColor) => {
    lastEmittedRef.current = rgb;
    setHexText(rgbToHex(rgb));
    onColorChange(rgb);
  };

  const pickHue = (ratio: number) => {
    const h = Math.round(ratio * 359);
    setHue(h);
    emitColor(hslToRgb(h, SATURATION, lightness));
  };

  const pickShade = (ratio: number) => {
    const l = Math.round(MIN_LIGHTNESS + ratio * (MAX_LIGHTNESS - MIN_LIGHTNESS));
    setLightness(l);
    emitColor(hslToRgb(hue, SATURATION, l));
  };

  const applyHex = (rgb: RgbColor) => {
    lastEmittedRef.current = rgb;
    const hsl = rgbToHsl(rgb);
    if (hsl.s > 8) setHue(hsl.h);
    setLightness(clampLightness(hsl.l));
    onColorChange(rgb);
  };

  const handleHexChange = (text: string) => {
    const filtered = text.replace(/[^#0-9a-fA-F]/g, "").slice(0, 7);
    setHexText(filtered);
    const parsed = filtered.replace(/^#/, "").length === 6 && hexToRgb(filtered);
    if (parsed) applyHex(parsed);
  };

  const handleHexBlur = () => {
    const parsed = hexToRgb(hexText);
    if (parsed) applyHex(parsed);
    setHexText(rgbToHex(parsed ?? color));
  };

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          alert("Camera roll permissions are needed to select a token image.");
          return;
        }
      }
      // No editing: the native cropper re-encodes and would flatten GIFs.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
      });
      const uri = result.assets?.[0]?.uri;
      if (result.canceled || !uri) return;
      onImageChange(await ImageStorage.saveTokenImage(uri));
    } catch (e) {
      console.error("Failed to pick token image:", e);
    }
  };

  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    onImageChange(ImageStorage.normalizeTokenImageUri(value) || undefined);
  };

  const colorCss = toRgbString(color);

  return (
    <View className="w-full px-3 py-2.5 mt-1 bg-base-200/75 rounded-xl border border-base-300 gap-2.5">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <View
            style={{
              backgroundColor: colorCss,
              borderColor: imageUri ? colorCss : "#ffffff",
            }}
            className="w-8 h-8 rounded-full border-2 shadow-sm overflow-hidden items-center justify-center"
          >
            {imageUri && <TokenImage uri={imageUri} />}
          </View>
          <Text className="font-bold text-xs text-content-base/80">
            Token Color
          </Text>
        </View>
        <TextInput
          value={hexText}
          onChangeText={handleHexChange}
          onBlur={handleHexBlur}
          placeholder="#EF4444"
          maxLength={7}
          className="w-20 h-7 bg-base-100 text-content-base text-center rounded-lg text-xs font-mono font-bold border border-base-300"
        />
      </View>

      <View className="flex-row items-center justify-between gap-1.5">
        {PRESET_SWATCHES.map((swatch) => {
          const selected = isSameRgb(color, swatch);
          return (
            <Pressable
              key={toRgbString(swatch)}
              onPress={() => {
                lastEmittedRef.current = null;
                onColorChange(swatch);
              }}
              style={{
                backgroundColor: toRgbString(swatch),
                transform: [{ scale: selected ? 1.15 : 1 }],
              }}
              className={`w-6 h-6 rounded-full ${
                selected
                  ? "border-2 border-white shadow-md"
                  : "border border-black/20 opacity-85"
              }`}
            />
          );
        })}
      </View>

      <View className="gap-1.5">
        <SpectrumBar
          colors={HUE_COLORS}
          position={hue / 360}
          thumbColor={`hsl(${hue}, ${SATURATION}%, 52%)`}
          thumbSize={12}
          onPick={pickHue}
        />
        <SpectrumBar
          colors={SHADE_STEPS.map((l) => `hsl(${hue}, ${SATURATION}%, ${l}%)`)}
          position={(lightness - MIN_LIGHTNESS) / (MAX_LIGHTNESS - MIN_LIGHTNESS)}
          thumbColor={colorCss}
          thumbSize={10}
          onPick={pickShade}
        />
      </View>

      <View className="flex-row items-center justify-between pt-1.5 border-t border-base-300 gap-2">
        <Text className="font-bold text-xs text-content-base/80">Token Size</Text>
        <View className="flex-row items-center gap-1.5">
          {TOKEN_SIZES.map((option) => (
            <Pressable
              key={option}
              onPress={() => onSizeChange(option)}
              className={`px-2.5 py-1 rounded-lg border ${
                size === option
                  ? "bg-primary/25 border-primary"
                  : "bg-base-100/70 border-base-300 opacity-75"
              }`}
            >
              <Text className="text-xs font-bold text-content-base">
                {option}×{option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="pt-1.5 border-t border-base-300 gap-1.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-bold text-xs text-content-base/80">
            Token Image (Optional)
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Pressable
              onPress={handlePickImage}
              className="px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/40"
            >
              <Text className="text-xs font-bold text-content-base">
                🖼️ Pick Image
              </Text>
            </Pressable>
            {imageUri && (
              <Pressable
                onPress={() => onImageChange(undefined)}
                className="px-2 py-1 rounded-lg bg-error/20 border border-error/40"
              >
                <Text className="text-xs font-bold text-content-base">✕ Clear</Text>
              </Pressable>
            )}
          </View>
        </View>
        <TextInput
          value={urlInput}
          onChangeText={handleUrlChange}
          placeholder="Or paste image URL..."
          placeholderTextColor="#9ca3af"
          className="w-full h-7 px-2.5 bg-base-100 text-content-base rounded-lg text-xs border border-base-300"
        />
        <Text className="text-[11px] text-content-base/60">
          Tap cell to place/update token • Hover or tap token for large preview
        </Text>
      </View>
    </View>
  );
}
