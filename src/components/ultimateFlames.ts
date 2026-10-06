export interface FlamePoint { x: number; y: number }
export type FlameQuad = readonly [FlamePoint, FlamePoint, FlamePoint, FlamePoint];
export interface FlameBounds { x: number; y: number; width: number; height: number; corners?: FlameQuad }

const TAU = Math.PI * 2;
const wave = (time: number, seed: number) => Math.sin(time * 2.7 + seed) * .65 + Math.sin(time * 4.1 + seed * 2.3) * .35;
const fraction = (value: number) => value - Math.floor(value);

/** Every flame uses screen-up coordinates, including those climbing the side edges. */
function tongue(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, time: number, seed: number, alpha = 1) {
  const lean = wave(time - .3, seed) * Math.min(5, width * .48);
  const curl = Math.sin(time * 3.2 + seed) * width * .4;
  const pulse = 1 + wave(time, seed + 1) * .13;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let layer = 0; layer < 3; layer++) {
    const h = height * pulse * [1, .77, .44][layer];
    const w = width * [1, .62, .27][layer];
    ctx.fillStyle = ['#9563db30', '#c69af03d', '#f1ddff49'][layer];
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w * 1.1, y - h * .22, x + lean - w * .5, y - h * .61, x + lean + curl, y - h);
    ctx.bezierCurveTo(x + lean + w * .55, y - h * .78, x + w * .16 - lean * .2, y - h * .49, x + w, y - h * .16);
    ctx.quadraticCurveTo(x + w * .8, y - 2, x + w, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function ember(ctx: CanvasRenderingContext2D, x: number, baseY: number, distance: number, time: number, seed: number) {
  const life = fraction(time * .38 + seed * .173);
  const opacity = Math.sin(life * Math.PI) * .44;
  ctx.fillStyle = `rgba(225,196,255,${opacity})`;
  // Sideways motion is a gentle sway; the travel direction is always upward.
  const px = x + Math.sin(life * 3 + seed) * 3;
  const py = baseY - life * distance;
  ctx.fillRect(Math.round(px / 2) * 2, Math.round(py / 2) * 2, 2, life < .5 ? 3 : 2);
}

export function paintUltimateFlames(ctx: CanvasRenderingContext2D, bounds: FlameBounds, time: number) {
  const { x, y, width, height } = bounds;
  const [tl, tr, br, bl] = bounds.corners ?? [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }];
  const edgeWidth = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const edgeHeight = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const at = (u: number, v: number): FlamePoint => ({
    x: tl.x + (tr.x - tl.x) * u + (bl.x - tl.x) * v,
    y: tl.y + (tr.y - tl.y) * u + (bl.y - tl.y) * v,
  });
  const compact = edgeHeight < 60;
  const reach = compact ? 30 : 58;
  ctx.clearRect(0, 0, ctx.canvas.width * 2, ctx.canvas.height * 2);
  ctx.save();
  // Keep the title and art clear even where a bottom corner's flame rises past them.
  ctx.beginPath();
  ctx.rect(0, 0, ctx.canvas.width * 2, ctx.canvas.height * 2);
  const insetU = Math.min(.5, 5 / Math.max(1, edgeWidth));
  const insetV = Math.min(.5, 5 / Math.max(1, edgeHeight));
  const inner = [at(insetU, insetV), at(1 - insetU, insetV), at(1 - insetU, 1 - insetV), at(insetU, 1 - insetV)];
  ctx.moveTo(inner[0].x, inner[0].y);
  for (const point of inner.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
  ctx.clip('evenodd');

  // A quiet connected root; all visible tongues above it point toward the sky.
  ctx.strokeStyle = '#b78de729';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y - 1);
  ctx.lineTo(tr.x, tr.y - 1);
  ctx.stroke();
  const count = Math.max(3, Math.round(edgeWidth / 23));
  const step = edgeWidth / count;
  for (let i = 0; i < count; i++) {
    const seed = i * 2.399 + 1;
    const life = fraction(time * .57 + i * .317);
    const root = at((i + .5) / count, 0);
    const secondRoot = at((i + .78) / count, 0);
    const tall = reach * (.67 + .23 * Math.sin(seed * 1.7));
    // The root bends continuously while detached wisps grow, rise and fade above it.
    tongue(ctx, root.x, root.y + 1, step * .63, tall * (.88 + Math.sin(life * TAU) * .2), time, seed, .85);
    tongue(ctx, secondRoot.x, secondRoot.y, step * .32, tall * (.48 + life * .8), time - .4, seed + 2, Math.sin(life * Math.PI) * .7);
    if (i % 2 === 0) ember(ctx, root.x, root.y - tall * .48, reach * .62, time, seed);
  }

  for (const side of [-1, 1]) {
    const top = side < 0 ? tl : tr;
    const bottom = side < 0 ? bl : br;
    const length = Math.max(1, Math.hypot(bottom.x - top.x, bottom.y - top.y));
    const outward = { x: side * (bottom.y - top.y) / length * 6, y: -side * (bottom.x - top.x) / length * 6 };
    const sideAt = (v: number) => ({ x: top.x + (bottom.x - top.x) * v + outward.x, y: top.y + (bottom.y - top.y) * v + outward.y });
    const low = sideAt(1), high = sideAt(0);
    const count = compact ? 2 : Math.max(3, Math.ceil(length / 42));
    ctx.strokeStyle = '#b68be51a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(high.x, high.y);
    ctx.lineTo(low.x, low.y);
    ctx.stroke();
    for (let i = 0; i < count; i++) {
      const seed = i * 2.731 + (side < 0 ? 7 : 13);
      const life = fraction(time * (compact ? .32 : .16) + i / count);
      const root = sideAt(1 - life * (1 + 12 / length));
      const fade = Math.min(1, life * 7, (1 - life) * 7);
      // Vertical ribbons climb the sides. Their roots and tips never rotate outwards.
      tongue(ctx, root.x, root.y, compact ? 5 : 8, reach * (.68 + .13 * Math.sin(seed)), time, seed, fade * .9);
    }
    // Persistent corner flames join the lower rim to the upward-moving side wisps.
    tongue(ctx, low.x, low.y, compact ? 5 : 8, reach * .7, time, side + 19, .75);
    ember(ctx, low.x, low.y - 5, length + reach * .3, time, side + 23);
  }
  ctx.restore();
}

export const FLAME_FRAME_MS = 1000 / 24;
export const FLAME_STILL_TIME = TAU / 3;
