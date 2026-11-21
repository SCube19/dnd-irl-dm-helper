import { defineLayerKey } from "../../orchestrator";

export type TokenSize = 1 | 2 | 3 | 4;
export const TOKEN_SIZES: readonly TokenSize[] = [1, 2, 3, 4];

export interface GridCell {
  gridX: number;
  gridY: number;
}

/** A token anchored at its top-left cell, covering `size × size` cells. */
export interface Token extends GridCell {
  id: string;
  color: string;
  size: TokenSize;
  imageUri?: string;
}

export interface TokenLayerState {
  tokens: Token[];
  activeColor: string;
  activeSize: TokenSize;
  activeImageUri?: string;
}

export const DEFAULT_TOKEN_STATE: TokenLayerState = {
  tokens: [],
  activeColor: "rgb(239, 68, 68)",
  activeSize: 1,
  activeImageUri: undefined,
};

export const TokenLayerKey = defineLayerKey("tokens", DEFAULT_TOKEN_STATE);

/** Saved shape; maps saved before token sizes existed have no `size`. */
export type PersistedToken = Omit<Token, "size"> & { size?: unknown };

export interface PersistedTokenLayerState
  extends Partial<Omit<TokenLayerState, "tokens" | "activeSize">> {
  tokens?: PersistedToken[];
  activeSize?: unknown;
}

export const isTokenSize = (value: unknown): value is TokenSize =>
  TOKEN_SIZES.includes(value as TokenSize);

export const normalizeToken = (token: PersistedToken): Token => ({
  ...token,
  size: isTokenSize(token.size) ? token.size : 1,
});

export const createTokenId = () =>
  `token-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
