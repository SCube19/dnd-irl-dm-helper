import {
  Skia,
  Canvas,
  Shader,
  Rect,
  Group,
  ImageShader,
  SkImage,
  BlurMask,
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

float random (in vec2 _st) { return fract(sin(dot(_st.xy, vec2(12.9898,78.233)))* 43758.5453123); }

float noise (in vec2 _st) {
    vec2 i = floor(_st); vec2 f = fract(_st);
    float a = random(i); float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm ( in vec2 _st) {
    float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 5; ++i) { v += a * noise(_st); _st = rot * _st * 2.0 + shift; a *= 0.5; }
    return v;
}

// Decouples the spatial mask from the transient animation state
vec2 getRevealData(vec2 coord) {
    half4 sample = u_mapTexture.eval(coord);
    
    // Alpha 0.0 means hidden
    if (sample.a < 0.5) return vec2(0.0, 0.0);
    
    float r = floor(sample.r * 255.0 + 0.5);
    float g = floor(sample.g * 255.0 + 0.5);
    
    float revealTime = (r * 255.0 + g) / 1000.0;
    float currentTime = mod(iTime, 65.025);
    
    // FIX: Linear difference handles normal time passing naturally
    float timeDiff = currentTime - revealTime;
    
    // FIX: If timeDiff is highly negative (e.g., -64.0s), the 65s loop just wrapped around.
    // If it is only slightly negative (e.g., -0.05s), JS is just a few milliseconds ahead.
    if (timeDiff < -1.0) {
        timeDiff += 65.025; 
    }
    
    // Clamp any remaining minor JS jitter to 0.0 so newly brushed squares wait perfectly
    timeDiff = max(0.0, timeDiff);
    
    float animDuration = 1.0; 
    
    // mask: Interpolates smoothly to 1.0 and locks there to form the static feather
    float mask = clamp(timeDiff / animDuration, 0.0, 1.0);
    
    // blowout: Peaks at 1.0 midway through the animation, returns to 0.0 for static borders
    float blowout = sin(mask * 3.14159265);
    
    return vec2(mask, blowout);
}

vec4 main(vec2 inp) {
    vec2 st = inp.xy / iResolution.xy;
    vec2 worldCoord = inp + u_canvasOffset;
    
    // Bilinear Interpolation
    vec2 pos = (worldCoord / u_squareSize) - vec2(0.5);
    vec2 i = floor(pos);
    vec2 f = fract(pos);
    f = f * f * (3.0 - 2.0 * f);
    
    vec2 d00 = getRevealData(i + vec2(0.5, 0.5));
    vec2 d10 = getRevealData(i + vec2(1.5, 0.5));
    vec2 d01 = getRevealData(i + vec2(0.5, 1.5));
    vec2 d11 = getRevealData(i + vec2(1.5, 1.5));
    
    vec2 data = mix(mix(d00, d10, f.x), mix(d01, d11, f.x), f.y);
    float mask = data.x;
    float blowout = data.y;

    if (mask > 0.999) return vec4(0.0);

    // --- BLOWOUT EFFECT ---
    vec2 noiseWarp = vec2(
        fbm(st * 8.0 + iTime * 2.0),
        fbm(st * 8.0 - iTime * 2.0 + 15.0)
    ) - 0.5; 
    
    st += (noiseWarp * 5.0) * blowout;

    // --- BASE FOG ---
    vec2 q = vec2(0.);
    q.x = fbm( st + 0.00*iTime); q.y = fbm( st + vec2(1.0));
    vec2 r = vec2(0.);
    r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*iTime );
    r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*iTime);

    float f_val = fbm(st+r);
    vec3 color = mix(vec3(0.10, 0.61, 0.66), vec3(0.66, 0.66, 0.49), clamp((f_val*f_val)*4.0, 0.0, 1.0));
    color = mix(color, vec3(0.0, 0.0, 0.16), clamp(length(q), 0.0, 1.0));
    color = mix(color, vec3(0.66, 1.0, 1.0), clamp(length(r.x), 0.0, 1.0));
    
    // --- FEATHER & PREMULTIPLIED ALPHA ---
    // Smoothstep creates the clean, feathered gradient border
    float fade_alpha = 1.0 - smoothstep(0.1, 0.9, mask);
    float fog_density = (f_val*f_val*f_val + 0.6*f_val*f_val + 0.5*f_val);
    
    vec3 finalRGB = fog_density * color * 1.3;
    return vec4(finalRGB * fade_alpha, fade_alpha);
}`);

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
      time.value = performance.now() / 1000.0;
    });

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
              <ImageShader image={revealTexture} />
            </Shader>
            <BlurMask blur={20} style="normal" />
          </Rect>
        </Group>
      </Canvas>
    );
  },
);

export default FogShader;
