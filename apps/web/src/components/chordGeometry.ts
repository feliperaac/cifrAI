import type { ChordShape } from '@cifrai/shared';

export const VIEW_WIDTH = 116;
export const GRID_LEFT = 30;
export const GRID_RIGHT = 106;
export const STRING_COUNT = 6;
export const STRING_GAP = (GRID_RIGHT - GRID_LEFT) / (STRING_COUNT - 1);
export const FRET_HEIGHT = 22;
export const NAME_Y = 18;
/** Altura que o nome no topo ocupa; some do viewBox quando a legenda o substitui. */
export const NAME_BAND = 24;
export const MARKER_Y = 42;
export const GRID_TOP = 52;
export const DOT_RADIUS = 8.5;
export const MIN_ROWS = 4;
export const MAX_ROWS = 5;

/** x da corda (6 = mais grave). Destro: 6ª à esquerda; canhoto: espelhado. */
export function stringX(stringNumber: number, leftHanded: boolean): number {
  const index = STRING_COUNT - stringNumber;
  return leftHanded ? GRID_RIGHT - index * STRING_GAP : GRID_LEFT + index * STRING_GAP;
}

export function rowCount(chord: ChordShape): number {
  const highest = Math.max(0, ...chord.frets);
  return Math.min(MAX_ROWS, Math.max(MIN_ROWS, highest - chord.baseFret + 1));
}

/** y do centro da casa `fret` (absoluta). */
export function fretCenterY(fret: number, baseFret: number): number {
  return GRID_TOP + (fret - baseFret + 0.5) * FRET_HEIGHT;
}

export function viewHeight(rows: number): number {
  return GRID_TOP + rows * FRET_HEIGHT + 8;
}
