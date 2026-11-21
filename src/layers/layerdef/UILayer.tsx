import React, { useState } from "react";
import { View } from "react-native";
import { MapControlsOverlay } from "../../components/MapControlsOverlay";
import { TokenBrushPanel } from "../../components/TokenBrushPanel";
import {
  useLayerStore,
  useSerializeLayers,
  type SerializedLayers,
} from "../orchestrator";
import { FogLayerKey, type FogLayerState } from "./FogLayer";
import { TokenLayerKey, type TokenLayerState } from "./token";
import { InteractionMode } from "../../types/common";
import { parseRgbString, toRgbString } from "../../utils/color";

const DEFAULT_TOKEN_RGB = { r: 239, g: 68, b: 68 };

interface UILayerProps {
  mapName: string;
  onMapNameChange: (name: string) => void;
  gridSpacing: number;
  onGridSpacingChange: (spacing: number) => void;
  onSave: (layersData: SerializedLayers) => void | Promise<void>;
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
  const [tokens, setTokens] = useLayerStore(TokenLayerKey);
  const serializeLayers = useSerializeLayers();

  const updateFog = (patch: Partial<FogLayerState>) =>
    setFog((prev) => ({ ...prev, ...patch }));
  const updateTokens = (patch: Partial<TokenLayerState>) =>
    setTokens((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setIsEditingName(false);
    await onSave(serializeLayers());
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
        tokenPanel={
          <TokenBrushPanel
            color={parseRgbString(tokens.activeColor, DEFAULT_TOKEN_RGB)}
            onColorChange={(c) => updateTokens({ activeColor: toRgbString(c) })}
            size={tokens.activeSize}
            onSizeChange={(activeSize) => updateTokens({ activeSize })}
            imageUri={tokens.activeImageUri}
            onImageChange={(activeImageUri) => updateTokens({ activeImageUri })}
          />
        }
      />
    </View>
  );
}
