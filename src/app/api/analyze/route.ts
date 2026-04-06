import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { generateLDraw } from "@/lib/ldraw-generator";
import { writeFileSync } from "fs";
import { join } from "path";
import stubData from "@/lib/stub-response.json";

const anthropic = new Anthropic();

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

interface RebrickablePart {
  part_num: string;
  name: string;
  part_cat_id: number;
  part_img_url: string | null;
  external_ids: Record<string, string[]>;
  print_of: string | null;
}

async function identifyPieces(imageBuffer: Buffer): Promise<BrickognizeItem[]> {
  const formData = new FormData();
  formData.append("query_image", new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" }), "image.jpg");

  const response = await fetch("https://api.brickognize.com/predict/parts/", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Brickognize API error: ${response.status}`);
  }

  const data: BrickognizeResponse = await response.json();
  return data.items || [];
}

async function enrichPart(partNum: string): Promise<RebrickablePart | null> {
  const apiKey = process.env.REBRICKABLE_API_KEY;
  if (!apiKey || apiKey === "your-rebrickable-key-here") return null;

  try {
    const response = await fetch(
      `https://rebrickable.com/api/v3/lego/parts/${partNum}/`,
      { headers: { Authorization: `key ${apiKey}` } }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Dev stub: set USE_STUB=true in .env.local to skip API calls
    if (process.env.USE_STUB === "true") {
      await new Promise((r) => setTimeout(r, 800)); // simulate latency
      const ldraw = generateLDraw(stubData.pieces, stubData.build.steps);
      return NextResponse.json({ ...stubData, ldraw, identifiedPieces: [] });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const base64Image = imageBuffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Step 1: Identify pieces with Brickognize
    let identifiedPieces: {
      partNum: string;
      name: string;
      confidence: number;
      imgUrl: string;
    }[] = [];

    try {
      const brickognizeResults = await identifyPieces(imageBuffer);
      for (const item of brickognizeResults) {
        if (item.items && item.items.length > 0) {
          const best = item.items[0];
          identifiedPieces.push({
            partNum: best.id,
            name: best.name,
            confidence: best.score,
            imgUrl: best.img_url,
          });
        }
      }
    } catch (e) {
      console.warn("Brickognize failed, falling back to Claude-only:", e);
    }

    // Step 2: Enrich with Rebrickable details
    const enrichedPieces = await Promise.all(
      identifiedPieces.map(async (piece) => {
        const details = await enrichPart(piece.partNum);
        return {
          ...piece,
          fullName: details?.name || piece.name,
          categoryId: details?.part_cat_id,
          officialImgUrl: details?.part_img_url || piece.imgUrl,
        };
      })
    );

    // Step 3: Generate building instructions with Claude
    const pieceListText =
      enrichedPieces.length > 0
        ? `Brickognize identified these LEGO pieces in the photo:\n${enrichedPieces.map((p, i) => `${i + 1}. ${p.fullName} (Part #${p.partNum}, confidence: ${(p.confidence * 100).toFixed(0)}%)`).join("\n")}\n\nUse this identification as a starting point, but also look at the image yourself to verify, correct, or add any pieces that were missed.`
        : "Brickognize could not identify the pieces. Please analyze the image directly.";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: `You are Bricky, a creative LEGO building assistant. A user has photographed their loose LEGO pieces and wants to know what they can build.

${pieceListText}

Please respond in this exact JSON format:
{
  "pieces": [
    {
      "name": "2x4 Brick",
      "color": "Red",
      "quantity": 3,
      "partNum": "3001"
    }
  ],
  "build": {
    "title": "Name of what to build",
    "description": "A fun 1-2 sentence description of the build",
    "difficulty": "Easy|Medium|Hard",
    "estimatedTime": "5-10 minutes",
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "Clear, detailed instruction for this step",
        "piecesUsed": ["1x Red 2x4 Brick", "2x Blue 2x2 Plate"]
      }
    ]
  },
  "tips": ["Any helpful building tips"],
  "alternateIdeas": ["2-3 other things they could build with these pieces"]
}

Important guidelines:
- Be accurate about what you see in the photo. Count carefully.
- Design something creative but ACTUALLY BUILDABLE with only the visible pieces.
- Keep steps small and specific — one or two pieces per step when possible.
- Reference pieces by color and size so they're easy to find.
- If you're unsure about a piece, mention it in tips.
- Make it fun! Suggest something a kid or adult would enjoy building.
- Return ONLY valid JSON, no markdown code fences.`,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let buildInstructions;
    try {
      // Strip markdown code fences if present
      const cleanJson = responseText
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      buildInstructions = JSON.parse(cleanJson);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse building instructions", raw: responseText },
        { status: 500 }
      );
    }

    const ldraw = generateLDraw(buildInstructions.pieces, buildInstructions.build.steps);

    if (process.env.CAPTURE_RESPONSE === "true") {
      const capture = {
        pieces: buildInstructions.pieces,
        build: buildInstructions.build,
        tips: buildInstructions.tips,
        alternateIdeas: buildInstructions.alternateIdeas,
      };
      const stubPath = join(process.cwd(), "src/lib/stub-response.json");
      writeFileSync(stubPath, JSON.stringify(capture, null, 2));
      console.log("✅ stub-response.json updated from live response");
    }

    return NextResponse.json({
      pieces: buildInstructions.pieces,
      build: buildInstructions.build,
      tips: buildInstructions.tips,
      alternateIdeas: buildInstructions.alternateIdeas,
      ldraw,
      identifiedPieces: enrichedPieces,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
