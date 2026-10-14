import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Lang } from '../types';
import './SoloOpeningHint.css';

interface Props {
  lang: Lang;
  onClose: () => void;
}

interface HintGeometry {
  width: number;
  height: number;
  target: { x: number; y: number; width: number; height: number } | null;
  arrow: string | null;
}

const dismissKeys = ['Escape', 'Enter', ' ', 'Spacebar'];

/** A first-turn invitation; every input stays on this modal until it is dismissed. */
export default function SoloOpeningHint({ lang, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dismissed = useRef(false);
  const id = useId().replace(/:/g, '');
  const [geometry, setGeometry] = useState<HintGeometry>({ width: 1, height: 1, target: null, arrow: null });

  useEffect(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    if (!dialog || !panel) return;
    let frame = 0;
    let target: HTMLElement | null = null;
    let observedHand: HTMLElement | null = null;
    let previousFocus: HTMLElement | null = null;
    const previousOverflow = document.body.style.overflow;
    const ownsScrollLock = previousOverflow !== 'hidden';

    const measure = () => {
      frame = 0;
      if (!dialog.isConnected || !dialog.open) return;
      const found = document.querySelector<HTMLElement>('.solo-quick-hand button[data-card-id="charge"]')
        ?? document.querySelector<HTMLElement>('.battle-hand button[data-card-id="charge"], .battle-hand button[data-card-type="CHARGE"]');
      if (found !== target) {
        if (target) resize.disconnect();
        target = found;
        resize.observe(dialog);
        resize.observe(panel);
        if (target) resize.observe(target);
      }
      const hand = target?.closest<HTMLElement>('.battle-hand') ?? null;
      if (hand !== observedHand) {
        mutation.disconnect();
        observedHand = hand;
        mutation.observe(hand ?? document.body, { childList: true, subtree: true });
      }
      const viewport = dialog.getBoundingClientRect();
      const text = panel.getBoundingClientRect();
      const card = target?.getBoundingClientRect();
      const visibleCard = card && card.width > 0 && card.height > 0
        && card.right > viewport.left && card.left < viewport.right
        && card.bottom > viewport.top && card.top < viewport.bottom;
      const next: HintGeometry = { width: viewport.width, height: viewport.height, target: null, arrow: null };
      if (visibleCard) {
        const x = Math.max(4, card.left - viewport.left - 6);
        const y = Math.max(4, card.top - viewport.top - 6);
        const right = Math.min(viewport.width - 4, card.right - viewport.left + 6);
        const bottom = Math.min(viewport.height - 4, card.bottom - viewport.top + 6);
        next.target = { x, y, width: right - x, height: bottom - y };
        const endX = Math.max(x + 12, Math.min(right - 12, card.left + card.width / 2 - viewport.left));
        const startY = text.bottom + 10 - viewport.top;
        const endY = y - 12;
        // Keep the sentence at the screen's centre; only the arrow follows the card.
        if (endY >= startY + 24) {
          const startX = text.left + text.width / 2 - viewport.left;
          const bendY = startY + (endY - startY) * .55;
          next.arrow = `M ${startX} ${startY} Q ${startX} ${bendY} ${endX} ${endY}`;
        } else {
          // A short phone can put the card beside the centred sentence. Route
          // around its side rather than dropping the arrow or drawing backwards.
          const toLeft = endX <= text.left + text.width / 2 - viewport.left;
          const sideX = (toLeft ? text.left - 10 : text.right + 10) - viewport.left;
          const sideY = text.top + text.height / 2 - viewport.top;
          const routeX = toLeft
            ? Math.max(10, Math.min(sideX - 28, endX - 22))
            : Math.min(viewport.width - 10, Math.max(sideX + 28, endX + 22));
          next.arrow = `M ${sideX} ${sideY} C ${routeX} ${sideY} ${routeX} ${endY - 24} ${endX} ${endY}`;
        }
      }
      setGeometry(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const scheduleMeasure = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(scheduleMeasure);
    const mutation = new MutationObserver(scheduleMeasure);
    mutation.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('scroll', scheduleMeasure, true);
    window.visualViewport?.addEventListener('resize', scheduleMeasure);
    window.visualViewport?.addEventListener('scroll', scheduleMeasure);

    // Open after the battle mounts, so its card and the initiating click are settled.
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!dialog.isConnected) return;
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (previousFocus === document.body || previousFocus === document.documentElement) previousFocus = null;
      if (ownsScrollLock) document.body.style.overflow = 'hidden';
      dialog.showModal();
      dialog.focus({ preventScroll: true });
      measure();
    });

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
      window.visualViewport?.removeEventListener('scroll', scheduleMeasure);
      dialog.close();
      if (ownsScrollLock) document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && !previousFocus.matches(':disabled')) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  const close = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    onClose();
  };

  return createPortal(<dialog ref={dialogRef} className="solo-opening-hint" tabIndex={-1}
    aria-labelledby={`${id}-title`} aria-describedby={`${id}-dismiss`}
    onPointerDown={event => event.stopPropagation()}
    onClick={event => { event.preventDefault(); event.stopPropagation(); close(); }}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
    onKeyDown={event => {
      event.stopPropagation();
      if (dismissKeys.includes(event.key)) event.preventDefault();
    }}
    onKeyUp={event => {
      event.stopPropagation();
      if (dismissKeys.includes(event.key)) {
        event.preventDefault();
        close();
      }
    }}>
    <svg className="solo-opening-hint-guide" viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <mask id={`${id}-spotlight`}>
          <rect width="100%" height="100%" fill="white" />
          {geometry.target && <rect {...geometry.target} rx="4" fill="black" />}
        </mask>
        <marker id={`${id}-arrow`} markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M 0 0 L 8 4.5 L 0 9" fill="none" stroke="#ffe4a6" strokeWidth="2" strokeLinecap="square" />
        </marker>
      </defs>
      <rect width="100%" height="100%" fill="#030911c7" mask={`url(#${id}-spotlight)`} />
      {geometry.target && <rect {...geometry.target} rx="4" className="solo-opening-hint-target" />}
      {geometry.arrow && <path d={geometry.arrow} className="solo-opening-hint-arrow" markerEnd={`url(#${id}-arrow)`} />}
    </svg>
    <div ref={panelRef} className="solo-opening-hint-copy">
      <h2 id={`${id}-title`}>{lang === 'zh' ? '先积攒能量' : 'Build up energy first'}</h2>
      <small id={`${id}-dismiss`}>{lang === 'zh' ? '点击任意位置继续' : 'Tap anywhere to continue'}</small>
    </div>
  </dialog>, document.body);
}
