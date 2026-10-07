import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { FLAME_FRAME_MS, FLAME_STILL_TIME, loadUltimateAtlas, paintUltimateFlames, type FlameBounds, type FlameQuad } from './apricotAura';
import './UltimateAura.css';
import CardHolo from './CardHolo';

interface Props {
  selector: string;
  face: ReactNode;
  holo?: boolean;
  host: RefObject<HTMLElement | null>;
  active: boolean;
  layoutKey: string;
}

const clips = (value: string) => /^(auto|scroll|hidden|clip)$/.test(value);

/** Recover the transformed border corners, rather than treating a rotated bounding box as the card. */
function cardGeometry(button: HTMLButtonElement, rect: DOMRect) {
  const style = getComputedStyle(button);
  const px = (value: string) => Number.parseFloat(value) || 0;
  const width = px(style.width) + (style.boxSizing === 'border-box' ? 0 : px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth));
  const height = px(style.height) + (style.boxSizing === 'border-box' ? 0 : px(style.paddingTop) + px(style.paddingBottom) + px(style.borderTopWidth) + px(style.borderBottomWidth));
  let matrix = new DOMMatrixReadOnly();
  for (let node: HTMLElement | null = button; node; node = node.parentElement) {
    const transform = getComputedStyle(node).transform;
    if (transform !== 'none') matrix = new DOMMatrixReadOnly(transform).multiply(matrix);
  }
  // Translations and transform origins are already represented by the actual bounding-box centre.
  const { a, b, c, d } = matrix;
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const point = (u: number, v: number) => ({ x: cx + a * u + c * v, y: cy + b * u + d * v });
  const corners: FlameQuad = [point(-width / 2, -height / 2), point(width / 2, -height / 2), point(width / 2, height / 2), point(-width / 2, height / 2)];
  return { width, height, corners, matrix: `matrix(${a},${b},${c},${d},0,0)` };
}

const transitionTime = (value: string) => Math.max(0, ...value.split(',').map(part => Number.parseFloat(part) * (part.trim().endsWith('ms') ? 1 : 1000)));

/** Decoration lives outside the scrolling tray; only its own coordinates are updated. */
export default function UltimateAura({ selector, host, active, layoutKey, face, holo = false }: Props) {
  const layer = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const element = layer.current;

    // A child layout effect can run before its parent section's ref is attached on first mount.
    const container = host.current ?? element?.parentElement;
    const button = container?.querySelector<HTMLButtonElement>(selector);
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
    const moving = new Map<Element, number>();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => motion.matches || document.documentElement.classList.contains('reduce-motion');
    const phase = [...selector].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 8;
    const paint = (time: number) => paintUltimateFlames(context, bounds, time + phase / 6);
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
      if (disposed) return;
      const now = performance.now();
      for (const [target, deadline] of moving) if (deadline < now || !target.isConnected) moving.delete(target);
      // CSS transforms do not notify ResizeObserver. Track them only while a transition is active.
      if (moving.size && !document.hidden) frame = requestAnimationFrame(update);
      if (disposed || !button.isConnected || !container.isConnected) {
        hide();
        return;
      }
      const rect = button.getBoundingClientRect();
      const geometry = cardGeometry(button, rect);
      const PADDING = { top: geometry.height * .76 + 24, right: geometry.width * .52 + 24, bottom: geometry.height * .12 + 24, left: geometry.width * .52 + 24 };
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
      const x = Math.max(viewportLeft, left - PADDING.left), y = Math.max(viewportTop, top - PADDING.top);
      const width = Math.min(viewportRight, right + PADDING.right) - x;
      const height = Math.min(viewportBottom, bottom + PADDING.bottom) - y;
      const px = (value: number) => `${value.toFixed(2)}px`;
      element.style.left = px(x - origin.left - container.clientLeft + container.scrollLeft);
      element.style.top = px(y - origin.top - container.clientTop + container.scrollTop);
      element.style.width = px(width);
      element.style.height = px(height);
      element.style.setProperty('--aura-clip', `${px(top - y)} ${px(x + width - right)} ${px(y + height - bottom)} ${px(left - x)}`);
      element.style.setProperty('--aura-x', px(geometry.corners[0].x - x));
      element.style.setProperty('--aura-y', px(geometry.corners[0].y - y));
      element.style.setProperty('--aura-w', px(geometry.width));
      element.style.setProperty('--aura-h', px(geometry.height));
      element.style.setProperty('--aura-transform', geometry.matrix);
      // Fixed 2 CSS-pixel raster size intentionally preserves the game's pixel art.
      // Keep the complete texture anchored to the folder even when the outer layer is clipped.
      const canvasWidth = rect.width + PADDING.left + PADDING.right, canvasHeight = rect.height + PADDING.top + PADDING.bottom;
      surface.style.left = px(rect.left - x - PADDING.left);
      surface.style.top = px(rect.top - y - PADDING.top);
      surface.style.width = px(canvasWidth);
      surface.style.height = px(canvasHeight);
      const rasterWidth = Math.ceil(canvasWidth / 2), rasterHeight = Math.ceil(canvasHeight / 2);
      const corners = geometry.corners.map(point => ({ x: point.x - rect.left + PADDING.left, y: point.y - rect.top + PADDING.top })) as unknown as FlameQuad;
      const geometryChanged = bounds.width !== rect.width || bounds.height !== rect.height
        || corners.some((point, index) => Math.abs(point.x - (bounds.corners?.[index].x ?? Infinity)) > .01 || Math.abs(point.y - (bounds.corners?.[index].y ?? Infinity)) > .01);
      const wasVisible = visible;
      if (surface.width !== rasterWidth) surface.width = rasterWidth;
      if (surface.height !== rasterHeight) surface.height = rasterHeight;
      context.setTransform(surface.width / canvasWidth, 0, 0, surface.height / canvasHeight, 0, 0);
      bounds = { x: PADDING.left, y: PADDING.top, width: rect.width, height: rect.height, corners };
      visible = true;
      element.dataset.visible = 'true';
      if (geometryChanged || !wasVisible) refreshPlayback();
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(update); };
    const trackTransition = (event: TransitionEvent) => {
      const target = event.target;
      if (event.propertyName !== 'transform' || !(target instanceof Element) || !target.contains(button)) return;
      if (event.type === 'transitionrun' || event.type === 'transitionstart') {
        const style = getComputedStyle(target);
        // A bounded fallback also stops tracking if a detached node never emits transitionend.
        moving.set(target, performance.now() + transitionTime(style.transitionDuration) + transitionTime(style.transitionDelay) + 120);
      } else moving.delete(target);
      schedule();
    };
    const refreshPreference = () => { refreshPlayback(); schedule(); };
    const observer = new ResizeObserver(schedule);
    observer.observe(button);
    observer.observe(container);
    // Browse controls can appear above the tab without changing the fixed-height hand.
    for (const child of container.children) if (child !== element) observer.observe(child);
    container.addEventListener('scroll', schedule, { capture: true, passive: true });
    for (const name of ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel'] as const) container.addEventListener(name, trackTransition);
    // Instant reduced-motion hover/focus changes have no transition event.
    for (const name of ['pointerover', 'pointerout', 'focusin', 'focusout'] as const) container.addEventListener(name, schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.visualViewport?.addEventListener('resize', schedule, { passive: true });
    window.visualViewport?.addEventListener('scroll', schedule, { passive: true });
    const preferenceObserver = new MutationObserver(refreshPreference);
    preferenceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    motion.addEventListener('change', refreshPreference);
    document.addEventListener('visibilitychange', refreshPreference);
    update();
    void loadUltimateAtlas().then(() => { if (!disposed) refreshPlayback(); });
    // Font loading can change a tab's neighbours without changing its own width.
    void document.fonts?.ready.then(schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(animation);
      observer.disconnect();
      preferenceObserver.disconnect();
      motion.removeEventListener('change', refreshPreference);
      document.removeEventListener('visibilitychange', refreshPreference);
      container.removeEventListener('scroll', schedule, true);
      for (const name of ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel'] as const) container.removeEventListener(name, trackTransition);
      for (const name of ['pointerover', 'pointerout', 'focusin', 'focusout'] as const) container.removeEventListener(name, schedule);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      element.dataset.visible = 'false';
    };
  }, [selector, host, active, layoutKey]);

  return <span ref={layer} className="ultimate-aura" data-visible="false" aria-hidden="true">
    <span className="ultimate-aura-card-clip"><span className="ultimate-aura-anchor" data-card-finish={holo ? 'gold-holo' : undefined}>{face}{holo && <CardHolo />}{selector.includes('hand-skill-card') && <span className="woodcut-info-glyph">i</span>}</span></span>
    <canvas ref={canvas} className="ultimate-aura-fire" />
  </span>;
}
