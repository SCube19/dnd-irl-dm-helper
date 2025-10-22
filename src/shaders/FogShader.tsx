import {
  Skia,
  Canvas,
  Fill,
  useClock,
  Shader,
  BlurMask,
  Rect,
  BlendMode,
  Blend,
  DisplacementMap,
  Turbulence,
} from "@shopify/react-native-skia";
import { memo } from "react";
import { Dimensions } from "react-native";
import { useAnimatedProps, useDerivedValue } from "react-native-reanimated";

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

interface FogShaderProps {
  shaderSize: {
    width: number;
    height: number;
  };
}

//Will always be placed at the center of the parent container
// Maybe in the future we can make it more flexible
const FogShader = memo(({ shaderSize }: FogShaderProps) => {
  const clock = useClock();
  const uniforms = useDerivedValue(
    () => ({
      iTime: clock.value / 2000.0,
      iResolution: [shaderSize.width, shaderSize.height, 0],
    }),
    [clock]
  );

  const canvasResize = 1.4;
  const shaderResize = 1.1;

  const shaderInCanvasPlacement = {
    width:
      (shaderSize.width * canvasResize - shaderSize.width * shaderResize) / 2,
    height:
      (shaderSize.height * canvasResize - shaderSize.height * shaderResize) / 2,
  };
  const canvasInParentPlacement = {
    width: (shaderSize.width * shaderResize - shaderSize.width) / 2,
    height: (shaderSize.height * shaderResize - shaderSize.height) / 2,
  };

  return (
    <Canvas
      style={{
        width: shaderSize.width * canvasResize,
        height: shaderSize.height * canvasResize,
        position: "absolute",
        left: -shaderInCanvasPlacement.width - canvasInParentPlacement.width,
        top: -shaderInCanvasPlacement.height - canvasInParentPlacement.height,
      }}
    >
      <Rect
        x={shaderInCanvasPlacement.width}
        y={shaderInCanvasPlacement.height}
        width={shaderSize.width * shaderResize}
        height={shaderSize.height * shaderResize}
      >
        <Shader source={Fog} uniforms={uniforms}></Shader>
        <BlurMask blur={20} style="normal" />
      </Rect>
    </Canvas>
  );
});

export default FogShader;
