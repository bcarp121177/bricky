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

export const COMMON_PARTS: PartRecord[] = [
  // Bricks — URLs sourced from Rebrickable API v3 part_img_url (verified 2026-04)
  { partNum: "3001",  name: "Brick 2x4",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/300121.jpg",   category: "Bricks" },
  { partNum: "3003",  name: "Brick 2x2",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/300301.jpg",   category: "Bricks" },
  { partNum: "3004",  name: "Brick 1x2",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/300401.jpg",   category: "Bricks" },
  { partNum: "3010",  name: "Brick 1x4",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/301001.jpg",   category: "Bricks" },
  { partNum: "3005",  name: "Brick 1x1",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/300501.jpg",   category: "Bricks" },
  { partNum: "3002",  name: "Brick 2x3",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/300201.jpg",   category: "Bricks" },
  { partNum: "2456",  name: "Brick 2x6",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/245601.jpg",   category: "Bricks" },
  { partNum: "3007",  name: "Brick 2x8",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/300726.jpg",   category: "Bricks" },

  // Plates
  { partNum: "3020",  name: "Plate 2x4",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/302026.jpg",   category: "Plates" },
  { partNum: "3022",  name: "Plate 2x2",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/302226.jpg",   category: "Plates" },
  { partNum: "3023",  name: "Plate 1x2",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/302326.jpg",   category: "Plates" },
  { partNum: "3710",  name: "Plate 1x4",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/371026.jpg",   category: "Plates" },
  { partNum: "3024",  name: "Plate 1x1",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/302401.jpg",   category: "Plates" },
  { partNum: "3021",  name: "Plate 2x3",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/302126.jpg",   category: "Plates" },
  { partNum: "3795",  name: "Plate 2x6",             imgUrl: "https://cdn.rebrickable.com/media/parts/elements/379526.jpg",   category: "Plates" },

  // Tiles
  { partNum: "3069b", name: "Tile 1x2",              imgUrl: "https://cdn.rebrickable.com/media/parts/elements/306901.jpg",   category: "Tiles"  },
  { partNum: "3068b", name: "Tile 2x2",              imgUrl: "https://cdn.rebrickable.com/media/parts/elements/306826.jpg",   category: "Tiles"  },
  { partNum: "2431",  name: "Tile 1x4",              imgUrl: "https://cdn.rebrickable.com/media/parts/elements/243126.jpg",   category: "Tiles"  },
  { partNum: "6636",  name: "Tile 1x6",              imgUrl: "https://cdn.rebrickable.com/media/parts/elements/4211549.jpg",  category: "Tiles"  },
  { partNum: "3070b", name: "Tile 1x1",              imgUrl: "https://cdn.rebrickable.com/media/parts/elements/307001.jpg",   category: "Tiles"  },

  // Slopes
  { partNum: "3037",  name: "Slope 2x4 45°",         imgUrl: "https://cdn.rebrickable.com/media/parts/elements/303721.jpg",   category: "Slopes" },
  { partNum: "3038",  name: "Slope 2x3 45°",         imgUrl: "https://cdn.rebrickable.com/media/parts/elements/303826.jpg",   category: "Slopes" },
  { partNum: "3039",  name: "Slope 2x2 45°",         imgUrl: "https://cdn.rebrickable.com/media/parts/elements/303921.jpg",   category: "Slopes" },
  { partNum: "3040b", name: "Slope 1x2 45°",         imgUrl: "https://cdn.rebrickable.com/media/parts/elements/4211135.jpg",  category: "Slopes" },

  // Round — note: 4073 is not in Rebrickable; use 6141 (Plate Round 1x1 Solid Stud)
  { partNum: "3062b", name: "Brick 1x1 Round",       imgUrl: "https://cdn.rebrickable.com/media/parts/elements/306201.jpg",   category: "Round"  },
  { partNum: "6141",  name: "Plate 1x1 Round",       imgUrl: "https://cdn.rebrickable.com/media/parts/elements/614126.jpg",   category: "Round"  },
  { partNum: "3941",  name: "Brick 2x2 Round",       imgUrl: "https://cdn.rebrickable.com/media/parts/elements/614351.jpg",   category: "Round"  },
  { partNum: "85940", name: "Cylinder 1x1",          imgUrl: "https://cdn.rebrickable.com/media/parts/elements/4562148.jpg",  category: "Round"  },
];
