import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { BattleSpeed, Card, Lang } from '../types';
import { battleTimeMs, normalizeBattleSpeed } from '../logic/battleSpeed';
import { ORIGINAL_REWARD_REVEAL_MS } from '../data/battleTiming';
import { Flame } from './PixelIcons';
import RetroCard from './RetroCard';
import './RetroRewardReveal.css';

interface Props {
  card: Card;
  lang: Lang;
  onClose: () => void;
  reduceMotion?: boolean;
  speed?: BattleSpeed;
  appearance?: 'current' | 'retro';
}

/** This reveal only dismisses its presentation; the shared engine owns the reward. */
export default function RetroRewardReveal({ card, lang, onClose, reduceMotion = false, speed = 1, appearance = 'retro' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const id = useId();
  const zh = lang === 'zh';
  const [revealSpeed] = useState(() => normalizeBattleSpeed(speed));
  const [motionStopped, setMotionStopped] = useState(() => reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reduceMotion && !motionStopped) setMotionStopped(true);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = (event: MediaQueryListEvent) => { if (event.matches) setMotionStopped(true); };
    preference.addEventListener('change', stop);
    return () => preference.removeEventListener('change', stop);
  }, []);

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

  return createPortal(<dialog ref={dialogRef} className="retro-reward-reveal" data-reduced-motion={reduceMotion || motionStopped}
    data-appearance={appearance} data-battle-speed={revealSpeed} style={{
      '--revenge-reveal-duration': `${battleTimeMs(ORIGINAL_REWARD_REVEAL_MS, revealSpeed)}ms`,
      '--revenge-ember-duration': `${battleTimeMs(720, revealSpeed)}ms`,
    } as CSSProperties}
    aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onClick={close} onCancel={event => { event.preventDefault(); close(); }}>
    <header>
      <h2 id={`${id}-title`}>{zh ? '复仇时刻' : 'Revenge time'}</h2>
      <p id={`${id}-description`}>{zh ? '获得临时强力技能' : 'Temporary skill acquired'}</p>
    </header>
    <div className="retro-reward-reveal-stage">
      <div className="retro-reward-aura" aria-hidden="true" />
      <div className="retro-reward-embers" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{
        left: `${8 + index * 37 % 85}%`, top: `${65 + index * 11 % 28}%`,
        '--ember-x': `${(index % 2 ? 1 : -1) * (20 + index * 7 % 45)}px`,
        '--ember-delay': `${battleTimeMs(index % 7 * 30, revealSpeed)}ms`,
      } as CSSProperties} />)}</div>
      <div className="retro-reward-reveal-card">
        <div className="retro-reward-reveal-flipper">
          <div className="retro-reward-card-back" aria-hidden="true"><span><Flame size={56} /><b>?</b></span></div>
          <div className="retro-reward-card-front"><RetroCard card={card} lang={lang} tempCount={1} description /></div>
        </div>
      </div>
    </div>
    <button ref={closeRef} type="button">{zh ? '点击任意处领取' : 'Click anywhere to claim'}</button>
  </dialog>, document.body);
}
