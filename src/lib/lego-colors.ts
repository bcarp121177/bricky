export interface LegoColor {
  name: string;
  hex: string;
  rebrickableId: number;
  isTransparent: boolean;
}

export const LEGO_COLORS: LegoColor[] = [
  { name: "Bright Red",        hex: "#C91A09", rebrickableId: 4,   isTransparent: false },
  { name: "Bright Blue",       hex: "#006CB7", rebrickableId: 1,   isTransparent: false },
  { name: "Bright Yellow",     hex: "#F7D117", rebrickableId: 3,   isTransparent: false },
  { name: "Bright Green",      hex: "#4B9F4A", rebrickableId: 2,   isTransparent: false },
  { name: "Black",             hex: "#1B2A34", rebrickableId: 0,   isTransparent: false },
  { name: "White",             hex: "#F4F4F4", rebrickableId: 15,  isTransparent: false },
  { name: "Bright Orange",     hex: "#FE8A18", rebrickableId: 25,  isTransparent: false },
  { name: "Medium Stone Grey", hex: "#A0A5A9", rebrickableId: 71,  isTransparent: false },
  { name: "Dark Stone Grey",   hex: "#6B6A6A", rebrickableId: 72,  isTransparent: false },
  { name: "Sand Yellow",       hex: "#E4CD9E", rebrickableId: 19,  isTransparent: false },
  { name: "Reddish Brown",     hex: "#82422A", rebrickableId: 88,  isTransparent: false },
  { name: "Dark Blue",         hex: "#003673", rebrickableId: 140, isTransparent: false },
  { name: "Medium Blue",       hex: "#71A8D6", rebrickableId: 102, isTransparent: false },
  { name: "Bright Pink",       hex: "#F785B1", rebrickableId: 23,  isTransparent: false },
  { name: "Lime",              hex: "#BBE90B", rebrickableId: 34,  isTransparent: false },
  { name: "Transparent",       hex: "#AAAAAA", rebrickableId: 40,  isTransparent: true  },
];

// CSS for transparent swatch background
export const TRANSPARENT_SWATCH_CSS =
  "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 16px 16px";

/** Find a color by its canonical name */
export function findColorByName(name: string): LegoColor | undefined {
  return LEGO_COLORS.find((c) => c.name === name);
}

/** Find a color by its Rebrickable ID */
export function findColorById(id: number): LegoColor | undefined {
  return LEGO_COLORS.find((c) => c.rebrickableId === id);
}

/** Default color for fallback */
export const DEFAULT_COLOR: LegoColor = LEGO_COLORS[6]; // Bright Orange — visually distinct
