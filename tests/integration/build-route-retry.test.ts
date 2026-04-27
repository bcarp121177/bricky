/**
 * /api/build retry loop — integration tests
 *
 * Every test traces to a spec acceptance criterion in
 * specs/placement-validator.md (Retry loop in /api/build section).
 *
 * Strategy: mock the Anthropic client at the module boundary so the full
 * POST handler can be tested without real network calls. The validator runs
 * against whatever JSON the mocked Anthropic returns.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Shared fixture data
// ---------------------------------------------------------------------------

/** A minimal BuildResponse with no violations (distinct placements, valid quantities). */
const VALID_RESPONSE_JSON = JSON.stringify({
  suggestions: [
    {
      title: "Valid build",
      description: "A valid build",
      difficulty: 1,
      estimatedTime: "5 minutes",
      tips: [],
      steps: [
        {
          stepNumber: 1,
          instruction: "Place the brick",
          piecesUsed: [
            {
              partNum: "3005",
              name: "Brick 1x1",
              color: "Red",
              colorHex: "#FF0000",
              quantity: 1,
              imgUrl: "https://example.com/img.png",
              placements: [{ col: 0, row: 0, layer: 0, rotation: 0 }],
            },
          ],
        },
      ],
    },
  ],
});

/**
 * A BuildResponse with an overlap violation: same piece placed twice at the
 * same position.
 */
const INVALID_OVERLAP_JSON = JSON.stringify({
  suggestions: [
    {
      title: "Overlap build",
      description: "Has overlaps",
      difficulty: 1,
      estimatedTime: "5 minutes",
      tips: [],
      steps: [
        {
          stepNumber: 1,
          instruction: "Place two bricks at the same spot",
          piecesUsed: [
            {
              partNum: "3005",
              name: "Brick 1x1",
              color: "Red",
              colorHex: "#FF0000",
              quantity: 2,
              imgUrl: "https://example.com/img.png",
              placements: [
                { col: 0, row: 0, layer: 0, rotation: 0 },
                { col: 0, row: 0, layer: 0, rotation: 0 }, // duplicate — overlap
              ],
            },
          ],
        },
      ],
    },
  ],
});

/** A valid Haiku "yes" response that passes inventory validation. */
function makeHaikuYesContent() {
  return [{ type: "text", text: "yes" }];
}

/** A mocked Anthropic message result for Sonnet. */
function makeGenContent(json: string) {
  return [{ type: "text", text: json }];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MINIMAL_PIECES = [
  {
    partNum: "3005",
    name: "Brick 1x1",
    color: "Red",
    colorHex: "#FF0000",
    quantity: 2,
    imgUrl: "https://example.com/img.png",
    category: "Bricks",
  },
];

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Mock Anthropic
// ---------------------------------------------------------------------------

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  };
});

// Import route AFTER mock is set up
const { POST } = await import("@/app/api/build/route");

// ---------------------------------------------------------------------------
// Tests — retry loop in /api/build
// ---------------------------------------------------------------------------

describe("/api/build retry loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Unset stub env var in case a prior test set it
    delete process.env.USE_STUB;
  });

  // Spec: USE_STUB=true bypasses validator entirely
  it("USE_STUB=true bypasses validator and returns response without validation", async () => {
    process.env.USE_STUB = "true";

    const req = makeRequest({ pieces: MINIMAL_PIECES, theme: "Space" });
    const response = await POST(req);

    // Stub path returns 200 and does not call Anthropic at all
    expect(response.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();

    delete process.env.USE_STUB;
  });

  // Spec: When validator returns valid: true on first attempt, route returns 200
  it("returns 200 when validator accepts the first attempt", async () => {
    // Haiku → yes, Sonnet → valid response
    mockCreate
      .mockResolvedValueOnce({ content: makeHaikuYesContent() })
      .mockResolvedValueOnce({ content: makeGenContent(VALID_RESPONSE_JSON) });

    const req = makeRequest({ pieces: MINIMAL_PIECES, theme: "Space" });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.suggestions).toBeDefined();
    expect(Array.isArray(body.suggestions)).toBe(true);
    // Sonnet called exactly once (1 attempt)
    expect(mockCreate).toHaveBeenCalledTimes(2); // 1 Haiku + 1 Sonnet
  });

  // Spec: When validator returns valid: false on first attempt and valid: true on second,
  //       route returns 200 (re-prompt worked)
  it("returns 200 when first attempt fails validation but second attempt is valid", async () => {
    // Haiku → yes, Sonnet attempt 1 → invalid, Sonnet attempt 2 → valid
    mockCreate
      .mockResolvedValueOnce({ content: makeHaikuYesContent() })
      .mockResolvedValueOnce({ content: makeGenContent(INVALID_OVERLAP_JSON) })
      .mockResolvedValueOnce({ content: makeGenContent(VALID_RESPONSE_JSON) });

    const req = makeRequest({ pieces: MINIMAL_PIECES, theme: "Space" });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.suggestions).toBeDefined();
    // 1 Haiku + 2 Sonnet calls
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  // Spec: When validator returns valid: false on all 3 attempts, route returns HTTP 500
  //       with { error: "Could not generate valid placements after 3 attempts" }
  it("returns HTTP 500 after 3 failed validation attempts", async () => {
    // Haiku → yes, Sonnet attempts 1–3 → all invalid
    mockCreate
      .mockResolvedValueOnce({ content: makeHaikuYesContent() })
      .mockResolvedValueOnce({ content: makeGenContent(INVALID_OVERLAP_JSON) })
      .mockResolvedValueOnce({ content: makeGenContent(INVALID_OVERLAP_JSON) })
      .mockResolvedValueOnce({ content: makeGenContent(INVALID_OVERLAP_JSON) });

    const req = makeRequest({ pieces: MINIMAL_PIECES, theme: "Space" });
    const response = await POST(req);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Could not generate valid placements after 3 attempts");
    // 1 Haiku + 3 Sonnet calls
    expect(mockCreate).toHaveBeenCalledTimes(4);
  });

  // Spec: Attempt counter resets between separate POST requests
  it("attempt counter resets on each new POST request", async () => {
    // First request: all 3 attempts fail → 500
    mockCreate
      .mockResolvedValueOnce({ content: makeHaikuYesContent() })
      .mockResolvedValueOnce({ content: makeGenContent(INVALID_OVERLAP_JSON) })
      .mockResolvedValueOnce({ content: makeGenContent(INVALID_OVERLAP_JSON) })
      .mockResolvedValueOnce({ content: makeGenContent(INVALID_OVERLAP_JSON) });

    const req1 = makeRequest({ pieces: MINIMAL_PIECES, theme: "Space" });
    const response1 = await POST(req1);
    expect(response1.status).toBe(500);

    // Second request: first attempt succeeds → 200 (counter reset, not using leftover state)
    mockCreate
      .mockResolvedValueOnce({ content: makeHaikuYesContent() })
      .mockResolvedValueOnce({ content: makeGenContent(VALID_RESPONSE_JSON) });

    const req2 = makeRequest({ pieces: MINIMAL_PIECES, theme: "Space" });
    const response2 = await POST(req2);
    expect(response2.status).toBe(200);
    const body2 = await response2.json();
    expect(body2.suggestions).toBeDefined();
  });
});
