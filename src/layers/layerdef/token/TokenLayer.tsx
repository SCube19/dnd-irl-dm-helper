import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { clamp } from "react-native-reanimated";
import { useGrid } from "../../../hooks/useGrid";
import {
  useLayerInteraction,
  useLayerStore,
  type PointerPayload,
} from "../../orchestrator";
import { MapSpaceLayerView, useMapSpace } from "../../MapSpaceProvider";
import { LAYER_Z } from "../../zOrder";
import { InteractionMode, XY } from "../../../types/common";
import { TokenItem } from "./TokenItem";
import { TokenTooltip } from "./TokenTooltip";
import {
  animateTokenTo,
  type TokenAnim,
  type TokenMotion,
} from "./tokenAnimation";
import {
  createTokenGeometry,
  distSq,
  findTopmost,
  occupiesCell,
  overlapsArea,
} from "./tokenGeometry";
import {
  TokenLayerKey,
  createTokenId,
  type GridCell,
  type Token,
} from "./tokenTypes";

/** Dragging further than this (squared px) hides hover/selection previews. */
const DRAG_DESELECT_DIST_SQ = 5 ** 2;
/** A press that moves less than this (squared px) counts as a click. */
const CLICK_SLOP_DIST_SQ = 6 ** 2;
const DROP_PREVIEW_BORDER = "rgba(56, 189, 248, 0.75)";
const DROP_PREVIEW_FILL = "rgba(56, 189, 248, 0.2)";

interface ActiveDrag {
  tokenId: string;
  grabOffset: XY;
  center: XY;
  startPoint: XY;
}

export function TokenLayer() {
  const { gridSpacing, gridWidth, gridHeight, imageSize } = useGrid();
  const { scale, translationX, translationY, containerSize } = useMapSpace();
  const [tokenState, setTokenState] = useLayerStore(TokenLayerKey);
  const { tokens } = tokenState;

  const [heldTokenId, setHeldTokenId] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<GridCell | null>(null);
  const [hoveredTokenId, setHoveredTokenId] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  const animsRef = useRef(new Map<string, TokenAnim>());
  const dragRef = useRef<ActiveDrag | null>(null);

  const geometry = useMemo(
    () =>
      createTokenGeometry({
        gridSpacing,
        gridWidth,
        gridHeight,
        boundX: imageSize.width > 0,
        boundY: imageSize.height > 0,
      }),
    [gridSpacing, gridWidth, gridHeight, imageSize.width, imageSize.height],
  );

  useEffect(() => {
    dragRef.current = null;
    setHeldTokenId(null);
    setHoverCell(null);
  }, [gridSpacing]);

  const registerAnim = useCallback((id: string, anim: TokenAnim) => {
    const anims = animsRef.current;
    anims.set(id, anim);
    return () => {
      if (anims.get(id) === anim) anims.delete(id);
    };
  }, []);

  const animateToken = (id: string, pos: XY, motion: TokenMotion) => {
    const anim = animsRef.current.get(id);
    if (anim) animateTokenTo(anim, pos, motion);
  };

  /** Token center; prefers its live animated position if the press is nearer to it. */
  const getTokenCenter = (token: Token, point: XY): XY => {
    const cell = geometry.cellCenter(token);
    const anim = animsRef.current.get(token.id);
    if (!anim) return cell;
    const r = geometry.radiusFor(token.size);
    const live = { x: anim.x.value + r, y: anim.y.value + r };
    return distSq(point, live) < distSq(point, cell) ? live : cell;
  };

  const findTokenAtPoint = (point: XY): Token | undefined => {
    const cell = geometry.pixelToCell(point);
    const exact = findTopmost(tokens, (t) => occupiesCell(t, cell));
    if (exact) return exact;

    let closest: Token | undefined;
    let bestNormDist = 1;
    for (const token of tokens) {
      const maxDistSq = geometry.hitRadiusFor(token.size) ** 2;
      const dSq = distSq(point, getTokenCenter(token, point));
      if (dSq > maxDistSq) continue;
      const normDist = dSq / maxDistSq;
      if (normDist <= bestNormDist) {
        bestNormDist = normDist;
        closest = token;
      }
    }
    return closest;
  };

  /** Toggles the image preview for tokens that have one; clears otherwise. */
  const toggleSelection = (token: Token | undefined) => {
    if (!token?.imageUri) {
      setSelectedTokenId(null);
      return;
    }
    const { id } = token;
    setSelectedTokenId((cur) => (cur === id ? null : id));
  };

  const cancelActiveDrag = (tokenList: readonly Token[]) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const token = tokenList.find((t) => t.id === drag.tokenId);
    if (token) animateToken(drag.tokenId, geometry.homePosition(token), "drop");
    setHeldTokenId(null);
    setHoverCell(null);
  };

  const startDrag = ({ point, mode }: PointerPayload) => {
    if (mode !== InteractionMode.TOKEN_MOVE) return;

    const target = findTokenAtPoint(point);
    if (!target) {
      cancelActiveDrag(tokens);
      setSelectedTokenId(null);
      return;
    }
    if (dragRef.current && dragRef.current.tokenId !== target.id) {
      cancelActiveDrag(tokens);
    }

    const startCenter = getTokenCenter(target, point);
    const maxOffset = geometry.hitRadiusFor(target.size);
    dragRef.current = {
      tokenId: target.id,
      grabOffset: {
        x: clamp(point.x - startCenter.x, -maxOffset, maxOffset),
        y: clamp(point.y - startCenter.y, -maxOffset, maxOffset),
      },
      center: startCenter,
      startPoint: point,
    };
    animateToken(
      target.id,
      geometry.topLeftForCenter(startCenter, target.size),
      "lift",
    );
    setHeldTokenId(target.id);
    setHoverCell(geometry.centerToCell(startCenter, target.size));
  };

  const moveDrag = ({ point }: PointerPayload) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (distSq(point, drag.startPoint) > DRAG_DESELECT_DIST_SQ) {
      setSelectedTokenId(null);
      setHoveredTokenId(null);
    }

    const size = tokens.find((t) => t.id === drag.tokenId)?.size ?? 1;
    const center = geometry.clampCenter(
      { x: point.x - drag.grabOffset.x, y: point.y - drag.grabOffset.y },
      size,
    );
    drag.center = center;
    animateToken(drag.tokenId, geometry.topLeftForCenter(center, size), "move");

    const next = geometry.centerToCell(center, size);
    setHoverCell((prev) =>
      prev && prev.gridX === next.gridX && prev.gridY === next.gridY
        ? prev
        : next,
    );
  };

  const endDrag = ({ point }: { point?: XY }) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    const src = tokens.find((t) => t.id === drag.tokenId);
    const size = src?.size ?? 1;
    const center = point
      ? geometry.clampCenter(
          { x: point.x - drag.grabOffset.x, y: point.y - drag.grabOffset.y },
          size,
        )
      : drag.center;
    const dest = geometry.centerToCell(center, size);
    animateToken(drag.tokenId, geometry.homePosition(dest), "drop");
    setHeldTokenId(null);
    setHoverCell(null);

    if (!src) return;

    const movedDistSq = point ? distSq(point, drag.startPoint) : Infinity;
    const isClick =
      src.gridX === dest.gridX &&
      src.gridY === dest.gridY &&
      movedDistSq <= CLICK_SLOP_DIST_SQ;
    if (isClick) {
      toggleSelection(src);
      return;
    }

    setSelectedTokenId(null);
    setTokenState((prev) => {
      const moving = prev.tokens.find((t) => t.id === drag.tokenId);
      if (!moving) return prev;
      return {
        ...prev,
        tokens: prev.tokens
          .filter(
            (t) => t.id !== moving.id && !overlapsArea(dest, moving.size, t),
          )
          .concat({ ...moving, ...dest }),
      };
    });
  };

  /** Places a token, or restyles/resizes the one under the tap. */
  const placeOrUpdateToken = (point: XY) => {
    const { activeColor, activeSize, activeImageUri } = tokenState;
    const tapCell = geometry.clampCellForSize(geometry.pixelToCell(point), 1);
    const existing = findTopmost(tokens, (t) => occupiesCell(t, tapCell));

    if (existing) {
      const unchanged =
        existing.color === activeColor &&
        existing.imageUri === activeImageUri &&
        existing.size === activeSize;
      if (unchanged) {
        toggleSelection(existing);
        return;
      }
      if (!activeImageUri && selectedTokenId === existing.id) {
        setSelectedTokenId(null);
      }
      setTokenState((prev) => {
        const cell = geometry.clampCellForSize(existing, prev.activeSize);
        return {
          ...prev,
          tokens: prev.tokens
            .filter(
              (t) =>
                t.id === existing.id ||
                !overlapsArea(cell, prev.activeSize, t),
            )
            .map((t) =>
              t.id === existing.id
                ? {
                    ...t,
                    ...cell,
                    color: prev.activeColor,
                    size: prev.activeSize,
                    imageUri: prev.activeImageUri,
                  }
                : t,
            ),
        };
      });
      return;
    }

    setSelectedTokenId(null);
    const cell = geometry.centerToCell(point, activeSize);
    const id = createTokenId();
    setTokenState((prev) => ({
      ...prev,
      tokens: [
        ...prev.tokens.filter((t) => !overlapsArea(cell, prev.activeSize, t)),
        {
          id,
          ...cell,
          color: prev.activeColor,
          size: prev.activeSize,
          ...(prev.activeImageUri ? { imageUri: prev.activeImageUri } : {}),
        },
      ],
    }));
  };

  const removeTokenAt = (point: XY) => {
    const target = findTokenAtPoint(point);
    if (!target) return;
    if (selectedTokenId === target.id) setSelectedTokenId(null);
    if (hoveredTokenId === target.id) setHoveredTokenId(null);
    setTokenState((prev) => ({
      ...prev,
      tokens: prev.tokens.filter((t) => t.id !== target.id),
    }));
  };

  useLayerInteraction({
    hover: ({ point }) => {
      if (dragRef.current) return;
      const hit = findTokenAtPoint(point);
      const nextId = hit?.imageUri ? hit.id : null;
      setHoveredTokenId(nextId);
      if (nextId && selectedTokenId && nextId !== selectedTokenId) {
        setSelectedTokenId(null);
      }
    },
    hoverLeave: () => setHoveredTokenId(null),
    dragStart: startDrag,
    dragMove: moveDrag,
    dragEnd: endDrag,
    tap: ({ point, mode }) => {
      if (mode === InteractionMode.PAN) toggleSelection(findTokenAtPoint(point));
      else if (mode === InteractionMode.TOKEN_ADD) placeOrUpdateToken(point);
      else if (mode === InteractionMode.TOKEN_REMOVE) removeTokenAt(point);
    },
  });

  const heldToken = heldTokenId
    ? tokens.find((t) => t.id === heldTokenId)
    : undefined;
  const heldDiameter = geometry.diameterFor(heldToken?.size ?? 1);
  const dropPreview = heldTokenId && hoverCell
    ? geometry.homePosition(hoverCell)
    : null;

  const activeTooltipId = heldTokenId
    ? null
    : (hoveredTokenId ?? selectedTokenId);
  const tooltipToken = activeTooltipId
    ? tokens.find((t) => t.id === activeTooltipId && Boolean(t.imageUri))
    : undefined;
  const tooltipCenter = tooltipToken ? geometry.cellCenter(tooltipToken) : null;

  return (
    <>
      <MapSpaceLayerView pointerEvents="box-none" zIndex={LAYER_Z.TOKENS}>
        {dropPreview && (
          <View
            style={{
              position: "absolute",
              left: dropPreview.x,
              top: dropPreview.y,
              width: heldDiameter,
              height: heldDiameter,
              borderRadius: heldDiameter / 2,
              borderWidth: geometry.borderWidth,
              borderColor: DROP_PREVIEW_BORDER,
              backgroundColor: DROP_PREVIEW_FILL,
              zIndex: 0,
            }}
            pointerEvents="none"
          />
        )}
        {tokens.map((token) => {
          const home = geometry.homePosition(token);
          return (
            <TokenItem
              key={token.id}
              token={token}
              homeX={home.x}
              homeY={home.y}
              diameter={geometry.diameterFor(token.size)}
              borderWidth={geometry.borderWidth}
              gridSpacing={gridSpacing}
              isHeld={token.id === heldTokenId}
              isHighlighted={token.id === activeTooltipId}
              registerAnim={registerAnim}
            />
          );
        })}
      </MapSpaceLayerView>
      {tooltipToken && tooltipCenter && (
        <MapSpaceLayerView pointerEvents="none" zIndex={LAYER_Z.TOKEN_OVERLAY}>
          <TokenTooltip
            token={tooltipToken}
            centerX={tooltipCenter.x}
            centerY={tooltipCenter.y}
            radius={geometry.radiusFor(tooltipToken.size)}
            imageWidth={imageSize.width}
            scale={scale}
            translationX={translationX}
            translationY={translationY}
            containerSize={containerSize}
          />
        </MapSpaceLayerView>
      )}
    </>
  );
}
