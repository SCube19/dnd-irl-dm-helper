import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { saveImage, getImages, deleteImage } from "../utils/ImageStorage";
import "../styles/global.css";

const ImageLibraryScreen = () => {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const loadedImages = await getImages();
      setImages(loadedImages);
    } catch (error) {
      console.error("Failed to load images", error);
    }
  };

  const handleAddImage = async () => {
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

  const handleDeleteImage = async (uri: string) => {
    Alert.alert("Delete Image", "Are you sure you want to delete this image?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteImage(uri);
          loadImages();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: string }) => (
    <View className="m-2 relative">
      <Image
        source={{ uri: item }}
        className="w-32 h-32 rounded-lg bg-base-300"
      />
      <TouchableOpacity
        onPress={() => handleDeleteImage(item)}
        className="absolute top-0 right-0 bg-red-500 rounded-full w-6 h-6 items-center justify-center m-1"
      >
        <Text className="text-white font-bold">X</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-base-100">
      <View className="p-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-base-content">
          Image Library
        </Text>
        <TouchableOpacity
          onPress={handleAddImage}
          className="bg-primary px-4 py-2 rounded-lg"
        >
          <Text className="text-primary-content font-bold">Add Image</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={images}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        numColumns={3}
        contentContainerStyle={{ padding: 8 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-20">
            <Text className="text-base-content opacity-50">
              No images found. Add some!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default ImageLibraryScreen;
