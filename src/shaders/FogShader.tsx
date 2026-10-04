import {
  Skia,
  Canvas,
  Shader,
  Rect,
  Group,
  ImageShader,
  SkImage,
  BlurMask,
  FilterMode,
} from "@shopify/react-native-skia";
import { memo, useMemo } from "react";
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
} from "react-native-reanimated";
import { Measure } from "../types/common";

const Fog = Skia.RuntimeEffect.Make(`
uniform float iTime;
uniform float3 iResolution;
uniform shader u_mapTexture;
uniform vec2 u_squareSize;
uniform vec2 u_canvasOffset;

// -----------------------------------------------------------
// UTILITY FUNCTIONS: NOISE & FBM
// -----------------------------------------------------------
float random(in vec2 _st) { 
    return fract(sin(dot(_st.xy, vec2(12.9898,78.233))) * 43758.5453123); 
}

float noise(in vec2 _st) {
    vec2 i = floor(_st); vec2 f = fract(_st);
    float a = random(i); float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(in vec2 _st) {
    float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 5; ++i) { 
        v += a * noise(_st); 
        _st = rot * _st * 2.0 + shift; 
        a *= 0.5; 
    }
    return v;
}

// -----------------------------------------------------------
// STEP 1: DATA DECODING
// -----------------------------------------------------------
vec2 getRevealData(vec2 coord) {
    half4 sample = u_mapTexture.eval(coord);
    
    if (sample.a < 0.5) {
        return vec2(0.0, 0.0);
    }
    
    float r = floor(sample.r * 255.0 + 0.5);
    float g = floor(sample.g * 255.0 + 0.5);
    float b = floor(sample.b * 255.0 + 0.5);
    
    // Decode 24-bit timestamp from R,G,B only (A is always 1.0).
    // 24 bits = up to 16,777,215 ms ≈ 4.6 hours per session.
    float revealTimeMs = (r * 65536.0) + (g * 256.0) + b;
    
    float timeDiff = max(0.0, iTime / 1000.0 - revealTimeMs / 1000.0);
    
    float mask = clamp(timeDiff / 0.4, 0.0, 1.0);
    float blowout = 1.0;
    
    return vec2(mask, blowout);
}

// -----------------------------------------------------------
// STEP 2: EXACT PIXEL MAPPING (NO BILINEAR)
// -----------------------------------------------------------
vec2 getExactRevealState(vec2 worldCoord) {
    vec2 pos = worldCoord / u_squareSize;
    
    vec2 tileCenter = floor(pos) + vec2(0.5);
    
    return getRevealData(tileCenter);
}

// -----------------------------------------------------------
// STEP 3: BLOWOUT — gentle UV drift for fog texture movement
// The wisp effect itself lives in composeFinalPixel (alpha modulation)
// -----------------------------------------------------------
vec2 applyBlowoutDistortion(vec2 st, float blowout) {
    if (blowout <= 0.0) return st;

    // Slow, gentle warp — just enough to make the fog texture drift
    // during the dissolve. NOT the main source of chaos.
    vec2 drift = vec2(
        fbm(st * 3.0 + iTime * 0.4),
        fbm(st * 3.0 - iTime * 0.4 + 5.7)
    ) - 0.5;

    return st + drift * 0.08 * blowout;
}

// -----------------------------------------------------------
// STEP 4: BASE FOG DOMAIN WARPING
// -----------------------------------------------------------
vec4 calculateBaseFog(vec2 st) {
    float timeS = iTime / 1000.0;
    vec2 q = vec2(0.0);
    q.x = fbm(st + 0.00 * timeS); 
    q.y = fbm(st + vec2(1.0));
    
    vec2 r = vec2(0.0);
    r.x = fbm(st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * timeS);
    r.y = fbm(st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * timeS);

    float f_val = fbm(st + r);
    
    vec3 color = mix(vec3(0.10, 0.61, 0.66), vec3(0.66, 0.66, 0.49), clamp((f_val * f_val) * 4.0, 0.0, 1.0));
    color = mix(color, vec3(0.0, 0.0, 0.16), clamp(length(q), 0.0, 1.0));
    color = mix(color, vec3(0.66, 1.0, 1.0), clamp(length(r.x), 0.0, 1.0));
    
    float density = (f_val * f_val * f_val + 0.6 * f_val * f_val + 0.5 * f_val);
    
    return vec4(color, density);
}

// -----------------------------------------------------------
// STEP 5: FINAL COMPOSITING WITH WISPY FEATHERED DISSOLVE
// -----------------------------------------------------------
vec4 composeFinalPixel(vec2 st, vec3 baseColor, float density, float mask, float blowout) {
    // --- Wisp noise: two fbm layers at different scales & speeds ---
    // Fine layer: small high-frequency wisps
    float wispFine   = fbm(st * 14.0 + iTime * 0.25);
    // Coarse layer: larger slow tendrils that linger
    float wispCoarse = fbm(st *  5.0 - iTime * 0.10 + vec2(3.1, 7.4));

    // Combine: coarse drives the shape, fine adds detail
    float wispNoise = wispCoarse * 0.65 + wispFine * 0.35;

    // Feather offset: shifts when THIS pixel's fog burns away.
    // blowout (sin curve, 0→1→0) gates the effect so it only fires
    // during the dissolve window and is absent at steady state.
    // Range: ±0.28 of mask — enough to make edges ragged without
    // revealing fully-fogged areas.
    float feather = (wispNoise - 0.5) * 0.56 * blowout;

    // Noisy mask: each pixel dissolves at a slightly different time
    float noisyMask = clamp(mask + feather, 0.0, 1.0);

    // Smooth fade on the noisy threshold
    // Narrow band (0.3–0.75) keeps edges crisp while still feathered
    float fade_alpha = 1.0 - smoothstep(0.3, 0.75, noisyMask);

    vec3 finalRGB = density * baseColor * 1.3;
    return vec4(finalRGB * fade_alpha, fade_alpha);
}

// -----------------------------------------------------------
// MAIN PIPELINE
// -----------------------------------------------------------
vec4 main(vec2 inp) {
    vec2 st = inp.xy / iResolution.xy;
    vec2 worldCoord = inp + u_canvasOffset;

    vec2 animState = getExactRevealState(worldCoord);
    float mask    = animState.x;
    float blowout = animState.y;

    // Gentle UV drift during dissolve (fog texture moves, not warps)
    vec2 warpedST = applyBlowoutDistortion(st, blowout);

    vec4 fogData   = calculateBaseFog(warpedST);
    vec3 fogColor  = fogData.rgb;
    float fogDensity = fogData.a;

    // st (not warpedST) for noise — wisp positions should be stable
    // in screen space so tendrils don't slide with the fog texture
    return composeFinalPixel(st, fogColor, fogDensity, mask, blowout);
}
`);

if (!Fog) throw new Error("Failed to compile FogShader");

export interface FogShaderProps {
  shaderSize: Measure;
  revealTexture: SkImage | null;
  squareSize: Measure;
  fogOpacity?: number;
}

const FogShader = memo(
  ({
    shaderSize,
    revealTexture,
    squareSize,
    fogOpacity = 1.0,
  }: FogShaderProps) => {
    const time = useSharedValue(0);

    useFrameCallback(() => {
      time.value = performance.now();
    });

    const canvasResize = 1.4;
    const shaderResize = 1.0;

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

    const uniforms = useDerivedValue(
      () => ({
        iTime: time.value,
        iResolution: [shaderSize.width, shaderSize.height, 0],
        u_squareSize: [squareSize.width, squareSize.height],
        u_canvasOffset: [
          canvasInParentPlacement.width,
          canvasInParentPlacement.height,
        ],
      }),
      [time, shaderSize, squareSize, canvasInParentPlacement],
    );

    if (!revealTexture) return null;

    return (
      <Canvas
        style={{
          width: shaderSize.width * canvasResize,
          height: shaderSize.height * canvasResize,
          position: "absolute",
          left: canvasInParentPlacement.width,
          top: canvasInParentPlacement.height,
          pointerEvents: "none",
        }}
      >
        <Group opacity={fogOpacity}>
          <Rect
            x={shaderInCanvasPlacement.width}
            y={shaderInCanvasPlacement.height}
            width={shaderSize.width * shaderResize}
            height={shaderSize.height * shaderResize}
          >
            <Shader source={Fog} uniforms={uniforms}>
              {/* FilterMode.Nearest strictly disables bilinear interpolation on Skia's end */}
              <ImageShader
                image={revealTexture}
                sampling={{ filter: FilterMode.Nearest }}
              />
            </Shader>
            <BlurMask blur={5} style="normal" />
          </Rect>
        </Group>
      </Canvas>
    );
  },
);

export default FogShader;
