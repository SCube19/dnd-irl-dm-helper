import React, { memo, useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { TokenImage } from "../../../components/TokenImage";
import { SETTLE_SPRING, type TokenAnim } from "./tokenAnimation";
import type { Token } from "./tokenTypes";

const HIGHLIGHT_COLOR = "#38bdf8";

interface TokenItemProps {
  token: Token;
  homeX: number;
  homeY: number;
  diameter: number;
  borderWidth: number;
  gridSpacing: number;
  isHeld: boolean;
  isHighlighted: boolean;
  /** Exposes this token's shared values to the layer; returns cleanup. */
  registerAnim: (id: string, anim: TokenAnim) => () => void;
}

export const TokenItem = memo(function TokenItem({
  token,
  homeX,
  homeY,
  diameter,
  borderWidth,
  gridSpacing,
  isHeld,
  isHighlighted,
  registerAnim,
}: TokenItemProps) {
  const x = useSharedValue(homeX);
  const y = useSharedValue(homeY);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const prevRef = useRef({ x: homeX, y: homeY, spacing: gridSpacing });

  useEffect(
    () => registerAnim(token.id, { x, y, scale, lift }),
    [token.id, x, y, scale, lift, registerAnim],
  );

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { x: homeX, y: homeY, spacing: gridSpacing };
    if (prev.spacing !== gridSpacing) {
      x.value = homeX;
      y.value = homeY;
      scale.value = 1;
      lift.value = 0;
    } else if (prev.x !== homeX || prev.y !== homeY) {
      x.value = withSpring(homeX, SETTLE_SPRING);
      y.value = withSpring(homeY, SETTLE_SPRING);
    }
  }, [homeX, homeY, gridSpacing, x, y, scale, lift]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
    zIndex: isHeld || scale.value > 1.02 ? 100 : isHighlighted ? 20 : 1,
    shadowOffset: { width: 0, height: 1.5 + lift.value * 5.5 },
    shadowOpacity: 0.35 + lift.value * 0.15,
    shadowRadius: 2.5 + lift.value * 6,
    elevation: 4 + lift.value * 8,
  }));

  const emphasized = isHeld || isHighlighted;
  const { imageUri } = token;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: token.color,
          borderWidth: emphasized ? borderWidth + 1 : borderWidth,
          borderColor: emphasized
            ? HIGHLIGHT_COLOR
            : imageUri
              ? token.color
              : "#ffffff",
          shadowColor: "#000000",
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      {imageUri && (
        <View
          style={{
            width: "100%",
            height: "100%",
            borderRadius: diameter / 2,
            overflow: "hidden",
            borderWidth: Math.max(1, borderWidth * 0.45),
            borderColor: "#ffffff",
          }}
        >
          <TokenImage uri={imageUri} />
        </View>
      )}
    </Animated.View>
  );
});
