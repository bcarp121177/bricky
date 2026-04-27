import type { NextRequest } from "next/server";
import { writeFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import stubData from "@/lib/stub-response.json";
import type { BuildRequest, BuildResponse } from "@/lib/types";
import { validatePlacements, type Violation } from "@/lib/validator";

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
              "imgUrl": "string",
              "placements": [
                {
                  "col": number,
                  "row": number,
                  "layer": number,
                  "rotation": 0 | 90 | 180 | 270
                }
              ]
            }
          ]
        }
      ],
      "tips": ["string"]
    }
  ]
}

For each piece in piecesUsed, include a "placements" array with one entry per physical piece (matching quantity).
Each placement has:
  "col": stud column from left, 0-based integer
  "row": stud row from front, 0-based integer
  "layer": brick layer from bottom, 0-based integer (0=ground level)
  "rotation": 0, 90, 180, or 270 (degrees around vertical axis)

Rules:
- Pieces must not overlap — check col/row/layer coverage before placing
- Build up in layers; layer 0 is the base
- Keep the model compact, roughly centered around col 4–8, row 0–4
- A 2×4 brick at (col, row, layer, rotation=0) occupies cols col..col+3, rows row..row+1
- A 2×4 brick at rotation=90 occupies cols col..col+1, rows row..row+3`;
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

/**
 * Enrichment pass: copy imgUrl from the original inventory into every
 * piecesUsed entry. The AI cannot be trusted to copy URLs faithfully, so we
 * overwrite server-side after parsing. Matching key: partNum + color.
 */
function enrichImgUrls(buildResponse: BuildResponse, pieces: BuildRequest["pieces"]): void {
  const lookup = new Map<string, string>();
  for (const piece of pieces) {
    lookup.set(`${piece.partNum}:${piece.color}`, piece.imgUrl);
  }
  for (const suggestion of buildResponse.suggestions) {
    for (const step of suggestion.steps) {
      for (const entry of step.piecesUsed) {
        const url = lookup.get(`${entry.partNum}:${entry.color}`);
        if (url) {
          entry.imgUrl = url;
        }
      }
    }
  }
}

/** Runtime type guard: verifies that an unknown value has the shape of BuildResponse. */
function isBuildResponse(value: unknown): value is BuildResponse {
  return (
    value !== null &&
    typeof value === "object" &&
    "suggestions" in value &&
    Array.isArray((value as Record<string, unknown>).suggestions)
  );
}

/** Format violations into a human-readable list for the re-prompt message. */
function buildViolationLines(violations: Violation[]): string {
  return violations
    .map((v) => `- [${v.type}] ${v.detail}`)
    .join("\n");
}

export async function POST(request: NextRequest): Promise<Response> {
  // USE_STUB: skip API call entirely
  if (process.env.USE_STUB === "true") {
    await new Promise((r) => setTimeout(r, 900)); // simulate latency
    const body: BuildRequest = await request.json();
    // Deep-copy so we don't mutate the cached module import across requests
    const response: BuildResponse = JSON.parse(JSON.stringify(stubData));
    enrichImgUrls(response, body.pieces);
    return Response.json(response);
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

    // Step 2: Sonnet generates the 3 suggestions, with up to 3 attempts if
    // placements are invalid (retry loop re-prompts Claude with violation details).
    const MAX_ATTEMPTS = 3;
    const conversationMessages: Anthropic.MessageParam[] = [
      { role: "user", content: buildUserMessage(body) },
    ];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const genMsg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: buildSystemPrompt(),
        messages: conversationMessages,
      });

      const responseText =
        genMsg.content[0].type === "text" ? genMsg.content[0].text : "";

      let parsed: BuildResponse;
      try {
        const cleanJson = responseText
          .replace(/^```json?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        const raw: unknown = JSON.parse(cleanJson);
        if (!isBuildResponse(raw)) {
          throw new Error("Unexpected response shape from AI");
        }
        parsed = raw;
      } catch {
        console.error("Failed to parse Claude response:", responseText);
        return Response.json(
          { error: "Failed to parse build suggestions", raw: responseText },
          { status: 500 }
        );
      }

      const validationResult = validatePlacements(parsed, body.pieces);

      if (validationResult.valid) {
        // Enrich imgUrls server-side so piece chips always show real images
        enrichImgUrls(parsed, body.pieces);

        // CAPTURE_RESPONSE: persist live response as new stub
        if (process.env.CAPTURE_RESPONSE === "true") {
          try {
            const stubPath = join(process.cwd(), "src/lib/stub-response.json");
            writeFileSync(stubPath, JSON.stringify(parsed, null, 2));
            console.log("stub-response.json updated from live response");
          } catch (e) {
            console.warn("Could not write stub-response.json:", e);
          }
        }

        return Response.json(parsed);
      }

      // Violations found — if we've exhausted all attempts, return hard error.
      if (attempt === MAX_ATTEMPTS) {
        console.error(
          `Placement validation failed after ${MAX_ATTEMPTS} attempts`,
          validationResult.violations
        );
        return Response.json(
          { error: "Could not generate valid placements after 3 attempts" },
          { status: 500 }
        );
      }

      // Append the AI's response and a re-prompt so the next loop iteration
      // sends a full conversation turn to Claude.
      const violationLines = buildViolationLines(validationResult.violations);
      conversationMessages.push(
        { role: "assistant", content: responseText },
        {
          role: "user",
          content: `The placements have the following errors. Please return corrected JSON only:\n${violationLines}`,
        }
      );
    }

    // This line is unreachable — the loop always returns on the final attempt.
    // TypeScript requires a return here to satisfy exhaustive flow analysis.
    return Response.json(
      { error: "Could not generate valid placements after 3 attempts" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Build error:", error);
    return Response.json({ error: "Failed to generate build suggestions" }, { status: 500 });
  }
}
