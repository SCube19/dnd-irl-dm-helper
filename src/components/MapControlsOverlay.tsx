import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import ButtonPrimary from "./buttons/ButtonPrimary";
import ButtonSecondary from "./buttons/ButtonSecondary";
import SliderPrimary from "./sliders/SliderPrimary";
import { InteractionMode } from "../types/common";
import SwitchPrimary from "./switches/SwitchPrimary";
import Card from "./cards/Card";

export interface MapControlsOverlayProps {
  handleSave: () => void;
  isEditingName: boolean;
  setIsEditingName: (editing: boolean) => void;
  mapName: string;
  setMapName: (name: string) => void;
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
  eraseSize: number;
  setEraseSize: (size: number) => void;
  gridSpacing: number;
  setGridSpacing: (spacing: number) => void;
  clearFogOfWar: () => void;
  fogOfWarVisible: boolean;
  setFogOfWarVisible: (visible: boolean) => void;
}

export const MapControlsOverlay = ({
  handleSave,
  isEditingName,
  setIsEditingName,
  mapName,
  setMapName,
  interactionMode,
  setInteractionMode,
  eraseSize,
  setEraseSize,
  gridSpacing,
  setGridSpacing,
  clearFogOfWar,
  fogOfWarVisible,
  setFogOfWarVisible,
}: MapControlsOverlayProps) => {
  return (
    <View className="absolute top-6 left-6 right-6 z-50 flex-row justify-between items-start pointer-events-none">
      <View className="flex-row items-center pointer-events-auto gap-4">
        <ButtonPrimary onPress={handleSave} className="px-6 py-3 shadow-xl">
          Save State
        </ButtonPrimary>

        <View className="bg-base-100/90 px-6 py-3 rounded-2xl border border-base-300 shadow-xl flex-row items-center gap-3">
          {isEditingName ? (
            <TextInput
              value={mapName}
              onChangeText={setMapName}
              autoFocus
              onBlur={() => setIsEditingName(false)}
              className="text-xl font-bold text-content-base min-w-[150px]"
            />
          ) : (
            <Pressable onPress={() => setIsEditingName(true)}>
              <Text className="text-xl font-bold text-content-base">
                {mapName}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Draw Mode Toggle Overlay */}
      <View className="flex-row items-center gap-4">
        <Card>
          <SwitchPrimary
            value={fogOfWarVisible}
            onValueChange={setFogOfWarVisible}
          />
        </Card>
        <Card className="p-4 pointer-events-auto items-end gap-4 max-w-sm">
          {/* Interaction Modes */}
          <View className="flex-row gap-0">
            <ButtonSecondary
              onPress={() => setInteractionMode(InteractionMode.PAN)}
              className={`w-20 ${interactionMode !== InteractionMode.PAN ? "opacity-30" : ""}`}
            >
              Pan
            </ButtonSecondary>
            <ButtonSecondary
              onPress={() => setInteractionMode(InteractionMode.DRAW)}
              className={`w-20 ${interactionMode !== InteractionMode.DRAW ? "opacity-30" : ""}`}
            >
              Erase
            </ButtonSecondary>
            <ButtonSecondary
              onPress={() => setInteractionMode(InteractionMode.RECT)}
              className={`w-20 ${interactionMode !== InteractionMode.RECT ? "opacity-30" : ""}`}
            >
              Rect
            </ButtonSecondary>
            <ButtonSecondary
              onPress={() => setInteractionMode(InteractionMode.GRID)}
              className={`w-20 ${interactionMode !== InteractionMode.GRID ? "opacity-30" : ""}`}
            >
              Grid
            </ButtonSecondary>
          </View>

          {/* Dynamic Controls depending on mode/needs */}
          {interactionMode === InteractionMode.DRAW && (
            <View className="flex-row items-center justify-between w-full px-2 mt-2">
              <Text className="mr-3 font-bold text-content-base/70">
                Erase Size:
              </Text>
              <SliderPrimary
                value={eraseSize}
                onValueChange={setEraseSize}
                minimumValue={1}
                maximumValue={7}
                step={1}
                className="w-32"
              />
            </View>
          )}

          {interactionMode === InteractionMode.GRID && (
            <View className="flex-row items-center justify-between w-full px-2 mt-2">
              <Text className="mr-3 font-bold text-content-base/70">
                Grid Size:
              </Text>
              <SliderPrimary
                value={gridSpacing}
                onValueChange={(val) => {
                  setGridSpacing(val);
                  clearFogOfWar();
                }}
                minimumValue={10}
                maximumValue={100}
                step={1}
                className="w-32"
              />
            </View>
          )}
        </Card>
      </View>
    </View>
  );
};
