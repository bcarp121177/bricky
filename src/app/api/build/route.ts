import type { NextRequest } from "next/server";
import { writeFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import stubData from "@/lib/stub-response.json";
import type { BuildRequest, BuildResponse } from "@/lib/types";

const anthropic = new Anthropic();

function buildSystemPrompt(): string {
  return `You are Bricky, a creative LEGO building assistant for kids.
Your job is to suggest 3 fun things to build from a user's LEGO inventory.

Rules:
- Use simple words. Short sentences. Grade 3 reading level.
- Each step uses at most 3 pieces.
- Every step must be physically possible — piece rests on a flat surface or on studs.
- Never use a piece that is not in the inventory.
- Never use more of a piece than the quantity available.
- Return ONLY valid JSON. No markdown fences. No extra text.

JSON schema:
{
  "suggestions": [
    {
      "title": "string",
      "description": "string (1-2 fun sentences)",
      "difficulty": 1 | 2 | 3,
      "estimatedTime": "string (e.g. '5–8 minutes')",
      "steps": [
        {
          "stepNumber": number,
          "instruction": "string",
          "piecesUsed": [
            {
              "partNum": "string",
              "name": "string",
              "color": "string",
              "colorHex": "string",
              "quantity": number,
              "imgUrl": "string"
            }
          ]
        }
      ],
      "tips": ["string"]
    }
  ]
}`;
}

function buildUserMessage(req: BuildRequest): string {
  const pieceLines = req.pieces
    .map(
      (p) =>
        `- ${p.quantity}x ${p.name} (${p.color}, #${p.partNum}, hex: ${p.colorHex}, img: ${p.imgUrl})`
    )
    .join("\n");

  return `Theme: ${req.theme}

Inventory:
${pieceLines}

Give me 3 build suggestions using ONLY these pieces.`;
}

export async function POST(request: NextRequest) {
  // USE_STUB: skip API call entirely
  if (process.env.USE_STUB === "true") {
    await new Promise((r) => setTimeout(r, 900)); // simulate latency
    return Response.json(stubData as BuildResponse);
  }

  try {
    const body: BuildRequest = await request.json();

    if (!body.pieces || body.pieces.length === 0) {
      return Response.json(
        { error: "No pieces provided" },
        { status: 400 }
      );
    }

    // Step 1: Haiku validates the inventory is sane (fast, cheap check)
    const validationMsg = await anthropic.messages.create({
      model: "claude-haiku-4-20250514",
      max_tokens: 64,
      messages: [
        {
          role: "user",
          content: `Are these LEGO piece descriptions plausible (real part numbers, real colors)?
Reply with just "yes" or "no".

${body.pieces.map((p) => `${p.partNum} ${p.name} ${p.color}`).join("\n")}`,
        },
      ],
    });

    const validationText =
      validationMsg.content[0].type === "text"
        ? validationMsg.content[0].text.toLowerCase().trim()
        : "yes";

    if (validationText.startsWith("no")) {
      return Response.json(
        { error: "Inventory contains unrecognized pieces" },
        { status: 422 }
      );
    }

    // Step 2: Sonnet generates the 3 suggestions
    const genMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildUserMessage(body),
        },
      ],
    });

    const responseText =
      genMsg.content[0].type === "text" ? genMsg.content[0].text : "";

    let buildResponse: BuildResponse;
    try {
      const cleanJson = responseText
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed: unknown = JSON.parse(cleanJson);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("suggestions" in parsed) ||
        !Array.isArray((parsed as Record<string, unknown>).suggestions)
      ) {
        throw new Error("Unexpected response shape from AI");
      }
      buildResponse = parsed as BuildResponse;
    } catch {
      console.error("Failed to parse Claude response:", responseText);
      return Response.json(
        { error: "Failed to parse build suggestions", raw: responseText },
        { status: 500 }
      );
    }

    // CAPTURE_RESPONSE: persist live response as new stub
    if (process.env.CAPTURE_RESPONSE === "true") {
      try {
        const stubPath = join(process.cwd(), "src/lib/stub-response.json");
        writeFileSync(stubPath, JSON.stringify(buildResponse, null, 2));
        console.log("stub-response.json updated from live response");
      } catch (e) {
        console.warn("Could not write stub-response.json:", e);
      }
    }

    return Response.json(buildResponse);
  } catch (error) {
    console.error("Build error:", error);
    return Response.json({ error: "Failed to generate build suggestions" }, { status: 500 });
  }
}
