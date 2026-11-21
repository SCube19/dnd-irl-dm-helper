import React, { useState } from "react";
import { View } from "react-native";
import { MapControlsOverlay } from "../../components/MapControlsOverlay";
import { useLayerStore } from "../orchestrator";
import { FogLayerKey, type FogLayerState } from "./FogLayer";
import { InteractionMode } from "../../types/common";

interface UILayerProps {
  mapName: string;
  onMapNameChange: (name: string) => void;
  gridSpacing: number;
  onGridSpacingChange: (spacing: number) => void;
  onSave: () => void | Promise<void>;
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
}

/** Screen-space HUD: connects the controls overlay to the layer store. */
export function UILayer({
  mapName,
  onMapNameChange,
  gridSpacing,
  onGridSpacingChange,
  onSave,
  interactionMode,
  onInteractionModeChange,
}: UILayerProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [fog, setFog] = useLayerStore(FogLayerKey);

  const updateFog = (patch: Partial<FogLayerState>) =>
    setFog((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setIsEditingName(false);
    await onSave();
  };

  return (
    <View style={{ flex: 1 }} pointerEvents="box-none">
      <MapControlsOverlay
        handleSave={handleSave}
        isEditingName={isEditingName}
        setIsEditingName={setIsEditingName}
        mapName={mapName}
        setMapName={onMapNameChange}
        interactionMode={interactionMode}
        setInteractionMode={onInteractionModeChange}
        eraseSize={fog.eraseSize}
        setEraseSize={(eraseSize) => updateFog({ eraseSize })}
        gridSpacing={gridSpacing}
        setGridSpacing={onGridSpacingChange}
        fogOfWarVisible={fog.visible}
        setFogOfWarVisible={(visible) => updateFog({ visible })}
        viewerRole={fog.viewerRole}
        setViewerRole={(viewerRole) => updateFog({ viewerRole })}
      />
    </View>
  );
}
