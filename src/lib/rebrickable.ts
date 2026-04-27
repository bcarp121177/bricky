import type { PartRecord, PieceCategory } from "./types";
import { categoryFromId } from "./common-parts";

const REBRICKABLE_BASE = "https://rebrickable.com/api/v3/lego";

function getApiKey(): string | null {
  const key = process.env.REBRICKABLE_API_KEY;
  if (!key || key === "your-rebrickable-key-here") return null;
  return key;
}

interface RebrickablePart {
  part_num: string;
  name: string;
  part_cat_id: number;
  part_img_url: string | null;
}

interface RebrickablePartsResponse {
  count: number;
  next: string | null;
  results: RebrickablePart[];
}

/** Convert a Rebrickable part to our PartRecord shape */
function toPartRecord(part: RebrickablePart): PartRecord {
  const category: PieceCategory = categoryFromId(part.part_cat_id);
  return {
    partNum:  part.part_num,
    name:     part.name,
    imgUrl:   part.part_img_url ?? "",
    category,
  };
}

/**
 * Fetch parts from Rebrickable filtered by color (rebrickableId) and optional category.
 * Returns a page of results.
 */
export async function fetchParts(opts: {
  colorId: number;
  category?: PieceCategory;
  page?: number;
}): Promise<{ parts: PartRecord[]; hasMore: boolean }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    // No key — caller should fall back to common parts
    return { parts: [], hasMore: false };
  }

  const pageSize = 20;
  const page = opts.page ?? 1;

  const params = new URLSearchParams({
    color_id: String(opts.colorId),
    page:     String(page),
    page_size: String(pageSize),
    ordering:  "name",
  });

  // Rebrickable category IDs for filtering
  if (opts.category) {
    const catIdMap: Record<PieceCategory, number | null> = {
      Bricks: 5,
      Plates: 11,
      Tiles:  14,
      Slopes: 31,
      Round:  6,
      Other:  null,
    };
    const catId = catIdMap[opts.category];
    if (catId !== null) {
      params.set("part_cat_id", String(catId));
    }
  }

  try {
    const res = await fetch(
      `${REBRICKABLE_BASE}/parts/?${params.toString()}`,
      {
        headers: { Authorization: `key ${apiKey}` },
        next: { revalidate: 3600 }, // cache for 1 hour
      }
    );
    if (!res.ok) return { parts: [], hasMore: false };

    const data: RebrickablePartsResponse = await res.json();
    return {
      parts:   data.results.map(toPartRecord),
      hasMore: data.next !== null,
    };
  } catch {
    return { parts: [], hasMore: false };
  }
}

/** Look up a single part by part number */
export async function fetchPart(partNum: string): Promise<PartRecord | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `${REBRICKABLE_BASE}/parts/${partNum}/`,
      { headers: { Authorization: `key ${apiKey}` } }
    );
    if (!res.ok) return null;
    const part: RebrickablePart = await res.json();
    return toPartRecord(part);
  } catch {
    return null;
  }
}
