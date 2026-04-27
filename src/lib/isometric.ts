/**
 * Pure TypeScript isometric projection math for the SVG step renderer.
 *
 * Coordinate conventions:
 *   col  — stud column, increases right
 *   row  — stud row, increases away from camera (back)
 *   layer — brick layer, increases upward
 *
 * Isometric axes (2:1 pixel ratio, camera above-right):
 *   +col  → SVG (+scale/2, +scale/4)
 *   +row  → SVG (-scale/2, +scale/4)
 *   +layer → SVG (0, -DEFAULT_LAYER_H/20 * scale)   [layerH in LDU; 1 stud = 20 LDU]
 *
 * scale: SVG pixels per stud.
 */

/** Default layer height in LDU (standard brick = 24 LDU, plate = 8 LDU). */
export const DEFAULT_LAYER_H = 24;

/** Project a single stud-grid point to SVG canvas coordinates. */
export function isoProject(
  col: number,
  row: number,
  layer: number,
  scale: number
): { x: number; y: number } {
  const x = (col - row) * (scale / 2);
  const y = (col + row) * (scale / 4) - (layer * DEFAULT_LAYER_H * scale) / 20;
  return { x, y };
}

/**
 * Compute SVG polygon `points` strings for the three visible isometric faces
 * of a brick placed at (col, row, layer) with given width/depth in studs and
 * height in LDU.
 *
 * Returns { top, leftFront, rightFront } — each is a space-separated SVG
 * polygon points string.
 */
export function brickToPolygons(
  col: number,
  row: number,
  layer: number,
  w: number,
  d: number,
  layerH: number,
  scale: number
): { top: string; leftFront: string; rightFront: string } {
  const bh = (layerH * scale) / 20; // brick height in SVG pixels

  // The eight corners of the brick in stud-grid space, projected to SVG.
  // Top face corners (at layer + 1, i.e. the top surface):
  const tl = project(col,     row + d, layer + 1, layerH, scale); // back-left corner
  const tr = project(col + w, row + d, layer + 1, layerH, scale); // back-right corner
  const bl = project(col,     row,     layer + 1, layerH, scale); // front-left corner
  const br = project(col + w, row,     layer + 1, layerH, scale); // front-right corner

  // Top face diamond: back-left, back-right, front-right, front-left
  const top = pts([tl, tr, br, bl]);

  // Left-front face (left side wall): top edge tl→bl, bottom edge shifted down by bh
  const leftFront = pts([
    tl,
    bl,
    { x: bl.x, y: bl.y + bh },
    { x: tl.x, y: tl.y + bh },
  ]);

  // Right-front face: bl(top), br(top), br-down, bl-down
  const rightFront = pts([
    bl,
    br,
    { x: br.x, y: br.y + bh },
    { x: bl.x, y: bl.y + bh },
  ]);

  return { top, leftFront, rightFront };
}

/**
 * Compute SVG circle center coordinates for all studs on the top face
 * of a brick. Returns one { cx, cy } per stud grid cell covered.
 *
 * scale: SVG pixels per stud.
 */
export function studCenters(
  col: number,
  row: number,
  layer: number,
  w: number,
  d: number,
  scale: number
): Array<{ cx: number; cy: number }> {
  const centers: Array<{ cx: number; cy: number }> = [];
  for (let dc = 0; dc < w; dc++) {
    for (let dr = 0; dr < d; dr++) {
      // Center of each stud: offset by 0.5 stud in col and row
      const { x, y } = project(col + dc + 0.5, row + dr + 0.5, layer + 1, DEFAULT_LAYER_H, scale);
      centers.push({ cx: x, cy: y });
    }
  }
  return centers;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function project(
  col: number,
  row: number,
  layer: number,
  layerH: number,
  scale: number
): { x: number; y: number } {
  const x = (col - row) * (scale / 2);
  const y = (col + row) * (scale / 4) - (layer * layerH * scale) / 20;
  return { x, y };
}

function pts(points: Array<{ x: number; y: number }>): string {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
