import React, { useState } from "react";
import { View, Text, SafeAreaView, Image } from "react-native";
import MapCard from "../components/cards/MapCard";
import UploadPopup from "../components/UploadPopup";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../../App"; // Assuming standard react-navigation setup, but let's use generic

// Static assets moved outside of component to prevent recreation on each render
const maps = [
  require("../../assets/placeholders/1.png"),
  require("../../assets/placeholders/2.png"),
  require("../../assets/placeholders/3.png"),
  require("../../assets/placeholders/4.png"),
];

const header = require("../../assets/dndheader.png");

/**
 * HomeScreen Component
 * Displays the main screen allowing users to choose or upload a battle map.
 */
function HomeScreen() {
  // State to manage the visibility of the upload modal
  const [uploadVisible, setUploadVisible] = useState<boolean>(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();

  /**
   * Handles the upload of a new map image and navigates to the Map screen.
   * @param imageUri - The URI of the uploaded image.
   */
  const handleUpload = (imageUri: string) => {
    navigation.navigate("Map", { map: imageUri });
  };

  return (
    <SafeAreaView className="bg-base-200 h-full w-screen">
      <View className="h-full w-screen m-5">
        <View className="flex items-center">
          <Image resizeMode="center" source={header}></Image>
        </View>
        <View>
          <Text className="flex justify-center color-content-base font-bold text-3xl m-12">
            Choose or upload a battle map
          </Text>
          <View className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-5 w-3/4 mx-auto">
            <MapCard onPress={() => setUploadVisible(true)}></MapCard>
            {maps.map((map, index) => (
              <MapCard
                key={index}
                photoUri={map}
                onPress={() => navigation.navigate("Map", { map: map })}
              />
            ))}
            {maps.map((map, index) => (
              <MapCard
                key={index}
                photoUri={map}
                onPress={() => navigation.navigate("Map", { map: map })}
              />
            ))}
            {maps.map((map, index) => (
              <MapCard
                key={index}
                photoUri={map}
                onPress={() => navigation.navigate("Map", { map: map })}
              />
            ))}
          </View>
        </View>
        <UploadPopup
          isVisible={uploadVisible}
          onUpload={(uri) => {
            setUploadVisible(false);
            handleUpload(uri);
          }}
          onClose={() => setUploadVisible(false)}
        ></UploadPopup>
      </View>
    </SafeAreaView>
  );
}

export default HomeScreen;
