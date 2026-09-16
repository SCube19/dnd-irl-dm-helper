import { useState, useRef, useCallback, useEffect } from "react";
import { Point, pointKey } from "../types/common";

// TODO: Next optimization step is to use delta updates instead of full set updates
export function useFogOfWar(
  imageSize: { width: number; height: number },
  initialGridSpacing: number = 15,
) {
  const [gridSpacing, setGridSpacing] = useState<number>(initialGridSpacing);
  const [revealedSquares, setRevealedSquares] = useState<Set<Point>>(new Set());
  const revealedSquareDict = useRef<Record<string, Point>>({});

  const rafIdRef = useRef<number | null>(null);
  const isDirtyRef = useRef(false);
  const frameCountRef = useRef(0);

  const commitUpdates = useCallback(() => {
    if (isDirtyRef.current) {
      isDirtyRef.current = false;
      setRevealedSquares(new Set(Object.values(revealedSquareDict.current)));
    }
    rafIdRef.current = null;
    frameCountRef.current = 0;
  }, []);

  const scheduleCommit = useCallback(() => {
    isDirtyRef.current = true;

    if (rafIdRef.current === null) {
      frameCountRef.current = 0;

      const step = () => {
        frameCountRef.current += 1;
        if (frameCountRef.current >= 4) commitUpdates();
        else rafIdRef.current = requestAnimationFrame(step);
      };

      rafIdRef.current = requestAnimationFrame(step);
    }
  }, [commitUpdates]);

  const cancelAnimation = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    isDirtyRef.current = false;
    frameCountRef.current = 0;
  }, []);

  // Clean up any pending animation frame on unmount
  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  const loadInitialSquares = useCallback(
    (points: { x: number; y: number }[]) => {
      cancelAnimation();
      revealedSquareDict.current = {};
      const typedPoints = points.map((p) => new Point(p.x, p.y));
      typedPoints.forEach((pt) => {
        revealedSquareDict.current[pointKey(pt.x, pt.y)] = pt;
      });
      setRevealedSquares(new Set(typedPoints));
    },
    [cancelAnimation, pointKey],
  );

  const clearFogOfWar = useCallback(() => {
    cancelAnimation();
    revealedSquareDict.current = {};
    setRevealedSquares(new Set());
  }, [cancelAnimation]);

  const getRevealedSquareValues = useCallback(() => {
    return Object.values(revealedSquareDict.current);
  }, []);

  const toggleSquareArea = useCallback(
    (centerPoint: Point, size: number) => {
      if (imageSize.width === 0) return;

      const centerGridX = Math.floor(centerPoint.x / gridSpacing);
      const centerGridY = Math.floor(centerPoint.y / gridSpacing);
      const centerKey = pointKey(centerGridX, centerGridY);
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
            const key = pointKey(x, y);
            if (isAdding) {
              if (!(key in revealedSquareDict.current)) {
                revealedSquareDict.current[key] = new Point(x, y);
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
            const key = pointKey(x, y);
            if (!(key in revealedSquareDict.current)) {
              revealedSquareDict.current[key] = new Point(x, y);
              changed = true;
            }
          }
        }
      }

      // Batch state update with requestAnimationFrame to maintain 60/120 FPS
      if (changed) scheduleCommit();
    },
    [gridSpacing, imageSize, scheduleCommit],
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
          const key = pointKey(x, y);
          if (!(key in revealedSquareDict.current)) {
            revealedSquareDict.current[key] = new Point(x, y);
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
