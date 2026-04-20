import React, { useState } from "react";
import { View, Pressable, Text, Modal, Image, Platform, TextInput } from "react-native";
import * as ImagePicker from "expo-image-picker";
import ButtonPrimary from "./buttons/ButtonPrimary";
import ButtonSecondary from "./buttons/ButtonSecondary";

interface ImageUploadPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onUpload: (imageUri: string, name: string) => void;
}

const UploadPopup: React.FC<ImageUploadPopupProps> = ({
  isVisible,
  onClose,
  onUpload,
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [formError, setFormError] = useState<boolean>(false);

  const handleOpenPicker = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Sorry, we need camera roll permissions to make this work!");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setFormError(false);
    }
  };

  const handleUploadClick = () => {
    if (!image || !name.trim()) {
      setFormError(true);
      return;
    }
    setFormError(false);
    onUpload(image, name);
  };

  const handleCancel = () => {
    onClose();
  };

  const handleShow = () => {
    setFormError(false);
    setImage(null);
    setName("");
  };

  return (
    <Modal
      animationType="fade"
      visible={isVisible}
      transparent={true}
      onRequestClose={handleCancel}
      onShow={handleShow}
    >
      <View className="flex items-center justify-center h-full w-full bg-black/60 backdrop-blur-sm">
        <View className="bg-base-100 p-8 rounded-3xl shadow-2xl w-11/12 md:w-3/4 lg:w-1/3 max-h-[90vh] flex flex-col border border-base-300">
          <Text className="text-3xl font-bold mb-6 text-center text-content-base">
            Upload Battle Map
          </Text>

          <View className="mb-6">
            <Text className="text-content-base/70 font-semibold mb-2 ml-1">
              Map Name
            </Text>
            <TextInput
              placeholder="e.g. Goblin Ambush"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              className={`bg-base-200 p-4 rounded-xl text-content-base border-2 ${
                formError && !name.trim() ? "border-error" : "border-transparent"
              } focus:border-secondary duration-200`}
            />
          </View>

          <Pressable
            onPress={handleOpenPicker}
            className={`${
              formError && !image ? "border-error" : "border-secondary/40"
            } flex-grow flex items-center justify-center mb-8 p-6 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-secondary/5 duration-200 aspect-video overflow-hidden bg-base-200/50`}
          >
            {image ? (
              <Image
                source={{ uri: image }}
                resizeMode="contain"
                className="w-full h-full rounded-xl shadow-lg"
              />
            ) : (
              <View className="items-center">
                <Text
                  className={`${
                    formError && !image ? "text-error" : "text-secondary"
                  } text-center font-semibold text-lg`}
                >
                  Select Map Image
                </Text>
                <Text className="text-content-base/60 text-center mt-2 px-4 italic">
                  Choose a JPG or PNG from your device
                </Text>
              </View>
            )}
          </Pressable>

          <View className="flex flex-row justify-between gap-4">
            <ButtonSecondary className="flex-grow py-4" onPress={handleCancel}>
              Cancel
            </ButtonSecondary>
            <ButtonPrimary
              className="flex-grow py-4"
              onPress={handleUploadClick}
            >
              Confirm Upload
            </ButtonPrimary>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UploadPopup;

