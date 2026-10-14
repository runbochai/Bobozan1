import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Card, Lang } from '../types';
import RetroCard from './RetroCard';
import './RetroRewardReveal.css';

interface Props {
  card: Card;
  lang: Lang;
  onClose: () => void;
  reduceMotion?: boolean;
}

/** This reveal only dismisses its presentation; the shared engine owns the reward. */
export default function RetroRewardReveal({ card, lang, onClose, reduceMotion = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const id = useId();
  const zh = lang === 'zh';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousDialog = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1);
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (previous?.isConnected && previous !== document.body && !previous.matches(':disabled')) previous.focus({ preventScroll: true });
      else if (previousDialog?.isConnected && previousDialog.open) previousDialog.querySelector<HTMLElement>('button:not(:disabled), [tabindex="-1"]')?.focus({ preventScroll: true });
    };
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    onClose();
  };

  return createPortal(<dialog ref={dialogRef} className="retro-reward-reveal" data-reduced-motion={reduceMotion}
    aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onClick={close} onCancel={event => { event.preventDefault(); close(); }}>
    <header>
      <h2 id={`${id}-title`}>{zh ? '复仇时刻' : 'Revenge time'}</h2>
      <p id={`${id}-description`}>{zh ? '获得临时强力技能' : 'Temporary skill acquired'}</p>
    </header>
    <div className="retro-reward-reveal-card"><RetroCard card={card} lang={lang} tempCount={1} description /></div>
    <button ref={closeRef} type="button">{zh ? '点击任意处领取' : 'Click anywhere to claim'}</button>
  </dialog>, document.body);
}
