import { useEffect, useRef } from 'react';
import './CardMotion.css';

/** Tilt only the printed face, leaving its button's fan position and handlers intact. */
export default function useCardMotion() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const face = ref.current;
    const button = face?.closest('button');
    if (!face || !button) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const blocked = () => motion.matches || !!face.closest('.reduce-motion, .retro-motion-reduced') ||
      button.disabled || button.getAttribute('aria-disabled') === 'true';
    const reset = () => {
      face.style.setProperty('--card-motion-rx', '0deg');
      face.style.setProperty('--card-motion-ry', '0deg');
      face.style.setProperty('--card-motion-scale', '1');
      face.style.setProperty('--card-motion-glare', '0');
      delete face.dataset.cardMotionActive;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || blocked()) { reset(); return; }
      const rect = button.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      face.style.setProperty('--card-motion-rx', `${(0.5 - y) * 20}deg`);
      face.style.setProperty('--card-motion-ry', `${(x - 0.5) * 20}deg`);
      face.style.setProperty('--card-motion-scale', '1.02');
      face.style.setProperty('--card-motion-x', `${x * 100}%`);
      face.style.setProperty('--card-motion-y', `${y * 100}%`);
      face.style.setProperty('--card-motion-glare', '1');
      face.dataset.cardMotionActive = 'true';
    };
    const check = () => { if (blocked()) reset(); };
    const observer = new MutationObserver(check);
    for (let node: HTMLElement | null = face; node; node = node.parentElement) {
      observer.observe(node, { attributes: true, attributeFilter: ['class', 'disabled', 'aria-disabled'] });
    }
    button.addEventListener('pointerenter', move);
    button.addEventListener('pointermove', move);
    button.addEventListener('pointerleave', reset);
    button.addEventListener('pointercancel', reset);
    button.addEventListener('blur', reset);
    motion.addEventListener('change', check);
    return () => {
      observer.disconnect();
      motion.removeEventListener('change', check);
      button.removeEventListener('pointerenter', move);
      button.removeEventListener('pointermove', move);
      button.removeEventListener('pointerleave', reset);
      button.removeEventListener('pointercancel', reset);
      button.removeEventListener('blur', reset);
      reset();
    };
  }, []);

  return ref;
}
