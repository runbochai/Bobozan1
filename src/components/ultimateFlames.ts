export interface FlameBounds { x: number; y: number; width: number; height: number }

const TAU = Math.PI * 2;
const wave = (t: number, seed: number) => Math.sin(t * 2.7 + seed) * .65 + Math.sin(t * 4.1 + seed * 2.3) * .35;

/** Curved, interleaved tongues are rasterised at 2px: sprite-like edges, no blurry filter. */
function edge(ctx: CanvasRenderingContext2D, length: number, reach: number, time: number, seed: number) {
  const count = Math.max(5, Math.ceil(length / 15));
  const step = length / count;
  // A connected violet ribbon anchors the fire instead of floating separate triangles.
  ctx.fillStyle = '#a17aec30';
  ctx.beginPath();
  ctx.moveTo(-2, 3);
  ctx.lineTo(-2, -4);
  for (let i = 0; i <= count * 2; i++) {
    const x = i * step / 2;
    ctx.lineTo(x, -6 - (1 + wave(time, i * .67 + seed)) * 3);
  }
  ctx.lineTo(length + 2, 3);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < count; i++) {
    const phase = seed + i * 2.399;
    const pulse = wave(time, phase);
    const x = (i + .5) * step;
    const height = reach * (.54 + .19 * Math.sin(phase * 1.7) + pulse * .13);
    const width = step * (.74 + .14 * Math.sin(phase));
    const lean = wave(time - .4, phase + 1) * width * .75;
    const curl = Math.sin(time * 2 + phase) * width * .45;
    // Three nested shapes share a moving root but have different curled tips.
    for (let layer = 0; layer < 3; layer++) {
      const h = height * [1, .74, .43][layer];
      const w = width * [1, .57, .25][layer];
      ctx.fillStyle = ['#9563db30', '#c69af044', '#f1ddff50'][layer];
      ctx.beginPath();
      ctx.moveTo(x - w, 2);
      ctx.bezierCurveTo(x - w * 1.1, -h * .24, x + lean - w * .35, -h * .5, x + lean + curl, -h);
      ctx.bezierCurveTo(x + lean + w * .65, -h * .77, x + w * .1 - lean * .4, -h * .5, x + w, -h * .15);
      ctx.quadraticCurveTo(x + w * .8, 0, x + w, 2);
      ctx.closePath();
      ctx.fill();
    }
    // Detached tips drift outward then dissolve; no synchronized on/off blinking.
    const life = ((time * .34 + i * .371 + seed) % 1 + 1) % 1;
    if (i % 2 === 0) {
      const opacity = Math.sin(life * Math.PI) * .43;
      ctx.fillStyle = `rgba(221,194,255,${opacity})`;
      const sx = x + Math.sin(life * 4 + phase) * 6;
      const sy = -height * .55 - life * reach * .52;
      ctx.fillRect(Math.round(sx / 2) * 2, Math.round(sy / 2) * 2, life < .5 ? 2 : 1, 2);
    }
  }
}

export function paintUltimateFlames(ctx: CanvasRenderingContext2D, bounds: FlameBounds, time: number) {
  const { x, y, width, height } = bounds;
  const compact = height < 60;
  const reach = compact ? 23 : 42;
  ctx.clearRect(0, 0, ctx.canvas.width * 2, ctx.canvas.height * 2);
  ctx.save();
  ctx.translate(x, y);
  edge(ctx, width, reach, time, 1);
  ctx.restore();
  ctx.save();
  ctx.translate(x + width, y);
  ctx.rotate(Math.PI / 2);
  edge(ctx, height, reach * .76, time - .6, 3);
  ctx.restore();
  ctx.save();
  ctx.translate(x + width, y + height);
  ctx.rotate(Math.PI);
  edge(ctx, width, reach * .54, time - .3, 5);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y + height);
  ctx.rotate(-Math.PI / 2);
  edge(ctx, height, reach * .76, time - 1.1, 7);
  ctx.restore();

  // Fine intermittent glints along the rim remain much quieter than the card text.
  const perimeter = 2 * (width + height);
  for (let i = 0; i < 3; i++) {
    const p = ((time * 16 + i * perimeter / 3) % perimeter + perimeter) % perimeter;
    const px = p < width ? p : p < width + height ? width : p < width * 2 + height ? width * 2 + height - p : 0;
    const py = p < width ? 0 : p < width + height ? p - width : p < width * 2 + height ? height : perimeter - p;
    ctx.fillStyle = '#ead9ff77';
    ctx.fillRect(Math.round((x + px) / 2) * 2, Math.round((y + py) / 2) * 2, 2, 2);
  }
}

export const FLAME_FRAME_MS = 1000 / 24;
export const FLAME_STILL_TIME = TAU / 3;
