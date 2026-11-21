import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import ButtonPrimary from "./buttons/ButtonPrimary";
import ButtonSecondary from "./buttons/ButtonSecondary";
import SliderPrimary from "./sliders/SliderPrimary";
import SwitchPrimary from "./switches/SwitchPrimary";
import Card from "./cards/Card";
import { InteractionMode, ViewerRole } from "../types/common";

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
  fogOfWarVisible: boolean;
  setFogOfWarVisible: (visible: boolean) => void;
  viewerRole: ViewerRole;
  setViewerRole: (role: ViewerRole) => void;
}

const MODE_BUTTONS: [InteractionMode, string][] = [
  [InteractionMode.PAN, "Pan"],
  [InteractionMode.DRAW, "Erase"],
  [InteractionMode.RECT, "Rect"],
  [InteractionMode.COVER, "Cover"],
  [InteractionMode.COVER_RECT, "Cover Rect"],
  [InteractionMode.GRID, "Grid"],
];

const MODE_HINTS: Partial<Record<InteractionMode, string>> = {
  [InteractionMode.COVER_RECT]: "Drag a rectangle to cover with fog",
  [InteractionMode.RECT]: "Drag a rectangle to reveal fog",
};

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
  fogOfWarVisible,
  setFogOfWarVisible,
  viewerRole,
  setViewerRole,
}: MapControlsOverlayProps) => {
  const hint = MODE_HINTS[interactionMode];
  const isBrushMode =
    interactionMode === InteractionMode.DRAW ||
    interactionMode === InteractionMode.COVER;

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

      <View className="flex-row items-start gap-4">
        <Card className="flex-row items-center gap-3 px-3 py-2 pointer-events-auto">
          <SwitchPrimary
            value={fogOfWarVisible}
            onValueChange={setFogOfWarVisible}
          />
          <Pressable
            onPress={() => setViewerRole(viewerRole === "dm" ? "player" : "dm")}
            className={`px-3 py-1.5 rounded-xl border ${
              viewerRole === "dm"
                ? "bg-secondary/20 border-secondary/50"
                : "bg-base-300/60 border-base-300"
            }`}
          >
            <Text className="text-xs font-bold text-content-base">
              {viewerRole === "dm" ? "👁️ DM View" : "👥 Player View"}
            </Text>
          </Pressable>
        </Card>

        <Card className="p-3 pointer-events-auto items-end gap-3 max-w-lg shadow-xl">
          <View className="flex-row flex-wrap gap-1 justify-end max-w-md">
            {MODE_BUTTONS.map(([mode, label]) => (
              <ButtonSecondary
                key={mode}
                onPress={() => setInteractionMode(mode)}
                className={`px-3 py-1.5 ${
                  interactionMode === mode
                    ? "border-primary bg-primary/20"
                    : "opacity-40"
                }`}
              >
                {label}
              </ButtonSecondary>
            ))}
          </View>

          {isBrushMode && (
            <View className="flex-row items-center justify-between w-full px-2 mt-1">
              <Text className="mr-3 font-bold text-xs text-content-base/70">
                {interactionMode === InteractionMode.DRAW
                  ? "Erase Brush Size:"
                  : "Cover Brush Size:"}
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
            <View className="flex-row items-center justify-between w-full px-2 mt-1">
              <Text className="mr-3 font-bold text-xs text-content-base/70">
                Grid Size:
              </Text>
              <SliderPrimary
                value={gridSpacing}
                onValueChange={setGridSpacing}
                minimumValue={10}
                maximumValue={100}
                step={1}
                className="w-32"
              />
            </View>
          )}

          {hint && (
            <View className="w-full px-2 py-1 mt-1 bg-base-200/50 rounded-xl border border-base-300 flex-row items-center justify-between">
              <Text className="text-xs text-content-base/70 font-semibold">
                {hint}
              </Text>
            </View>
          )}
        </Card>
      </View>
    </View>
  );
};
