import type { PieceCategory, PartRecord } from "./types";

/** Rebrickable category ID → PieceCategory */
export function categoryFromId(catId: number): PieceCategory {
  const map: Record<number, PieceCategory> = {
    5:  "Bricks",
    11: "Plates",
    14: "Tiles",
    31: "Slopes",
    6:  "Round",
  };
  return map[catId] ?? "Other";
}

function imgUrl(partNum: string): string {
  return `https://cdn.rebrickable.com/media/parts/photos/${partNum}.jpg`;
}

export const COMMON_PARTS: PartRecord[] = [
  // Bricks
  { partNum: "3001",  name: "Brick 2x4",             imgUrl: imgUrl("3001"),  category: "Bricks" },
  { partNum: "3003",  name: "Brick 2x2",             imgUrl: imgUrl("3003"),  category: "Bricks" },
  { partNum: "3004",  name: "Brick 1x2",             imgUrl: imgUrl("3004"),  category: "Bricks" },
  { partNum: "3010",  name: "Brick 1x4",             imgUrl: imgUrl("3010"),  category: "Bricks" },
  { partNum: "3005",  name: "Brick 1x1",             imgUrl: imgUrl("3005"),  category: "Bricks" },
  { partNum: "3002",  name: "Brick 2x3",             imgUrl: imgUrl("3002"),  category: "Bricks" },
  { partNum: "2456",  name: "Brick 2x6",             imgUrl: imgUrl("2456"),  category: "Bricks" },
  { partNum: "3007",  name: "Brick 2x8",             imgUrl: imgUrl("3007"),  category: "Bricks" },

  // Plates
  { partNum: "3020",  name: "Plate 2x4",             imgUrl: imgUrl("3020"),  category: "Plates" },
  { partNum: "3022",  name: "Plate 2x2",             imgUrl: imgUrl("3022"),  category: "Plates" },
  { partNum: "3023",  name: "Plate 1x2",             imgUrl: imgUrl("3023"),  category: "Plates" },
  { partNum: "3710",  name: "Plate 1x4",             imgUrl: imgUrl("3710"),  category: "Plates" },
  { partNum: "3024",  name: "Plate 1x1",             imgUrl: imgUrl("3024"),  category: "Plates" },
  { partNum: "3021",  name: "Plate 2x3",             imgUrl: imgUrl("3021"),  category: "Plates" },
  { partNum: "3795",  name: "Plate 2x6",             imgUrl: imgUrl("3795"),  category: "Plates" },

  // Tiles
  { partNum: "3069b", name: "Tile 1x2",              imgUrl: imgUrl("3069b"), category: "Tiles"  },
  { partNum: "3068b", name: "Tile 2x2",              imgUrl: imgUrl("3068b"), category: "Tiles"  },
  { partNum: "2431",  name: "Tile 1x4",              imgUrl: imgUrl("2431"),  category: "Tiles"  },
  { partNum: "6636",  name: "Tile 1x6",              imgUrl: imgUrl("6636"),  category: "Tiles"  },
  { partNum: "3070b", name: "Tile 1x1",              imgUrl: imgUrl("3070b"), category: "Tiles"  },

  // Slopes
  { partNum: "3037",  name: "Slope 2x4 45°",         imgUrl: imgUrl("3037"),  category: "Slopes" },
  { partNum: "3038",  name: "Slope 2x3 45°",         imgUrl: imgUrl("3038"),  category: "Slopes" },
  { partNum: "3039",  name: "Slope 2x2 45°",         imgUrl: imgUrl("3039"),  category: "Slopes" },
  { partNum: "3040b", name: "Slope 1x2 45°",         imgUrl: imgUrl("3040b"), category: "Slopes" },

  // Round
  { partNum: "3062b", name: "Brick 1x1 Round",       imgUrl: imgUrl("3062b"), category: "Round"  },
  { partNum: "4073",  name: "Plate 1x1 Round",       imgUrl: imgUrl("4073"),  category: "Round"  },
  { partNum: "3941",  name: "Brick 2x2 Round",       imgUrl: imgUrl("3941"),  category: "Round"  },
  { partNum: "85940", name: "Cylinder 1x1",          imgUrl: imgUrl("85940"), category: "Round"  },
];
