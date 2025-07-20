// Uploader.tsx
import React, { useRef } from "react";
import "../../global.css"; // Import global styles if needed
import ButtonPrimary from "./buttons/ButtonSecondary";

const Uploader = ({ onImageUpload }: any) => {
  // Ref to programmatically click the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles the image file upload event.
   * Reads the selected file using FileReader and calls the `onImageUpload` prop.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event from the file input element.
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Get the first selected file
    if (file) {
      const reader = new FileReader(); // Create a new FileReader instance
      reader.onloadend = () => {
        onImageUpload(reader.result); // Call the prop function with the Data URL
      };
      reader.readAsDataURL(file); // Read the file as a Data URL
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*" // Only accept image files
        onChange={handleFileChange}
        ref={fileInputRef} // Assign the ref to this input
        className="hidden" // Hide the default browser file input UI
      />
      <ButtonPrimary
        onClick={() => fileInputRef.current?.click()}
        // className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        Upload Image
      </ButtonPrimary>
    </>
  );
};

export default Uploader;
