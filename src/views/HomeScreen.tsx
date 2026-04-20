import React, { useState, useCallback } from "react";
import { View, Text, SafeAreaView, Image, ScrollView } from "react-native";
import MapCard from "../components/cards/MapCard";
import UploadPopup from "../components/UploadPopup";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as ImageStorage from "../utils/ImageStorage";
import * as MapDataStorage from "../utils/MapDataStorage";

const header = require("../../assets/dndheader.png");

function HomeScreen() {
  const [uploadVisible, setUploadVisible] = useState<boolean>(false);
  const [savedImages, setSavedImages] = useState<{ id: string; uri: string }[]>([]);
  const [mapStates, setMapStates] = useState<Record<string, any>>({});
  const navigation = useNavigation<any>();

  // Fetch saved images and map states
  const fetchData = async () => {
    const images = await ImageStorage.getImages();
    const states = await MapDataStorage.getAllMapData();
    setSavedImages(images);
    setMapStates(states);
  };

  // Refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const handleUpload = async (imageUri: string, name: string) => {
    try {
      // 1. Save image permanently
      const saved = await ImageStorage.saveImage(imageUri);

      // 2. Save initial map data with unique ID
      await MapDataStorage.saveMapData(saved.id, {
        name: name,
        imageUri: saved.uri, // Use the real URI for display
      });

      setUploadVisible(false);
      await fetchData();
      // Navigate to Map with the new map ID
      navigation.navigate("Map", { map: saved.id });
    } catch (e) {
      console.error("Failed to save and upload image:", e);
    }
  };

  const handleDeleteMap = async (id: string) => {
    try {
      await ImageStorage.deleteImage(id);
      await MapDataStorage.deleteMapData(id);
      await fetchData();
    } catch (e) {
      console.error("Failed to delete map:", e);
    }
  };

  const navigateToMap = (uri: string) => {
    navigation.navigate("Map", { map: uri });
  };

  const placeholderMap = require("../../assets/placeholders/1.png");

  return (
    <SafeAreaView className="bg-base-200 h-full w-screen">
      <ScrollView className="h-full w-screen px-5">
        <View className="flex items-center mt-8">
          <Image
            resizeMode="contain"
            source={header}
            className="w-64 h-32"
          ></Image>
        </View>

        <View className="mb-20">
          <Text className="text-center color-content-base font-bold text-3xl my-8">
            Battle Maps
          </Text>

          <View className="flex-row flex-wrap justify-center gap-6 max-w-6xl mx-auto">
            {/* Upload New Card */}
            <View className="w-40 sm:w-48">
              <MapCard onPress={() => setUploadVisible(true)} />
              <Text className="text-center mt-2 font-semibold text-content-base/60">
                New Map
              </Text>
            </View>

            {/* Test Placeholder */}
            <View className="w-40 sm:w-48">
              <MapCard
                photoUri={placeholderMap}
                mapName="Castle Entrance"
                onPress={() => navigateToMap(placeholderMap)}
              />
              <Text className="text-center mt-2 font-bold text-content-base">
                Castle Entrance
              </Text>
            </View>

            {/* Custom User Maps */}
            {savedImages.map((savedImg, index) => {
              const session = mapStates[savedImg.id];
              const mapName = session?.name || `Map ${index + 1}`;
              const hasData = session && session.revealedSquares?.length > 0;
              const displayUri = session?.imageUri || savedImg.uri;

              return (
                <View key={`saved-${savedImg.id}`} className="w-40 sm:w-48">
                  <MapCard
                    photoUri={{ uri: displayUri }}
                    mapName={mapName}
                    onPress={() => navigateToMap(savedImg.id)}
                    onDelete={() => handleDeleteMap(savedImg.id)}
                  />
                  <View className="flex-row items-center justify-center mt-2 gap-2">
                    <Text
                      className="text-center font-bold text-content-base truncate"
                      numberOfLines={1}
                    >
                      {mapName}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {savedImages.length === 0 && (
            <View className="mt-20 items-center opacity-40">
              <Text className="text-content-base text-lg font-medium">
                No maps uploaded yet.
              </Text>
              <Text className="text-content-base text-sm italic mt-1">
                Tap "+" to start your adventure!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <UploadPopup
        isVisible={uploadVisible}
        onUpload={handleUpload}
        onClose={() => setUploadVisible(false)}
      />
    </SafeAreaView>
  );
}

export default HomeScreen;
