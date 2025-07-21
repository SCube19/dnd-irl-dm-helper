import { useState } from "react";
import {
  Image,
  StyleSheet,
  ImageSourcePropType,
  View,
  Pressable,
  Text,
} from "react-native";

import turbulence from "../../../assets/turbulence.svg";

const MapCard = ({
  photoUri,
  mapName,
  onPress,
}: {
  photoUri?: ImageSourcePropType;
  onPress?: () => void;
}) => {
  const [show, setShow] = useState(false);

  return (
    <Pressable
      onClick={onPress}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      className="relative w-full pb-[100%] bg-base-100 rounded-box shadow-md overflow-hidden flex items-center justify-center cursor-pointer transform transition duration-200 hover:scale-[1.02]"
      style={{ aspectRatio: "1/1" }} // Ensure square aspect ratio
    >
      {photoUri ? (
        // Display the photo if photoUri is provided
        <>
          {/* Increase size to 105% */}
          <View
            style={styles.overflow}
            className="transition absolute z-20 inset-0 transparent hover:bg-white/20 hover:backdrop-blur-sm"
          >
            {show && (
              <Text className="flex h-full justify-center items-center color-base-100 font-extrabold sm:text-sm md:text-md lg:text-lg xl:text-xl text-center text-shadow-lg wrap-anywhere m-auto p-4">
                {mapName ? mapName : "Unnamed"}
              </Text>
            )}
          </View>
          <View className="absolute inset-0 w-full h-full">
            <Image
              source={photoUri}
              resizeMode="cover"
              style={styles.cover}
              className="transition"
            ></Image>
            <View style={styles.glare} className="bg-white"></View>
          </View>
        </>
      ) : (
        // Display the "+" sign for adding new photos
        <View className="absolute inset-0 w-full h-full bg-base-100 border-box border-base-300 flex items-center justify-center rounded-box">
          <Text className="text-6xl/10 font-light">+</Text>
          <Image
            className="opacity-30 bg-blend-overlay h-full w-full"
            source={turbulence}
            style={styles.cover}
          ></Image>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cover: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  glare: {
    bottom: "90%",
    filter: "blur(50px)",
    left: 0,
    position: "absolute",
    right: 0,
    transform: "rotate(117deg) skewX(242deg)",
    height: 50,
  },
  overflow: {
    height: "110%",
    width: "110%",
  },
});

export default MapCard;
