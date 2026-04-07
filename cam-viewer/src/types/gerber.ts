// Gerber RS-274X types

export type Unit = 'IN' | 'MM';

export type Interpolation = 'linear' | 'cw' | 'ccw';

export type Polarity = 'dark' | 'clear';

export interface FormatSpec {
  xInteger: number;
  xDecimal: number;
  yInteger: number;
  yDecimal: number;
}

export type ApertureShape = 'C' | 'R' | 'O' | 'P';

export interface Aperture {
  code: number;
  shape: ApertureShape;
  params: number[]; // diameter, xSize, ySize, etc.
}

export interface Point {
  x: number;
  y: number;
}

export type GerberCommand =
  | { type: 'move'; x: number; y: number }
  | { type: 'line'; x: number; y: number; aperture: number; interpolation: Interpolation }
  | { type: 'arc'; x: number; y: number; i: number; j: number; aperture: number; interpolation: 'cw' | 'ccw' }
  | { type: 'flash'; x: number; y: number; aperture: number }
  | { type: 'regionStart' }
  | { type: 'regionEnd' }
  | { type: 'regionMove'; x: number; y: number }
  | { type: 'regionLine'; x: number; y: number; interpolation: Interpolation }
  | { type: 'regionArc'; x: number; y: number; i: number; j: number; interpolation: 'cw' | 'ccw' }
  | { type: 'polarity'; polarity: Polarity };

export interface GerberLayer {
  name: string;
  fileName: string;
  unit: Unit;
  format: FormatSpec;
  apertures: Map<number, Aperture>;
  commands: GerberCommand[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  polarity: Polarity;
}

export interface LayerConfig {
  name: string;
  fileName: string;
  color: string;
  visible: boolean;
  opacity: number;
  layer: GerberLayer;
}

export interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

// Layer type identification — realistic PCB colors
export const LAYER_COLORS: Record<string, { color: string; label: string; opacity: number }> = {
  '.gtl': { color: '#c83232', label: '顶层铜箔 (Top Copper)',       opacity: 0.90 },
  '.gbl': { color: '#3232c8', label: '底层铜箔 (Bottom Copper)',    opacity: 0.90 },
  '.gto': { color: '#f5f5a0', label: '顶层丝印 (Top Silk)',        opacity: 0.95 },
  '.gbo': { color: '#a0a0f5', label: '底层丝印 (Bottom Silk)',     opacity: 0.95 },
  '.gts': { color: '#00a000', label: '顶层阻焊 (Top Mask)',        opacity: 0.50 },
  '.gbs': { color: '#00a000', label: '底层阻焊 (Bottom Mask)',     opacity: 0.50 },
  '.gtp': { color: '#c0c0c0', label: '顶层锡膏 (Top Paste)',       opacity: 0.80 },
  '.gbp': { color: '#c0c0c0', label: '底层锡膏 (Bottom Paste)',    opacity: 0.80 },
  '.drill.out': { color: '#f0f0f0', label: '钻孔 (Drill)',         opacity: 0.90 },
  '.rout': { color: '#f0e060', label: '铣边 (Route/Outline)',       opacity: 0.95 },
};
