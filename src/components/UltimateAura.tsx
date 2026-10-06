import { useLayoutEffect, useRef, type RefObject } from 'react';
import './UltimateAura.css';

interface Props {
  anchor: RefObject<HTMLButtonElement | null>;
  host: RefObject<HTMLElement | null>;
  active: boolean;
  layoutKey: string;
}

const OUTSET = 40;
const clips = (value: string) => /^(auto|scroll|hidden|clip)$/.test(value);

/** Decoration lives outside the scrolling tray; only its own coordinates are updated. */
export default function UltimateAura({ anchor, host, active, layoutKey }: Props) {
  const layer = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = layer.current;
    const button = anchor.current;
    const container = host.current;
    if (!element) return;
    element.dataset.visible = 'false';
    if (!active || !button || !container) return;
    let frame = 0;
    let disposed = false;
    const update = () => {
      frame = 0;
      if (disposed || !button.isConnected || !container.isConnected) {
        element.dataset.visible = 'false';
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
        element.dataset.visible = 'false';
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
      element.dataset.visible = 'true';
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(button);
    observer.observe(container);
    container.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.visualViewport?.addEventListener('resize', schedule, { passive: true });
    window.visualViewport?.addEventListener('scroll', schedule, { passive: true });
    update();
    // Font loading can change a tab's neighbours without changing its own width.
    void document.fonts?.ready.then(schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener('scroll', schedule, true);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      element.dataset.visible = 'false';
    };
  }, [anchor, host, active, layoutKey]);

  return <span ref={layer} className="ultimate-aura" data-visible="false" aria-hidden="true">
    <span className="ultimate-aura-anchor">
      {['top', 'right', 'bottom', 'left'].map(edge => <span key={edge} className={`ultimate-aura-edge ultimate-aura-${edge}`}>
        <i /><i /><i /><i /><i />
      </span>)}
      <span className="ultimate-aura-dust"><i /><i /><i /><i /></span>
    </span>
  </span>;
}
