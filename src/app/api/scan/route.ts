import type { NextRequest } from "next/server";
import type { ScanResult } from "@/lib/types";

interface BrickognizePrediction {
  id: string;
  name: string;
  img_url: string;
  score: number;
}

interface BrickognizeItem {
  bounding_box: { left: number; upper: number; right: number; lower: number };
  items: BrickognizePrediction[];
}

interface BrickognizeResponse {
  items: BrickognizeItem[];
}

async function identifyPiece(imageBuffer: Buffer): Promise<BrickognizeItem[]> {
  const formData = new FormData();
  formData.append(
    "query_image",
    new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" }),
    "image.jpg"
  );

  const response = await fetch("https://api.brickognize.com/predict/parts/", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Brickognize API error: ${response.status}`);
  }

  const data: BrickognizeResponse = await response.json();
  return data.items ?? [];
}

export async function POST(request: NextRequest) {
  // USE_STUB: return a canned scan result
  if (process.env.USE_STUB === "true") {
    await new Promise((r) => setTimeout(r, 600)); // simulate latency
    const stubResult: ScanResult = {
      partNum:    "3001",
      name:       "Brick 2x4",
      imgUrl:     "https://cdn.rebrickable.com/media/parts/elements/300121.jpg",
      confidence: 0.97,
    };
    return Response.json({ result: stubResult });
  }

  try {
    const formData = await request.formData();
    const entry = formData.get("image");
    const file = entry instanceof File ? entry : null;

    if (!file) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const items = await identifyPiece(imageBuffer);

    // Pick the top prediction across all bounding boxes
    let best: BrickognizePrediction | null = null;
    for (const item of items) {
      if (item.items && item.items.length > 0) {
        const top = item.items[0];
        if (!best || top.score > best.score) {
          best = top;
        }
      }
    }

    if (!best) {
      return Response.json({ result: null });
    }

    const result: ScanResult = {
      partNum:    best.id,
      name:       best.name,
      imgUrl:     best.img_url,
      confidence: best.score,
    };

    return Response.json({ result });
  } catch (error) {
    console.error("Scan error:", error);
    return Response.json({ error: "Failed to scan image" }, { status: 500 });
  }
}
