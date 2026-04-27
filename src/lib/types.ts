export type PieceCategory = "Bricks" | "Plates" | "Tiles" | "Slopes" | "Round" | "Other";
export type Theme = "Space" | "Animals" | "Vehicles" | "Castle" | "Ocean" | "Surprise Me";

export interface InventoryPiece {
  partNum: string;
  name: string;
  color: string;       // canonical LEGO color name, e.g. "Bright Red"
  colorHex: string;    // e.g. "#C91A09"
  quantity: number;
  imgUrl: string;
  category: PieceCategory;
}

export interface BuildRequest {
  pieces: InventoryPiece[];
  theme: Theme;
}

export interface BuildStep {
  stepNumber: number;
  instruction: string;
  piecesUsed: Array<{
    partNum: string;
    name: string;
    color: string;
    colorHex: string;
    quantity: number;
    imgUrl: string;
  }>;
}

export interface BuildSuggestion {
  title: string;
  description: string;
  difficulty: 1 | 2 | 3;
  estimatedTime: string;
  steps: BuildStep[];
  tips: string[];
}

export interface BuildResponse {
  suggestions: BuildSuggestion[];
}

export interface PartRecord {
  partNum: string;
  name: string;
  imgUrl: string;
  category: PieceCategory;
}

export interface ScanResult {
  partNum: string;
  name: string;
  imgUrl: string;
  confidence: number;
}

export interface BingoCell {
  id: string;
  label: string;
  category: PieceCategory | null;
}
