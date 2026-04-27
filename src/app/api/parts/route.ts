import type { NextRequest } from "next/server";
import { fetchParts } from "@/lib/rebrickable";
import { COMMON_PARTS } from "@/lib/common-parts";
import { LEGO_COLORS } from "@/lib/lego-colors";
import type { PieceCategory, PartRecord } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const colorName  = searchParams.get("color") ?? "Bright Red";
  const category   = searchParams.get("category") as PieceCategory | null;
  const page       = parseInt(searchParams.get("page") ?? "1", 10);

  // USE_STUB: return common parts filtered by category
  if (process.env.USE_STUB === "true") {
    let parts: PartRecord[] = COMMON_PARTS;
    if (category) {
      parts = parts.filter((p) => p.category === category);
    }
    return Response.json({ parts, hasMore: false });
  }

  // Look up the Rebrickable color ID from the color name
  const legoColor = LEGO_COLORS.find((c) => c.name === colorName);
  if (!legoColor) {
    return Response.json(
      { error: `Unknown color: ${colorName}` },
      { status: 400 }
    );
  }

  const result = await fetchParts({
    colorId:  legoColor.rebrickableId,
    category: category ?? undefined,
    page,
  });

  // If Rebrickable returned nothing (no API key or error), fall back to common parts
  if (result.parts.length === 0) {
    let parts: PartRecord[] = COMMON_PARTS;
    if (category) {
      parts = parts.filter((p) => p.category === category);
    }
    return Response.json({ parts, hasMore: false });
  }

  return Response.json(result);
}
