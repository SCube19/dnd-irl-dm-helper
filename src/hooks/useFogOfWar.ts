import { useState, useRef, useCallback, useEffect } from "react";
import { useSharedValue } from "react-native-reanimated";
import {
  Skia,
  SkSurface,
  SkPaint,
  SkImage,
  BlendMode,
} from "@shopify/react-native-skia";
import { Point, Measure } from "../types/common";

const MAX_ANIMATION_TIME_MS = 10000;
const EPOCH_RESET_INTERVAL_MS = 3600 * 1000;
const HIDE_COLOR = "#00000000";

/** Encodes a 24-bit integer into RGB (alpha stays 1 to avoid premultiply). */
function rgb24Split(value24: number): Float32Array {
  return new Float32Array([
    ((value24 >>> 16) & 0xff) / 255.0,
    ((value24 >>> 8) & 0xff) / 255.0,
    (value24 & 0xff) / 255.0,
    1.0,
  ]);
}

/** Replaces the surface content with `image` stretched to `width × height`. */
function drawScaled(
  surface: SkSurface,
  image: SkImage,
  width: number,
  height: number,
) {
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color(HIDE_COLOR));
  canvas.save();
  canvas.scale(width / Math.max(1, image.width()), height / Math.max(1, image.height()));
  canvas.drawImage(image, 0, 0);
  canvas.restore();
}

/**
 * Fog reveal texture: one pixel per grid cell. Revealed pixels store the
 * reveal time (ms since `epoch`) in RGB so the shader can animate them.
 */
export function useFogOfWar(
  imageSize: { width: number; height: number },
  gridSpacing: number,
) {
  const safeSpacing = Math.max(1, gridSpacing);
  const gridWidth = Math.max(1, Math.ceil(imageSize.width / safeSpacing));
  const gridHeight = Math.max(1, Math.ceil(imageSize.height / safeSpacing));
  const revealTextureRef = useRef<SkSurface | null>(null);
  const snapshotRef = useRef<SkImage | null>(null);
  const [, forceRender] = useState(0);
  const texturePaintRef = useRef<SkPaint>(Skia.Paint());
  const prevDimRef = useRef({ w: 0, h: 0 });
  const rafIdRef = useRef<number | null>(null);

  const epoch = useSharedValue<number>(
    performance.now() - MAX_ANIMATION_TIME_MS,
  );

  // (Re)create the texture when the grid size changes, keeping reveals.
  if (prevDimRef.current.w !== gridWidth || prevDimRef.current.h !== gridHeight) {
    const newTexture = Skia.Surface.Make(gridWidth, gridHeight);
    if (!newTexture) throw new Error("Failed to create offscreen surface");

    const prevSnapshot = revealTextureRef.current?.makeImageSnapshot();
    if (prevSnapshot) {
      drawScaled(newTexture, prevSnapshot, gridWidth, gridHeight);
    } else {
      newTexture.getCanvas().drawColor(Skia.Color(HIDE_COLOR));
    }

    revealTextureRef.current = newTexture;
    snapshotRef.current = newTexture.makeImageSnapshot();
    prevDimRef.current = { w: gridWidth, h: gridHeight };
  }

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  /** Re-snapshots the texture for rendering, at most once per frame. */
  const scheduleFrameUpdate = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (!revealTextureRef.current) return;
      snapshotRef.current = revealTextureRef.current.makeImageSnapshot();
      forceRender((n) => n + 1);
    });
  }, []);

  /**
   * Moves the epoch to "now - max animation time" and rewrites every revealed
   * pixel's timestamp to 1, so nothing animates and timestamps can't overflow.
   */
  const resetEpoch = useCallback(() => {
    const surface = revealTextureRef.current;
    if (!surface) return;
    epoch.value = performance.now() - MAX_ANIMATION_TIME_MS;
    const filterPaint = Skia.Paint();
    filterPaint.setColorFilter(
      Skia.ColorFilter.MakeMatrix([
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 1 / 255, 0,
        0, 0, 0, 1, 0,
      ]),
    );
    filterPaint.setBlendMode(BlendMode.Src);
    surface.getCanvas().drawImage(surface.makeImageSnapshot(), 0, 0, filterPaint);
    scheduleFrameUpdate();
  }, [epoch, scheduleFrameUpdate]);

  useEffect(() => {
    const timer = setInterval(resetEpoch, EPOCH_RESET_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [resetEpoch]);

  const getFogEpochNow = useCallback(
    () => performance.now() - epoch.value,
    [epoch],
  );

  const drawRectToTexture = useCallback(
    (coord: Point, dim: Measure, action: "reveal" | "hide") => {
      if (!revealTextureRef.current) return;

      const startX = Math.max(0, Math.floor(coord.x));
      const startY = Math.max(0, Math.floor(coord.y));
      const endX = Math.min(gridWidth, Math.ceil(coord.x + dim.width));
      const endY = Math.min(gridHeight, Math.ceil(coord.y + dim.height));
      if (endX <= startX || endY <= startY) return;

      const paint = texturePaintRef.current;
      if (action === "hide") {
        paint.setColor(new Float32Array([0.0, 0.0, 0.0, 0.0]));
        paint.setBlendMode(BlendMode.Src);
      } else {
        paint.setColor(rgb24Split(getFogEpochNow() % 16777216));
        paint.setBlendMode(BlendMode.DstOver);
      }

      revealTextureRef.current
        .getCanvas()
        .drawRect(Skia.XYWHRect(startX, startY, endX - startX, endY - startY), paint);
      scheduleFrameUpdate();
    },
    [gridWidth, gridHeight, scheduleFrameUpdate, getFogEpochNow],
  );

  const handleReveal = useCallback(
    (coord: Point, dim: Measure) => drawRectToTexture(coord, dim, "reveal"),
    [drawRectToTexture],
  );

  const handleHide = useCallback(
    (coord: Point, dim: Measure) => drawRectToTexture(coord, dim, "hide"),
    [drawRectToTexture],
  );

  return {
    revealTexture: snapshotRef.current,
    handleReveal,
    handleHide,
    getFogEpochNow,
  };
}
