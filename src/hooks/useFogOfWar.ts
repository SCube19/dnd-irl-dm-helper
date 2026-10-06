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

const MAX_ANIMATION_TIME_MS = 10000; // 10 seconds
const EPOCH_RESET_INTERVAL_MS = 3600 * 1000; // 1 hour

export function useFogOfWar(
  imageSize: { width: number; height: number },
  initialGridSpacing: number = 15,
) {
  const [gridSpacing, setGridSpacing] = useState<number>(initialGridSpacing);

  const gridWidth = Math.max(1, Math.ceil(imageSize.width / gridSpacing));
  const gridHeight = Math.max(1, Math.ceil(imageSize.height / gridSpacing));
  const revealTextureRef = useRef<SkSurface | null>(null);
  const [revealImage, setRevealImage] = useState<SkImage | null>(null);
  const texturePaintRef = useRef<SkPaint>(Skia.Paint());
  const prevDimRef = useRef({ w: 0, h: 0 });

  const rafIdRef = useRef<number | null>(null);
  const isDirtyRef = useRef<boolean>(false);

  // Relative epoch reference: start at now() - 10s so any initial pixels (value=1) have no animation
  const epoch = useSharedValue<number>(
    performance.now() - MAX_ANIMATION_TIME_MS,
  );

  const hideColor: string = "#00000000"; // Transparent 0 color for hidden areas

  if (
    prevDimRef.current.w !== gridWidth ||
    prevDimRef.current.h !== gridHeight
  ) {
    const newTexture = Skia.Surface.Make(gridWidth, gridHeight);
    if (!newTexture) throw new Error("Failed to create offscreen surface");

    if (revealTextureRef.current) {
      const newCanvas = newTexture.getCanvas();
      const { xRatio, yRatio } = {
        xRatio: gridWidth / prevDimRef.current.w,
        yRatio: gridHeight / prevDimRef.current.h,
      };
      newCanvas.save();
      newCanvas.scale(xRatio, yRatio);
      newCanvas.drawImage(revealTextureRef.current.makeImageSnapshot(), 0, 0);
      newCanvas.restore();
    } else {
      newTexture.getCanvas().drawColor(Skia.Color(hideColor));
    }

    revealTextureRef.current = newTexture;
    setRevealImage(newTexture.makeImageSnapshot());
    prevDimRef.current = { w: gridWidth, h: gridHeight };
  }

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const scheduleFrameUpdate = useCallback(() => {
    isDirtyRef.current = true;
    if (rafIdRef.current !== null) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (isDirtyRef.current && revealTextureRef.current) {
        isDirtyRef.current = false;
        setRevealImage(revealTextureRef.current.makeImageSnapshot());
      }
    });
  }, []);

  // Periodic epoch reset: shift epoch to now() - MAX_ANIMATION_TIME_MS
  // and rewrite revealed pixels with timestamp = 1 ms using ColorFilter MakeMatrix
  const resetEpoch = useCallback(() => {
    if (!revealTextureRef.current) return;

    // 1. Move epoch to now() - MAX_ANIMATION_TIME_MS
    // iTime in shader becomes exactly MAX_ANIMATION_TIME_MS (10s)
    epoch.value = performance.now() - MAX_ANIMATION_TIME_MS;

    // 2. Rewrite all revealed pixels (alpha > 0) to value 1 in blue channel (timestamp = 1 ms)
    // Matrix:
    // R' = 0
    // G' = 0
    // B' = (1/255) * A
    // A' = A
    // Unrevealed areas (A=0) remain completely transparent (0,0,0,0)
    // Revealed areas (A=1) get B=1/255 (value 1 in 8-bit channel) and A=1
    const snapshot = revealTextureRef.current.makeImageSnapshot();
    const filterMatrix = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1 / 255,
      0,
      0,
      0,
      0,
      1,
      0,
    ];
    const colorFilter = Skia.ColorFilter.MakeMatrix(filterMatrix);
    const filterPaint = Skia.Paint();
    filterPaint.setColorFilter(colorFilter);
    filterPaint.setBlendMode(BlendMode.Src);

    const canvas = revealTextureRef.current.getCanvas();
    canvas.drawImage(snapshot, 0, 0, filterPaint);

    scheduleFrameUpdate();
  }, [scheduleFrameUpdate, epoch]);

  useEffect(() => {
    const timer = setInterval(() => {
      resetEpoch();
    }, EPOCH_RESET_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [resetEpoch]);

  const getFogEpochNow = useCallback(() => {
    return performance.now() - epoch.value;
  }, [epoch]);

  const normalizeCoords: (
    start: Point,
    dim: Measure,
  ) => { start: Point; dim: Point } = useCallback(
    (start, dim) => {
      const startX = Math.max(0, Math.floor(start.x));
      const startY = Math.max(0, Math.floor(start.y));
      const endX = Math.min(gridWidth, Math.ceil(start.x + dim.width));
      const endY = Math.min(gridHeight, Math.ceil(start.y + dim.height));
      return {
        start: { x: startX, y: startY },
        dim: { x: endX - startX, y: endY - startY },
      };
    },
    [gridWidth, gridHeight],
  );

  function rgb24Split(value24: number): Float32Array {
    return new Float32Array([
      ((value24 >>> 16) & 0xff) / 255.0,
      ((value24 >>> 8) & 0xff) / 255.0,
      (value24 & 0xff) / 255.0,
      1.0, // alpha MUST be 1.0 — premultiplication is a no-op at 1.0
    ]);
  }

  const drawRectToTexture = useCallback(
    (coord: Point, dim: Measure, action: "reveal" | "hide") => {
      if (!revealTextureRef.current) return;

      const { start, dim: normalizedDim } = normalizeCoords(coord, dim);
      const canvas = revealTextureRef.current.getCanvas();
      const paint = texturePaintRef.current;

      if (action === "hide") {
        paint.setColor(new Float32Array([0.0, 0.0, 0.0, 0.0]));
        paint.setBlendMode(BlendMode.Src);
      } else {
        // Skia surfaces use premultiplied alpha internally.
        // Any alpha < 1.0 causes stored_R = R * alpha, stored_G = G * alpha, etc.
        // — which corrupts the timestamp decode in the shader.
        // Relative timestamp: performance.now() - epoch.value capped at 24 bits
        const timeMs = getFogEpochNow() % 16777216;

        paint.setColor(rgb24Split(timeMs));
        paint.setBlendMode(BlendMode.DstOver);
      }

      canvas.drawRect(
        Skia.XYWHRect(start.x, start.y, normalizedDim.x, normalizedDim.y),
        paint,
      );

      scheduleFrameUpdate();
    },
    [normalizeCoords, scheduleFrameUpdate, epoch],
  );

  // --- public API ---
  const resetFogOfWar = useCallback(() => {
    drawRectToTexture(
      { x: 0, y: 0 },
      { width: gridWidth, height: gridHeight },
      "hide",
    );
  }, [drawRectToTexture, gridWidth, gridHeight]);

  const handleReveal = useCallback(
    (coord: Point, dim: Measure) => {
      drawRectToTexture(coord, dim, "reveal");
    },
    [drawRectToTexture],
  );

  const handleHide = useCallback(
    (coord: Point, dim: Measure) => {
      drawRectToTexture(coord, dim, "hide");
    },
    [drawRectToTexture],
  );

  return {
    gridSpacing,
    setGridSpacing,
    gridWidth,
    gridHeight,
    revealTexture: revealImage,
    handleReveal,
    handleHide,
    resetFogOfWar,
    getFogEpochNow,
  };
}
