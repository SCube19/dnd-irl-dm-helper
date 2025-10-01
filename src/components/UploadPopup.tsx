import React, { useState, useRef, ChangeEvent } from "react";
import { View, Pressable, Text, Modal } from "react-native";
import ButtonPrimary from "./buttons/ButtonPrimary";
import ButtonSecondary from "./buttons/ButtonSecondary";

// Define a type for the ImageUploadPopup's props
interface ImageUploadPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onUpload: (imageUri: string) => void;
}

// The Image Upload Popup component
const UploadPopup: React.FC<ImageUploadPopupProps> = ({
  isVisible,
  onClose,
  onUpload,
}) => {
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to handle the file selection
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to trigger the hidden file input
  const handleOpenPicker = () => {
    fileInputRef.current?.click();
  };

  const [formError, setFormError] = useState<boolean>(false);
  // Function to handle the final upload action
  const handleUploadClick = () => {
    if (!image) {
      setFormError(true);
      return;
    }
    setFormError(false);
    onUpload(image);
  };

  const handleCancel = () => {
    onClose();
  };

  const handleShow = () => {
    setFormError(false);
    setImage(null);
  };

  return (
    <Modal
      animationType="fade"
      visible={isVisible}
      transparent={true}
      onRequestClose={handleCancel}
      onShow={handleShow}
    >
      <View className="flex items-center justify-center h-full w-full bg-gray-500 bg-opacity-50">
        <View className="bg-white p-8 rounded-2xl shadow-xl w-11/12 md:w-3/4 lg:w-1/3 max-h-[80vh] flex flex-col">
          <Text className="text-2xl font-bold mb-6 text-center text-gray-800">
            Upload Image
          </Text>

          {/* Hidden file input element  TODO: Change to document picker */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Image selection area TODO: make look prettier */}
          <Pressable
            onPress={handleOpenPicker}
            className={`${
              formError ? "border-error" : "border-gray-300"
            } flex-grow flex items-center justify-center mb-6 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 duration-200`}
          >
            {image ? (
              <img
                src={image}
                alt="Selected preview"
                className="max-w-full max-h-full object-contain rounded-lg shadow-inner"
              />
            ) : (
              <Text
                className={`${
                  formError ? "text-error" : "text-gray-500"
                }  text-center`}
              >
                Tap to select an image from your computer.
              </Text>
            )}
          </Pressable>
          {/* Button set */}
          <View className="flex flex-row justify-between space-x-4">
            <ButtonSecondary className="flex-grow" onPress={handleCancel}>
              Cancel
            </ButtonSecondary>
            <ButtonPrimary className="flex-grow" onPress={handleUploadClick}>
              Upload
            </ButtonPrimary>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UploadPopup;
