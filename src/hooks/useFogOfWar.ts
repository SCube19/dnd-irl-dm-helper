import { useState, useRef, useCallback, useEffect } from "react";

import {
  Skia,
  SkSurface,
  SkPaint,
  SkImage,
  BlendMode,
} from "@shopify/react-native-skia";

import { Point, Measure } from "../types/common";

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
        const timeMs = Math.floor(performance.now() % 16777216); // cap at 24 bits
        paint.setColor(rgb24Split(timeMs));
        paint.setBlendMode(BlendMode.DstOver);
      }

      canvas.drawRect(
        Skia.XYWHRect(start.x, start.y, normalizedDim.x, normalizedDim.y),
        paint,
      );

      scheduleFrameUpdate();
    },
    [normalizeCoords, scheduleFrameUpdate],
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
  };
}
