import { useEffect } from 'react';
import type { RefObject } from 'react';

/** Hover near a horizontal hand's edges; touch, wheel and keyboard stay native. */
export function useEdgeScroll<T extends HTMLElement>(ref: RefObject<T | null>, enabled: boolean) {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;

    let frame = 0;
    let previousTime: number | null = null;
    let pointerX: number | null = null;
    let pointerY: number | null = null;
    let remainder = 0;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
      pointerX = null;
      pointerY = null;
      remainder = 0;
    };
    const blocked = () => document.hidden || !document.hasFocus()
      || [...document.querySelectorAll('dialog:modal')].some(dialog => !dialog.contains(element));
    const speed = () => {
      if (pointerX === null || pointerY === null) return 0;
      const { left, right, top, bottom, width } = element.getBoundingClientRect();
      const edge = Math.min(80, width * 0.2);
      if (edge <= 0 || pointerX < left || pointerX > right || pointerY < top || pointerY > bottom) return 0;
      const fromLeft = pointerX - left;
      const fromRight = right - pointerX;
      // Pixels per second: a shallow edge feels gentle, the outer rim moves faster.
      if (fromLeft < edge) return -360 * (1 - fromLeft / edge);
      if (fromRight < edge) return 360 * (1 - fromRight / edge);
      return 0;
    };
    const canScroll = (velocity: number) => velocity < 0 ? element.scrollLeft > 0.5
      : velocity > 0 && element.scrollLeft < element.scrollWidth - element.clientWidth - 0.5;
    const tick = (time: number) => {
      frame = 0;
      const velocity = speed();
      if (blocked() || !canScroll(velocity)) {
        previousTime = null;
        remainder = 0;
        return;
      }
      // Clamp a delayed frame so returning from a stalled tab cannot jump the hand.
      const elapsed = previousTime === null ? 0 : Math.min(40, time - previousTime);
      previousTime = time;
      const distance = velocity * elapsed / 1000 + remainder;
      const before = element.scrollLeft;
      element.scrollBy({ left: distance, behavior: 'instant' });
      // Keep subpixel travel: browsers round each scrollBy on high refresh screens.
      remainder = distance - (element.scrollLeft - before);
      if (canScroll(velocity)) frame = requestAnimationFrame(tick);
      else {
        previousTime = null;
        remainder = 0;
      }
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.buttons !== 0 || blocked()) {
        stop();
        return;
      }
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!canScroll(speed())) {
        stop();
        return;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const visibilityChange = () => { if (document.hidden) stop(); };

    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', stop, { passive: true });
    element.addEventListener('pointerdown', stop, { passive: true });
    element.addEventListener('pointercancel', stop, { passive: true });
    element.addEventListener('wheel', stop, { passive: true });
    element.addEventListener('focusin', stop);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', visibilityChange);
    return () => {
      stop();
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', stop);
      element.removeEventListener('pointerdown', stop);
      element.removeEventListener('pointercancel', stop);
      element.removeEventListener('wheel', stop);
      element.removeEventListener('focusin', stop);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', visibilityChange);
    };
  }, [ref, enabled]);
}
