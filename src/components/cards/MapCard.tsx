import React from "react";

const PhotoCard = ({
  photoUri,
  onPress,
}: {
  photoUri?: string;
  onPress?: () => void;
}) => {
  return (
    <button
      onClick={onPress}
      className="relative w-full pb-[100%] bg-base-100 rounded-box shadow-md overflow-hidden flex items-center justify-center cursor-pointer transform transition-transform duration-200 hover:scale-[1.02]"
      style={{ aspectRatio: "1/1" }} // Ensure square aspect ratio
    >
      {photoUri ? (
        // Display the photo if photoUri is provided
        <img
          src={photoUri}
          alt="Gallery Photo"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        // Display the "+" sign for adding new photos
        <div className="absolute inset-0 w-full h-full bg-base-100 border-box border-base-300 flex items-center justify-center rounded-box">
          <span className="text-6xl text-base-content font-light">+</span>
        </div>
      )}
    </button>
  );
};

export default PhotoCard;
