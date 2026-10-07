import { assetUrl } from '../assets';

export interface FlamePoint { x: number; y: number }
export type FlameQuad = readonly [FlamePoint, FlamePoint, FlamePoint, FlamePoint];
export interface FlameBounds { x: number; y: number; width: number; height: number; corners?: FlameQuad }
export const FLAME_FRAME_MS = 1000 / 6;
export const FLAME_STILL_TIME = 0;
let atlas: HTMLImageElement | undefined;
let loading: Promise<void> | undefined;

/** All visible cards share one decoded atlas, including when browsing folders. */
export function loadUltimateAtlas(): Promise<void> {
  return loading ??= new Promise(resolve => {
    atlas = new Image();
    atlas.onload = () => resolve();
    atlas.onerror = () => resolve();
    atlas.src = assetUrl('effects/apricot-aura-v1.webp');
  });
}

/** Paint a filled translucent layer. The real-size card replica is layered above it in the DOM. */
export function paintUltimateFlames(ctx: CanvasRenderingContext2D, bounds: FlameBounds, time: number) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
  if (!atlas?.complete || !atlas.naturalWidth) return;
  const { x, y, width, height } = bounds;
  const [tl, tr, , bl] = bounds.corners ?? [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }];
  const edgeWidth = Math.hypot(tr.x - tl.x, tr.y - tl.y), edgeHeight = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  if (!edgeWidth || !edgeHeight) return;
  const frame = Math.floor(time * 6) % 8, fw = atlas.naturalWidth / 4, fh = atlas.naturalHeight / 2;
  ctx.save();
  ctx.transform((tr.x - tl.x) / edgeWidth, (tr.y - tl.y) / edgeWidth, (bl.x - tl.x) / edgeHeight, (bl.y - tl.y) / edgeHeight, tl.x, tl.y);
  ctx.globalAlpha = .55;
  ctx.imageSmoothingEnabled = false;
  // Same card placement as the approved preview. No hollow mask or glowing inner rim.
  ctx.drawImage(atlas, (frame % 4) * fw, Math.floor(frame / 4) * fh, fw, fh,
    -edgeWidth * .254 / .54, -edgeHeight * .365 / .54, edgeWidth / .54, edgeHeight / .54);
  ctx.restore();
}
