import React from "react";
import { View } from "react-native";
import Animated, {
  SharedValue,
  clamp,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import { TokenImage } from "../../../components/TokenImage";
import type { Token } from "./tokenTypes";

const TOOLTIP_BOX_SIZE = 168;
const TOOLTIP_HALF = TOOLTIP_BOX_SIZE / 2;
const ARROW_HALF_WIDTH = 9;
const ARROW_HEIGHT = 10;
const MIN_SCALE = 0.25;
const MAX_SCALE = 5;

function computeTooltipPlacement(
  centerX: number,
  centerY: number,
  radius: number,
  s: number,
  tx: number,
  ty: number,
  imageWidth: number,
  containerWidth: number,
  containerHeight: number,
) {
  "worklet";
  const screenRadius = radius * s;
  const screenX = tx + centerX * s;
  const screenY = ty + centerY * s;
  const neededAbove = screenRadius + TOOLTIP_BOX_SIZE + 16;

  const hasViewport = containerWidth > 0 && containerHeight > 0;
  const hasRoomBelow = !hasViewport || containerHeight - screenY >= neededAbove;
  const nearTopOfViewport = hasViewport && screenY - 72 < neededAbove;
  const nearTopOfMap = centerY * s < neededAbove;
  const placeBelow = (nearTopOfViewport || nearTopOfMap) && hasRoomBelow;

  const minEdgeDist = TOOLTIP_HALF + 10;
  const leftDist = hasViewport ? Math.min(centerX * s, screenX) : centerX * s;
  const rightMapDist =
    imageWidth > 0 ? (imageWidth - centerX) * s : minEdgeDist;
  const rightDist = hasViewport
    ? Math.min(rightMapDist, containerWidth - screenX)
    : rightMapDist;

  let shiftX = 0;
  if (leftDist < minEdgeDist && rightDist > leftDist) {
    shiftX = minEdgeDist - leftDist;
  } else if (rightDist < minEdgeDist && leftDist > rightDist) {
    shiftX = -(minEdgeDist - rightDist);
  }
  shiftX = clamp(shiftX, -(TOOLTIP_HALF - 18), TOOLTIP_HALF - 18);

  const verticalOffset =
    (screenRadius + TOOLTIP_HALF + 12) * (placeBelow ? 1 : -1);

  return { s, placeBelow, shiftX, verticalOffset };
}

interface TokenTooltipProps {
  token: Token;
  centerX: number;
  centerY: number;
  radius: number;
  imageWidth: number;
  scale: SharedValue<number>;
  translationX: SharedValue<number>;
  translationY: SharedValue<number>;
  containerSize: { width: number; height: number };
}

/** Large image preview anchored above (or below) a token, counter-scaled. */
export function TokenTooltip({
  token,
  centerX,
  centerY,
  radius,
  imageWidth,
  scale,
  translationX,
  translationY,
  containerSize,
}: TokenTooltipProps) {
  const { width: containerWidth, height: containerHeight } = containerSize;

  const placement = useDerivedValue(() =>
    computeTooltipPlacement(
      centerX,
      centerY,
      radius,
      clamp(scale.value, MIN_SCALE, MAX_SCALE),
      translationX.value,
      translationY.value,
      imageWidth,
      containerWidth,
      containerHeight,
    ),
  );

  const boxStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 / placement.value.s },
      { translateY: placement.value.verticalOffset },
      { translateX: placement.value.shiftX },
    ],
  }));

  const topArrowStyle = useAnimatedStyle(() => ({
    opacity: placement.value.placeBelow ? 1 : 0,
    transform: [{ translateX: -placement.value.shiftX }],
  }));

  const bottomArrowStyle = useAnimatedStyle(() => ({
    opacity: placement.value.placeBelow ? 0 : 1,
    transform: [{ translateX: -placement.value.shiftX }],
  }));

  if (!token.imageUri) return null;

  const arrowBase = {
    position: "absolute" as const,
    left: TOOLTIP_HALF - ARROW_HALF_WIDTH,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_HALF_WIDTH,
    borderRightWidth: ARROW_HALF_WIDTH,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  };

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: centerX - TOOLTIP_HALF,
          top: centerY - TOOLTIP_HALF,
          width: TOOLTIP_BOX_SIZE,
          height: TOOLTIP_BOX_SIZE,
          zIndex: 999,
        },
        boxStyle,
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          arrowBase,
          {
            top: -ARROW_HALF_WIDTH,
            borderBottomWidth: ARROW_HEIGHT,
            borderBottomColor: token.color,
          },
          topArrowStyle,
        ]}
      />
      <View
        style={{
          width: TOOLTIP_BOX_SIZE,
          height: TOOLTIP_BOX_SIZE,
          borderRadius: 18,
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderWidth: 3,
          borderColor: token.color,
          padding: 6,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.55,
          shadowRadius: 14,
          elevation: 14,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "rgba(30, 41, 59, 0.9)",
          }}
        >
          <TokenImage uri={token.imageUri} />
        </View>
      </View>
      <Animated.View
        style={[
          arrowBase,
          {
            bottom: -ARROW_HALF_WIDTH,
            borderTopWidth: ARROW_HEIGHT,
            borderTopColor: token.color,
          },
          bottomArrowStyle,
        ]}
      />
    </Animated.View>
  );
}
