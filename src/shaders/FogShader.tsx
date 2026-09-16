import {
  Skia,
  Canvas,
  useClock,
  Shader,
  BlurMask,
  Rect,
  Group,
  Path,
  SkPath,
} from "@shopify/react-native-skia";
import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Measure, Point, pointKey } from "../types/common";

const Fog = Skia.RuntimeEffect.Make(`
uniform float iTime;
uniform float3 iResolution;

float random (in vec2 _st) {
    return fract(sin(dot(_st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < 5; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

vec4 main(vec2 inp) {
    vec2 st = inp.xy/iResolution.xy;
    vec3 color = vec3(0.0);

    vec2 q = vec2(0.);
    q.x = fbm( st + 0.00*iTime);
    q.y = fbm( st + vec2(1.0));

    vec2 r = vec2(0.);
    r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*iTime );
    r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*iTime);

    float f = fbm(st+r);

    color = mix(vec3(0.101961,0.619608,0.666667),
                vec3(0.666667,0.666667,0.498039),
                clamp((f*f)*4.0,0.0,1.0));

    color = mix(color,
                vec3(0,0,0.164706),
                clamp(length(q),0.0,1.0));

    color = mix(color,
                vec3(0.666667,1,1),
                clamp(length(r.x),0.0,1.0));

    float dist = max(abs(0.5 - st.x), abs(0.5 - st.y));
    float border_noise = fbm(st+vec2(7.3,1.8)+0.26*iTime);
  	float alpha = smoothstep(1.0, 0.4, 0.35 * dist + 0.35 * border_noise);

    return vec4((f*f*f+.6*f*f+.5*f)*color*1.3, alpha);
}`);

if (!Fog) {
  throw new Error("Failed to compile FogShader");
}

export interface FogShaderProps {
  shaderSize: Measure;
  revealedSquares: Set<Point>;
  squareSize: Measure;
  fogOpacity?: number; // 0.35 for DM Vision, 1.0 for Player Vision
}

// Maximum concurrent animating wisps to prevent GPU/CPU saturation during fast dragging
const MAX_CONCURRENT_WISPS = 12;

interface Span {
  x: number;
  y: number;
  count: number;
}

/**
 * Optimizes the Skia Path by merging contiguous horizontal squares into single wide rectangles.
 * This run-length compression reduces SkPath verbs and contours by 75% to 90%,
 * dramatically speeding up Skia's path clipper and BlurMask filter.
 */
function createBuckets(
  squares: Point[],
): [Map<number, Set<number>>, Map<number, { minX: number; maxX: number }>] {
  const len = squares.length;
  const rowBuckets = new Map<number, Set<number>>();
  const rowBounds = new Map<number, { minX: number; maxX: number }>();

  for (let i = 0; i < len; i++) {
    const { x, y } = squares[i];

    let bucket = rowBuckets.get(y);
    let bounds = rowBounds.get(y);

    if (!bucket) {
      bucket = new Set<number>();
      rowBuckets.set(y, bucket);
      bounds = { minX: x, maxX: x };
      rowBounds.set(y, bounds);
    }

    bucket.add(x);
    if (x < bounds!.minX) bounds!.minX = x;
    if (x > bounds!.maxX) bounds!.maxX = x;
  }

  return [rowBuckets, rowBounds];
}

function mergeSquaresToHorizontalSpans(squares: Point[]): Span[] {
  const len = squares.length;
  if (len === 0) return [];

  const [rowBuckets, rowBounds] = createBuckets(squares);

  const spans: Span[] = [];

  for (const [y, bucket] of rowBuckets.entries()) {
    const { minX, maxX } = rowBounds.get(y)!;

    let startX = -1;
    let count = 0;

    for (let x = minX; x <= maxX; x++) {
      if (bucket.has(x)) {
        if (count === 0) startX = x;
        count++;
      } else if (count > 0) {
        spans.push({ x: startX, y, count });
        count = 0;
      }
    }

    if (count > 0) {
      spans.push({ x: startX, y, count });
    }
  }

  return spans;
}

const AnimatedFogWisp = memo(
  ({
    square,
    squareSize,
    canvasInParentPlacement,
    onComplete,
    uniforms,
  }: {
    square: Point;
    squareSize: Measure;
    canvasInParentPlacement: Measure;
    onComplete: (sq: Point) => void;
    uniforms: any;
  }) => {
    const progress = useSharedValue(0);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    useEffect(() => {
      progress.value = withTiming(1, { duration: 750 }, (finished) => {
        if (finished) runOnJS(onCompleteRef.current)(square);
      });
    }, [progress, square]);

    const animatedOpacity = useDerivedValue(() => {
      return 1 - progress.value;
    });

    const animatedTransform = useDerivedValue(() => {
      return [
        { translateX: progress.value * 40 },
        { translateY: -progress.value * 40 },
      ];
    });

    return (
      <Group transform={animatedTransform} opacity={animatedOpacity}>
        <Rect
          x={square.x * squareSize.width - canvasInParentPlacement.width}
          y={square.y * squareSize.height - canvasInParentPlacement.height}
          width={squareSize.width}
          height={squareSize.height}
        >
          <Shader source={Fog} uniforms={uniforms} />
          <BlurMask blur={12} style="normal" />
        </Rect>
      </Group>
    );
  },
);

const FogShader = memo(
  ({
    shaderSize,
    revealedSquares,
    squareSize,
    fogOpacity = 1.0,
  }: FogShaderProps) => {
    const clock = useClock();
    const uniforms = useDerivedValue(
      () => ({
        iTime: clock.value / 2000.0,
        iResolution: [shaderSize.width, shaderSize.height, 0],
      }),
      [clock, shaderSize],
    );

    const canvasResize = 1.4;
    const shaderResize = 1.1;

    const shaderInCanvasPlacement: Measure = useMemo(
      () => ({
        width:
          (shaderSize.width * canvasResize - shaderSize.width * shaderResize) /
          2,
        height:
          (shaderSize.height * canvasResize -
            shaderSize.height * shaderResize) /
          2,
      }),
      [shaderSize],
    );

    const canvasInParentPlacement: Measure = useMemo(
      () => ({
        width:
          -shaderInCanvasPlacement.width -
          (shaderSize.width * shaderResize - shaderSize.width) / 2,
        height:
          -shaderInCanvasPlacement.height -
          (shaderSize.height * shaderResize - shaderSize.height) / 2,
      }),
      [shaderSize, shaderInCanvasPlacement],
    );

    const spansToSkPath = useCallback(
      (squares: Point[]): SkPath => {
        const newPath = Skia.Path.Make();
        const spans = mergeSquaresToHorizontalSpans(squares);

        for (const span of spans) {
          newPath.addRect({
            x: span.x * squareSize.width - canvasInParentPlacement.width,
            y: span.y * squareSize.height - canvasInParentPlacement.height,
            width: span.count * squareSize.width,
            height: squareSize.height,
          });
        }
        return newPath;
      },
      [canvasInParentPlacement, squareSize],
    );

    const isFirstRender = useRef(true);
    const [stableSquareDict, setStableSquareDict] = useState<
      Record<string, Point>
    >({});
    const [animatingSquareDict, setAnimatingSquareDict] = useState<
      Record<string, Point>
    >({});

    useEffect(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        const initialStable: Record<string, Point> = {};
        for (const sq of revealedSquares) {
          initialStable[pointKey(sq)] = sq;
        }
        setStableSquareDict(initialStable);
        return;
      }

      const newAnimatingDict = { ...animatingSquareDict };
      const currentRevealedKeys = new Set<string>();

      revealedSquares.forEach((sq) => currentRevealedKeys.add(pointKey(sq)));

      let hasModifiedStable = false;
      const newStableDict = { ...stableSquareDict };

      // Remove squares no longer in revealedSquares
      for (const key of Object.keys(newStableDict)) {
        if (!currentRevealedKeys.has(key)) {
          delete newStableDict[key];
          hasModifiedStable = true;
        }
      }

      // Collect newly revealed squares
      const newlyAddedSquares: Point[] = [];
      for (const sq of revealedSquares) {
        const key = pointKey(sq);
        if (!newStableDict[key]) {
          newStableDict[key] = sq;
          hasModifiedStable = true;
          newlyAddedSquares.push(sq);
        }
      }

      // Pool and cap active wisps to MAX_CONCURRENT_WISPS
      let hasNewAnimating = false;
      if (newlyAddedSquares.length > 0) {
        const currentWispKeys = Object.keys(newAnimatingDict);
        const availableSlots = Math.max(
          0,
          MAX_CONCURRENT_WISPS - currentWispKeys.length,
        );

        // Take the newest squares up to available slots
        const wispsToAdd = newlyAddedSquares.slice(-availableSlots);
        for (const sq of wispsToAdd) {
          const key = pointKey(sq);
          if (!newAnimatingDict[key]) {
            newAnimatingDict[key] = sq;
            hasNewAnimating = true;
          }
        }
      }

      if (hasModifiedStable) setStableSquareDict(newStableDict);
      if (hasNewAnimating) setAnimatingSquareDict(newAnimatingDict);
    }, [revealedSquares]);

    const onSquareAnimationComplete = useCallback((sq: Point) => {
      const key = pointKey(sq);
      setAnimatingSquareDict((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, []);

    const revealedSkPath: SkPath = useMemo(
      () => spansToSkPath(Object.values(stableSquareDict)),
      [stableSquareDict, spansToSkPath],
    );

    return (
      <Canvas
        style={{
          width: shaderSize.width * canvasResize,
          height: shaderSize.height * canvasResize,
          position: "absolute",
          left: canvasInParentPlacement.width,
          top: canvasInParentPlacement.height,
        }}
      >
        <Group opacity={fogOpacity}>
          <Rect
            x={shaderInCanvasPlacement.width}
            y={shaderInCanvasPlacement.height}
            width={shaderSize.width * shaderResize}
            height={shaderSize.height * shaderResize}
          >
            <Shader source={Fog} uniforms={uniforms} />
            <BlurMask blur={20} style="normal" />
          </Rect>

          <Path
            path={revealedSkPath}
            color="black"
            fillType="winding"
            blendMode="dstOut"
          >
            <BlurMask blur={5} style="normal" />
          </Path>

          {Object.values(animatingSquareDict).map((sq) => (
            <AnimatedFogWisp
              key={pointKey(sq)}
              square={sq}
              squareSize={squareSize}
              canvasInParentPlacement={canvasInParentPlacement}
              onComplete={onSquareAnimationComplete}
              uniforms={uniforms}
            />
          ))}
        </Group>
      </Canvas>
    );
  },
);

export default FogShader;
