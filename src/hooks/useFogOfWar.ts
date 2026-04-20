import { useState, useRef, useCallback } from "react";
import { Point } from "../types/common";

export function useFogOfWar(
  imageSize: { width: number; height: number },
  initialGridSpacing: number = 15,
) {
  const [gridSpacing, setGridSpacing] = useState<number>(initialGridSpacing);
  const [revealedSquares, setRevealedSquares] = useState<Set<Point>>(new Set());
  const revealedSquareDict = useRef<Record<string, Point>>({});

  const loadInitialSquares = useCallback(
    (points: { x: number; y: number }[]) => {
      revealedSquareDict.current = {};
      const typedPoints = points.map((p) => new Point(p.x, p.y));
      typedPoints.forEach((pt) => {
        revealedSquareDict.current[pt.toString()] = pt;
      });
      setRevealedSquares(new Set(typedPoints));
    },
    [],
  );

  const clearFogOfWar = useCallback(() => {
    revealedSquareDict.current = {};
    setRevealedSquares(new Set());
  }, []);

  const getRevealedSquareValues = useCallback(() => {
    return Object.values(revealedSquareDict.current);
  }, []);

  const toggleSquareArea = useCallback(
    (centerPoint: Point, size: number) => {
      if (imageSize.width === 0) return;

      const centerGridX = Math.floor(centerPoint.x / gridSpacing);
      const centerGridY = Math.floor(centerPoint.y / gridSpacing);

      const centerKey = new Point(centerGridX, centerGridY).toString();
      const isAdding = !(centerKey in revealedSquareDict.current);

      const startX = centerGridX - Math.floor(size / 2);
      const endX = centerGridX + Math.floor((size - 1) / 2) + 1;
      const startY = centerGridY - Math.floor(size / 2);
      const endY = centerGridY + Math.floor((size - 1) / 2) + 1;

      let changed = false;

      for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
          if (
            x >= 0 &&
            y >= 0 &&
            x * gridSpacing < imageSize.width &&
            y * gridSpacing < imageSize.height
          ) {
            const pt = new Point(x, y);
            const key = pt.toString();
            if (isAdding) {
              if (!(key in revealedSquareDict.current)) {
                revealedSquareDict.current[key] = pt;
                changed = true;
              }
            } else {
              if (key in revealedSquareDict.current) {
                delete revealedSquareDict.current[key];
                changed = true;
              }
            }
          }
        }
      }

      if (changed)
        setRevealedSquares(new Set(Object.values(revealedSquareDict.current)));
    },
    [gridSpacing, imageSize],
  );

  const handleDraw = useCallback(
    (e: Point, eraseSize: number) => {
      if (imageSize.width === 0) return;

      const centerGridX = Math.floor(e.x / gridSpacing);
      const centerGridY = Math.floor(e.y / gridSpacing);

      const startX = centerGridX - Math.floor(eraseSize / 2);
      const endX = centerGridX + Math.floor((eraseSize - 1) / 2) + 1;
      const startY = centerGridY - Math.floor(eraseSize / 2);
      const endY = centerGridY + Math.floor((eraseSize - 1) / 2) + 1;

      let changed = false;

      for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
          if (
            x >= 0 &&
            y >= 0 &&
            x * gridSpacing < imageSize.width &&
            y * gridSpacing < imageSize.height
          ) {
            const pt = new Point(x, y);
            const key = pt.toString();
            if (!(key in revealedSquareDict.current)) {
              revealedSquareDict.current[key] = pt;
              changed = true;
            }
          }
        }
      }
      if (changed)
        setRevealedSquares(new Set(Object.values(revealedSquareDict.current)));
    },
    [gridSpacing, imageSize],
  );

  const onRectErase = useCallback(
    (start: Point, end: Point) => {
      if (imageSize.width === 0) return;

      const minX = Math.max(
        0,
        Math.floor(Math.min(start.x, end.x) / gridSpacing),
      );
      const maxX = Math.min(
        Math.floor(imageSize.width / gridSpacing) - 1,
        Math.floor(Math.max(start.x, end.x) / gridSpacing),
      );
      const minY = Math.max(
        0,
        Math.floor(Math.min(start.y, end.y) / gridSpacing),
      );
      const maxY = Math.min(
        Math.floor(imageSize.height / gridSpacing) - 1,
        Math.floor(Math.max(start.y, end.y) / gridSpacing),
      );

      let changed = false;
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const pt = new Point(x, y);
          const key = pt.toString();
          if (!(key in revealedSquareDict.current)) {
            revealedSquareDict.current[key] = pt;
            changed = true;
          }
        }
      }
      if (changed)
        setRevealedSquares(new Set(Object.values(revealedSquareDict.current)));
    },
    [gridSpacing, imageSize],
  );

  return {
    gridSpacing,
    setGridSpacing,
    revealedSquares,
    loadInitialSquares,
    toggleSquareArea,
    handleDraw,
    onRectErase,
    getRevealedSquareValues,
    clearFogOfWar,
  };
}
