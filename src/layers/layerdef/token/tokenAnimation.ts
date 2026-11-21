import {
  SharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { XY } from "../../../types/common";

export interface TokenAnim {
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  lift: SharedValue<number>;
}

/** `lift` picks a token up, `move` follows the finger, `drop` settles it. */
export type TokenMotion = "lift" | "move" | "drop";

const LIFT_SCALE = 1.25;
const SCALE_UP_SPRING = { damping: 13, stiffness: 220, mass: 0.6 };
const SCALE_DOWN_SPRING = { damping: 15, stiffness: 240, mass: 0.6 };
const MOVE_SPRING = { damping: 28, stiffness: 600, mass: 0.4 };
export const SETTLE_SPRING = { damping: 18, stiffness: 260, mass: 0.6 };

export function animateTokenTo(anim: TokenAnim, pos: XY, motion: TokenMotion) {
  const spring = motion === "drop" ? SETTLE_SPRING : MOVE_SPRING;
  anim.x.value = withSpring(pos.x, spring);
  anim.y.value = withSpring(pos.y, spring);
  if (motion === "lift") {
    anim.scale.value = withSpring(LIFT_SCALE, SCALE_UP_SPRING);
    anim.lift.value = withTiming(1, { duration: 150 });
  } else if (motion === "drop") {
    anim.scale.value = withSpring(1, SCALE_DOWN_SPRING);
    anim.lift.value = withTiming(0, { duration: 180 });
  }
}
