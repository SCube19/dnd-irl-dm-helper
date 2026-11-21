import React, { memo } from "react";
import { Image, Platform } from "react-native";

/**
 * Fills its parent with a cover-cropped image. On web a native `<img>` is
 * used so animated GIF/WebP tokens keep animating inside transformed layers.
 */
export const TokenImage = memo(function TokenImage({ uri }: { uri: string }) {
  if (Platform.OS === "web") {
    return React.createElement("img", {
      src: uri,
      alt: "",
      draggable: false,
      decoding: "async",
      style: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        pointerEvents: "none",
        userSelect: "none",
      },
    });
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: "100%", height: "100%" }}
      resizeMode="cover"
    />
  );
});
