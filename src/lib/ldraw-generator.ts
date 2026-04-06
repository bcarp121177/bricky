/**
 * Programmatic LDraw MPD generator.
 * Takes Claude's piece list + step instructions and produces valid LDraw
 * without relying on the AI to write geometry.
 *
 * Layout: pieces within a step are placed in a horizontal row.
 * Each step's row sits one brick-height above the previous one,
 * giving a layered "exploded" view that makes step progression visible.
 *
 * LDraw coordinate system: Y points DOWN. Bricks stack in -Y.
 *   1 stud  = 20 LDU
 *   1 brick = 24 LDU tall
 *   1 plate =  8 LDU tall
 */

interface Piece {
  name: string;
  color: string;
  quantity: number;
  partNum?: string;
}

interface Step {
  stepNumber: number;
  instruction: string;
  piecesUsed: string[];
}

// ── Color mapping ────────────────────────────────────────────────────────────

const COLOR_CODES: Record<string, number> = {
  black: 0,
  blue: 1,
  green: 2,
  "dark green": 2,
  red: 4,
  brown: 6,
  "light gray": 7,
  "light grey": 7,
  "dark gray": 8,
  "dark grey": 8,
  "bright green": 10,
  pink: 13,
  yellow: 14,
  white: 15,
  "medium blue": 73,
  "sky blue": 11,
  tan: 19,
  orange: 25,
  "lime green": 76,
  lime: 76,
  purple: 89,
  "dark red": 59,
  "dark tan": 69,
  "light bluish gray": 71,
  "light bluish grey": 71,
  "dark bluish gray": 72,
  "dark bluish grey": 72,
};

function ldrawColor(colorName: string): number {
  const key = colorName.toLowerCase().trim();
  if (COLOR_CODES[key] !== undefined) return COLOR_CODES[key];
  // Partial match
  for (const [k, v] of Object.entries(COLOR_CODES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return 15; // default white
}

// ── Part file mapping ────────────────────────────────────────────────────────

/** Returns the LDraw .dat filename for a part number or piece name. */
function ldrawPartFile(partNum: string | undefined, name: string): string {
  // If we have a numeric part number from Brickognize / Claude, trust it
  if (partNum && /^\d+[a-z]?$/i.test(partNum)) {
    return `${partNum}.dat`;
  }

  // Name-based fallback lookup
  const n = name.toLowerCase();
  const patterns: [RegExp, string][] = [
    [/1\s*x\s*1\s*brick/,  "3005.dat"],
    [/1\s*x\s*2\s*brick/,  "3004.dat"],
    [/1\s*x\s*3\s*brick/,  "3622.dat"],
    [/1\s*x\s*4\s*brick/,  "3010.dat"],
    [/1\s*x\s*6\s*brick/,  "3009.dat"],
    [/1\s*x\s*8\s*brick/,  "3008.dat"],
    [/2\s*x\s*2\s*brick/,  "3003.dat"],
    [/2\s*x\s*3\s*brick/,  "3002.dat"],
    [/2\s*x\s*4\s*brick/,  "3001.dat"],
    [/2\s*x\s*6\s*brick/,  "2456.dat"],
    [/2\s*x\s*8\s*brick/,  "3007.dat"],
    [/1\s*x\s*1\s*plate/,  "3024.dat"],
    [/1\s*x\s*2\s*plate/,  "3023.dat"],
    [/1\s*x\s*3\s*plate/,  "3623.dat"],
    [/1\s*x\s*4\s*plate/,  "3710.dat"],
    [/2\s*x\s*2\s*plate/,  "3022.dat"],
    [/2\s*x\s*3\s*plate/,  "3021.dat"],
    [/2\s*x\s*4\s*plate/,  "3020.dat"],
    [/2\s*x\s*6\s*plate/,  "3795.dat"],
    [/2\s*x\s*8\s*plate/,  "3034.dat"],
    [/1\s*x\s*1\s*tile/,   "3070b.dat"],
    [/1\s*x\s*2\s*tile/,   "3069b.dat"],
    [/2\s*x\s*2\s*tile/,   "3068b.dat"],
    [/1\s*x\s*4\s*tile/,   "2431.dat"],
    [/slope/,              "3037.dat"],
    [/wedge/,              "3037.dat"],
  ];

  for (const [re, file] of patterns) {
    if (re.test(n)) return file;
  }

  return "3001.dat"; // fallback: 2x4 brick
}

// ── Piece width (in LDU) for horizontal spacing ──────────────────────────────

const PART_WIDTH_LDU: Record<string, number> = {
  "3005.dat": 20, "3024.dat": 20, "3070b.dat": 20, // 1-wide
  "3004.dat": 20, "3023.dat": 20, "3069b.dat": 20, // 1x2 (1 wide)
  "3622.dat": 20, "3623.dat": 20,                   // 1x3
  "3010.dat": 20, "3710.dat": 20, "2431.dat": 20,   // 1x4
  "3009.dat": 20, "3795.dat": 20,                   // 1x6
  "3008.dat": 20, "3034.dat": 20,                   // 1x8
  "3003.dat": 40, "3022.dat": 40, "3068b.dat": 40,  // 2x2
  "3002.dat": 40, "3021.dat": 40,                   // 2x3
  "3001.dat": 40, "3020.dat": 40,                   // 2x4
  "2456.dat": 40,                                    // 2x6
  "3007.dat": 40,                                    // 2x8
};

function partWidthLDU(file: string): number {
  return PART_WIDTH_LDU[file] ?? 40;
}

// ── Step-piece matching ───────────────────────────────────────────────────────

/**
 * Given a "piecesUsed" string like "2x Red 2x4 Brick", extract quantity,
 * color hint, and a size/type hint, then find the best matching piece.
 */
function parsePieceRef(ref: string): { qty: number; color: string; hint: string } {
  const m = ref.match(/^(\d+)x?\s+(.+)/i);
  if (!m) return { qty: 1, color: "", hint: ref };
  const qty = parseInt(m[1], 10);
  const rest = m[2].trim();
  // First word is often the color
  const words = rest.split(/\s+/);
  return { qty, color: words[0], hint: rest };
}

function matchPiece(ref: string, pieces: Piece[]): { piece: Piece; qty: number } | null {
  const { qty, color, hint } = parsePieceRef(ref);
  const hintLow = hint.toLowerCase();
  const colorLow = color.toLowerCase();

  // Score each piece: prefer same color + same size keywords
  let best: Piece | null = null;
  let bestScore = -1;

  for (const p of pieces) {
    let score = 0;
    if (p.color.toLowerCase().includes(colorLow) || colorLow.includes(p.color.toLowerCase())) score += 2;
    // Check size keywords (e.g. "2x4", "1x2")
    const sizeMatch = hintLow.match(/\d+\s*x\s*\d+/);
    const pNameLow = p.name.toLowerCase();
    if (sizeMatch && pNameLow.includes(sizeMatch[0].replace(/\s/g, "x"))) score += 3;
    // Check type keywords
    for (const kw of ["brick", "plate", "tile", "slope"]) {
      if (hintLow.includes(kw) && pNameLow.includes(kw)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = p; }
  }

  return best ? { piece: best, qty } : null;
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateLDraw(pieces: Piece[], steps: Step[]): string {
  const lines: string[] = [
    "0 FILE model.ldr",
    "0 Bricky Build",
    "0 Name: model.ldr",
    "0 Author: Bricky",
    "",
  ];

  const STEP_HEIGHT = 32; // LDU between step layers (slightly more than 1 brick)
  const GAP = 12;         // LDU between pieces within a row

  for (let si = 0; si < steps.length; si++) {
    const step = steps[si];
    const y = -si * STEP_HEIGHT;

    // Resolve pieces used in this step
    const resolved: { piece: Piece; qty: number }[] = [];
    for (const ref of step.piecesUsed) {
      const match = matchPiece(ref, pieces);
      if (match) resolved.push(match);
    }

    // If nothing matched, fall back to placing one of each piece type
    const toPlace = resolved.length > 0
      ? resolved
      : pieces.map((p) => ({ piece: p, qty: 1 }));

    // Calculate total row width to center it around x=0
    const totalWidth = toPlace.reduce((sum, { piece, qty }) => {
      const file = ldrawPartFile(piece.partNum, piece.name);
      return sum + qty * (partWidthLDU(file) + GAP);
    }, -GAP);

    let x = -Math.round(totalWidth / 2);

    for (const { piece, qty } of toPlace) {
      const file = ldrawPartFile(piece.partNum, piece.name);
      const color = ldrawColor(piece.color);
      const w = partWidthLDU(file);

      for (let i = 0; i < qty; i++) {
        lines.push(`1 ${color} ${x} ${y} 0 1 0 0 0 1 0 0 0 1 ${file}`);
        x += w + GAP;
      }
    }

    if (si < steps.length - 1) {
      lines.push("0 STEP");
    }
  }

  lines.push("0 NOFILE");
  return lines.join("\n");
}
