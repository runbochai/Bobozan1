import { useLayoutEffect, useRef, type RefObject } from 'react';
import { FLAME_FRAME_MS, FLAME_STILL_TIME, paintUltimateFlames, type FlameBounds } from './ultimateFlames';
import './UltimateAura.css';

interface Props {
  anchor: RefObject<HTMLButtonElement | null>;
  host: RefObject<HTMLElement | null>;
  active: boolean;
  layoutKey: string;
}

const OUTSET = 48;
const clips = (value: string) => /^(auto|scroll|hidden|clip)$/.test(value);

/** Decoration lives outside the scrolling tray; only its own coordinates are updated. */
export default function UltimateAura({ anchor, host, active, layoutKey }: Props) {
  const layer = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const element = layer.current;
    const button = anchor.current;
    const container = host.current;
    if (!element) return;
    element.dataset.visible = 'false';
    if (!active || !button || !container) return;
    const surface = canvas.current;
    const context = surface?.getContext('2d');
    if (!surface || !context) return;
    let frame = 0;
    let animation = 0;
    let lastPaint = -Infinity;
    let disposed = false;
    let visible = false;
    let bounds: FlameBounds = { x: 0, y: 0, width: 0, height: 0 };
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => motion.matches || document.documentElement.classList.contains('reduce-motion');
    const paint = (time: number) => paintUltimateFlames(context, bounds, time);
    const tick = (now: number) => {
      animation = 0;
      if (disposed || !visible || document.hidden || reduced()) return;
      if (now - lastPaint >= FLAME_FRAME_MS) {
        paint(now / 1000);
        lastPaint = now;
      }
      animation = requestAnimationFrame(tick);
    };
    const refreshPlayback = () => {
      cancelAnimationFrame(animation);
      animation = 0;
      element.dataset.motion = reduced() ? 'still' : 'animated';
      if (!visible || document.hidden) return;
      lastPaint = performance.now();
      paint(reduced() ? FLAME_STILL_TIME : lastPaint / 1000);
      if (!reduced()) animation = requestAnimationFrame(tick);
    };
    const hide = () => {
      visible = false;
      element.dataset.visible = 'false';
      cancelAnimationFrame(animation);
      animation = 0;
    };
    const update = () => {
      frame = 0;
      if (disposed || !button.isConnected || !container.isConnected) {
        hide();
        return;
      }
      const rect = button.getBoundingClientRect();
      const origin = container.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportRight = Math.min(document.documentElement.clientWidth, viewportLeft + (viewport?.width ?? innerWidth));
      const viewportBottom = viewportTop + (viewport?.height ?? innerHeight);
      let left = Math.max(rect.left, viewportLeft), right = Math.min(rect.right, viewportRight);
      let top = Math.max(rect.top, viewportTop), bottom = Math.min(rect.bottom, viewportBottom);
      // A scrolled-away folder must not leave flames behind over a different control.
      for (let parent = button.parentElement; parent && parent !== container; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        const bounds = parent.getBoundingClientRect();
        if (clips(style.overflowX)) {
          left = Math.max(left, bounds.left + parent.clientLeft);
          right = Math.min(right, bounds.left + parent.clientLeft + parent.clientWidth);
        }
        if (clips(style.overflowY)) {
          top = Math.max(top, bounds.top + parent.clientTop);
          bottom = Math.min(bottom, bounds.top + parent.clientTop + parent.clientHeight);
        }
      }
      if (right <= left || bottom <= top || rect.width === 0 || rect.height === 0
        || getComputedStyle(button).visibility === 'hidden') {
        hide();
        return;
      }
      // Keep the absolute box inside the viewport, so visual overflow never adds page scroll.
      const x = Math.max(viewportLeft, left - OUTSET), y = Math.max(viewportTop, top - OUTSET);
      const width = Math.min(viewportRight, right + OUTSET) - x;
      const height = Math.min(viewportBottom, bottom + OUTSET) - y;
      const px = (value: number) => `${value.toFixed(2)}px`;
      element.style.left = px(x - origin.left - container.clientLeft + container.scrollLeft);
      element.style.top = px(y - origin.top - container.clientTop + container.scrollTop);
      element.style.width = px(width);
      element.style.height = px(height);
      element.style.setProperty('--aura-x', px(rect.left - x));
      element.style.setProperty('--aura-y', px(rect.top - y));
      element.style.setProperty('--aura-w', px(rect.width));
      element.style.setProperty('--aura-h', px(rect.height));
      // Fixed 2 CSS-pixel raster size intentionally preserves the game's pixel art.
      // Keep the complete texture anchored to the folder even when the outer layer is clipped.
      const canvasWidth = rect.width + OUTSET * 2, canvasHeight = rect.height + OUTSET * 2;
      surface.style.left = px(rect.left - x - OUTSET);
      surface.style.top = px(rect.top - y - OUTSET);
      surface.style.width = px(canvasWidth);
      surface.style.height = px(canvasHeight);
      const rasterWidth = Math.ceil(canvasWidth / 2), rasterHeight = Math.ceil(canvasHeight / 2);
      const geometryChanged = bounds.width !== rect.width || bounds.height !== rect.height;
      const wasVisible = visible;
      if (surface.width !== rasterWidth) surface.width = rasterWidth;
      if (surface.height !== rasterHeight) surface.height = rasterHeight;
      context.setTransform(surface.width / canvasWidth, 0, 0, surface.height / canvasHeight, 0, 0);
      bounds = { x: OUTSET, y: OUTSET, width: rect.width, height: rect.height };
      visible = true;
      element.dataset.visible = 'true';
      if (geometryChanged || !wasVisible) refreshPlayback();
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(button);
    observer.observe(container);
    // Browse controls can appear above the tab without changing the fixed-height hand.
    for (const child of container.children) if (child !== element) observer.observe(child);
    container.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.visualViewport?.addEventListener('resize', schedule, { passive: true });
    window.visualViewport?.addEventListener('scroll', schedule, { passive: true });
    const preferenceObserver = new MutationObserver(refreshPlayback);
    preferenceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    motion.addEventListener('change', refreshPlayback);
    document.addEventListener('visibilitychange', refreshPlayback);
    update();
    // Font loading can change a tab's neighbours without changing its own width.
    void document.fonts?.ready.then(schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(animation);
      observer.disconnect();
      preferenceObserver.disconnect();
      motion.removeEventListener('change', refreshPlayback);
      document.removeEventListener('visibilitychange', refreshPlayback);
      container.removeEventListener('scroll', schedule, true);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      element.dataset.visible = 'false';
    };
  }, [anchor, host, active, layoutKey]);

  return <span ref={layer} className="ultimate-aura" data-visible="false" aria-hidden="true">
    <span className="ultimate-aura-anchor" />
    <canvas ref={canvas} className="ultimate-aura-fire" />
  </span>;
}
