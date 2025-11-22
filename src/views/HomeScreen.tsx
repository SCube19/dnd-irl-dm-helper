import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Image,
  Modal,
  ImageURISource,
} from "react-native";
import ButtonPrimary from "../components/buttons/ButtonPrimary";
import ButtonSecondary from "../components/buttons/ButtonSecondary";
import Card from "../components/cards/Card";
import MapCard from "../components/cards/MapCard";
import UploadPopup from "../components/UploadPopup";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { saveImage, getImages } from "../utils/ImageStorage";

function HomeScreen() {
  const header = require("../../assets/dndheader.png");

  const [uploadVisible, setUploadVisible] = useState<boolean>(false);

  const navigation = useNavigation();

  const [maps, setMaps] = useState<ImageURISource[]>([]);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const loadedImages = await getImages();
      setMaps(
        loadedImages.map((image: string) => {
          return { uri: image };
        })
      );
    } catch (error) {
      console.error("Failed to load images", error);
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await saveImage(result.assets[0].uri);
        loadImages();
      }
    } catch (err) {
      console.error("Unknown error: ", err);
    }
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
            <MapCard onPress={handleUpload}></MapCard>
            {maps.map((map, index) => (
              <MapCard
                key={index}
                photoUri={map}
                onPress={() => navigation.navigate("Map", { map: map })}
              />
            ))}
          </View>
        </View>
        {/* <UploadPopup
          isVisible={uploadVisible}
          onUpload={(uri) => {
            setUploadVisible(false);
            handleUpload(uri);
          }}
          onClose={() => setUploadVisible(false)}
        ></UploadPopup> */}
      </View>
    </SafeAreaView>
  );
}

export default HomeScreen;
