import { useCallback, useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from 'react';
import type { Card, Lang, Player } from '../types';
import CardTooltip from './CardTooltip';

interface ActiveCard { id: string; anchor: HTMLButtonElement; source: 'hover' | 'keyboard' | 'touch'; scope: string }
interface Press { anchor: HTMLButtonElement; x: number; y: number }

/** Inspecting a card never changes selection or consumes a move. */
export function useCardTooltip({ cards, player, lang, appearance, enabled, scope }: {
  cards: Card[]; player?: Player; lang: Lang; appearance: 'current' | 'retro'; enabled: boolean; scope: string;
}) {
  const id = useId();
  const [active, setActive] = useState<ActiveCard | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);
  const pressTimer = useRef<number | undefined>(undefined);
  const press = useRef<Press | null>(null);
  const suppressClick = useRef<HTMLButtonElement | null>(null);
  const lastPointerType = useRef('mouse');
  const panel = useRef<HTMLDivElement>(null);
  const card = active && cards.find(candidate => candidate.id === active.id);
  const open = !!active && !!card && enabled && active.scope === scope;
  if (active && !open) setActive(null);

  const dismiss = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(pressTimer.current);
    press.current = null;
    setActive(null);
  }, []);

  useEffect(() => {
    const scroll = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      dismiss();
    };
    window.addEventListener('scroll', scroll, { capture: true, passive: true });
    window.addEventListener('resize', dismiss);
    window.visualViewport?.addEventListener('scroll', dismiss);
    window.visualViewport?.addEventListener('resize', dismiss);
    return () => {
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', dismiss);
      window.visualViewport?.removeEventListener('scroll', dismiss);
      window.visualViewport?.removeEventListener('resize', dismiss);
    };
  }, [dismiss]);

  useEffect(() => () => {
    window.clearTimeout(hoverTimer.current);
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(pressTimer.current);
    press.current = null;
  }, [enabled, scope]);

  useEffect(() => {
    if (!active) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !active.anchor.contains(event.target) && !panel.current?.contains(event.target)) dismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Escape closes this hint before it can cancel an underlying practice dialog.
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    };
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('keydown', escape, true);
    };
  }, [active, dismiss]);

  const show = (candidate: Card, anchor: HTMLButtonElement, source: ActiveCard['source']) => {
    window.clearTimeout(hoverTimer.current);
    window.clearTimeout(hideTimer.current);
    if (enabled && anchor.isConnected) setActive({ id: candidate.id, anchor, source, scope });
  };
  const hide = (cardId: string) => {
    window.clearTimeout(hoverTimer.current);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setActive(current => current?.id === cardId ? null : current), 140);
  };

  const bind = (candidate: Card): ButtonHTMLAttributes<HTMLButtonElement> => ({
    'aria-describedby': open && active?.id === candidate.id ? id : undefined,
    onPointerEnter: event => {
      if (!enabled || event.pointerType === 'touch' || event.buttons) return;
      const anchor = event.currentTarget;
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = window.setTimeout(() => show(candidate, anchor, 'hover'), 250);
    },
    onPointerLeave: event => {
      if (event.pointerType === 'touch') return;
      if (active?.source === 'keyboard' && document.activeElement === event.currentTarget) return;
      hide(candidate.id);
    },
    onFocus: event => {
      if (event.currentTarget.matches(':focus-visible')) show(candidate, event.currentTarget, 'keyboard');
    },
    onBlur: () => hide(candidate.id),
    onPointerDown: event => {
      lastPointerType.current = event.pointerType || 'mouse';
      suppressClick.current = null;
      window.clearTimeout(pressTimer.current);
      if (!enabled || event.pointerType === 'mouse' || !event.isPrimary) return;
      const anchor = event.currentTarget;
      press.current = { anchor, x: event.clientX, y: event.clientY };
      pressTimer.current = window.setTimeout(() => {
        if (press.current?.anchor !== anchor) return;
        suppressClick.current = anchor;
        show(candidate, anchor, 'touch');
      }, 500);
    },
    onPointerMove: event => {
      const current = press.current;
      if (current?.anchor === event.currentTarget && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 10) dismiss();
    },
    onPointerUp: () => {
      window.clearTimeout(pressTimer.current);
      press.current = null;
    },
    onPointerCancel: dismiss,
    onClickCapture: event => {
      if (suppressClick.current === event.currentTarget && event.detail !== 0) {
        suppressClick.current = null;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      suppressClick.current = null;
      dismiss();
    },
    onContextMenu: event => {
      if (press.current?.anchor === event.currentTarget || active?.source === 'touch' && active.anchor === event.currentTarget) event.preventDefault();
    },
  });

  const tooltip = open && active && card ? <CardTooltip id={id} card={card} anchor={active.anchor} lang={lang}
    appearance={appearance} player={player} panelRef={panel} onDismiss={dismiss}
    onPointerEnter={() => window.clearTimeout(hideTimer.current)} onPointerLeave={() => hide(card.id)} /> : null;
  const isRepeatedMouseClick = (event: { detail: number; nativeEvent: MouseEvent }) => {
    const pointerType = (event.nativeEvent as PointerEvent).pointerType || lastPointerType.current;
    // A suppressed long-press release can make the next genuine tap detail=2.
    // Keep rapid mouse double-click protection without dropping a new touch/pen tap.
    return event.detail > 1 && pointerType === 'mouse';
  };
  return { bind, tooltip, dismiss, isRepeatedMouseClick };
}
