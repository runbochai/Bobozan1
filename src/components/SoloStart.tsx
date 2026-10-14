import { acquireBodyScrollLock } from '../logic/bodyScrollLock';
import { useEffect, useId, useRef, type MouseEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Lang } from '../types';
import { assetUrl } from '../assets';
import { EXPEDITION_DIFFICULTIES, type ExpeditionDifficulty } from '../data/expeditionDifficulty';
import { Heart, X } from './PixelIcons';
import './SoloStart.css';

interface SoloStartProps {
  lang: Lang;
  difficulty: ExpeditionDifficulty;
  onDifficultyChange: (difficulty: ExpeditionDifficulty) => void;
  onStart: () => void;
  onClose: () => void;
  hasCheckpoint?: boolean;
}

const descriptions = {
  beginner: { zh: '多些余地，走完王冠之路。', en: 'More room to find your way to the crown.' },
  normal: { zh: '一次失手，就可能结束旅程。', en: 'One mistake can end your journey.' },
  endless: { zh: '对手越来越强，倒下也保留成长。', en: 'Rivals grow stronger. Keep your growth after defeat.' },
};

/** A short, optional choice before a new run. Existing progress is replaced only on Start. */
export default function SoloStart({ lang, difficulty, onDifficultyChange, onStart, onClose, hasCheckpoint = false }: SoloStartProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const outsidePointer = useRef(false);
  const closing = useRef(false);
  const titleId = useId();
  const noteId = useId();
  const radioName = useId();
  const zh = lang === 'zh';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (previousFocus === document.body || previousFocus === document.documentElement) previousFocus = null;
    const previousDialog = previousFocus?.closest('dialog') ??
      [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].filter(item => item !== dialog).at(-1) ?? null;
    const releaseScrollLock = acquireBodyScrollLock();
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('input:checked')?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      releaseScrollLock();
      if (previousFocus?.isConnected && !previousFocus.matches(':disabled')) {
        previousFocus.focus({ preventScroll: true });
      } else if (previousDialog?.isConnected && previousDialog.open) {
        previousDialog.querySelector<HTMLElement>('button:not(:disabled), [tabindex="-1"]')?.focus({ preventScroll: true });
      }
    };
  }, []);

  const isOutside = (event: PointerEvent<HTMLDialogElement> | MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return false;
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    onClose();
  };
  const start = () => {
    if (closing.current) return;
    closing.current = true;
    onStart();
  };

  return createPortal(<dialog ref={dialogRef} className="solo-start" aria-labelledby={titleId}
    aria-describedby={hasCheckpoint ? noteId : undefined}
    onKeyDown={event => event.stopPropagation()}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
    onPointerDown={event => { event.stopPropagation(); outsidePointer.current = isOutside(event); }}
    onPointerCancel={() => { outsidePointer.current = false; }}
    onClick={event => {
      event.stopPropagation();
      if (outsidePointer.current && isOutside(event)) close();
      outsidePointer.current = false;
    }}>
    <div className="solo-start-art" aria-hidden="true" style={{ backgroundImage: `url("${assetUrl('story/lantern-origin-v1/p20-first-duel.webp')}")` }} />
    <header className="solo-start-header">
      <div><span>{zh ? '王冠战争 · 单人' : 'CROWN WAR · SOLO'}</span><h1 id={titleId}>{zh ? '新的远征' : 'A new journey'}</h1></div>
      <button type="button" className="solo-start-close" onClick={close} aria-label={zh ? '关闭远征选择' : 'Close campaign selection'}><X size={18} /></button>
    </header>
    <fieldset className="solo-start-options">
      <legend>{zh ? '选择难度' : 'Choose difficulty'}</legend>
      {Object.values(EXPEDITION_DIFFICULTIES).map(option => <label key={option.id} className="solo-start-option" data-selected={difficulty === option.id} data-difficulty={option.id}>
        <input type="radio" name={radioName} value={option.id} checked={difficulty === option.id} onChange={() => onDifficultyChange(option.id)} />
        <span className="solo-start-option-copy"><strong>{option.label[lang]}</strong><span>{descriptions[option.id][lang]}</span>
          {option.id === 'normal' && <small>{zh ? `敌人伤害 +${option.enemyDamageBonus} · 金币 ×${option.goldMultiplier}` : `Enemy damage +${option.enemyDamageBonus} · Gold ×${option.goldMultiplier}`}</small>}</span>
        <span className="solo-start-hp" aria-label={zh ? `初始生命 ${option.startHp}` : `${option.startHp} starting HP`}><Heart size={16} /><b>{option.startHp}</b></span>
      </label>)}
    </fieldset>
    <footer className="solo-start-footer">
      {hasCheckpoint && <p id={noteId}>{zh ? '开始新的远征会替换本机的远征存档。' : 'Starting a new journey replaces the campaign save on this device.'}</p>}
      <button type="button" className="solo-start-play" onClick={start}>{zh ? '开始远征' : 'Start journey'}<span aria-hidden="true">→</span></button>
    </footer>
  </dialog>, document.body);
}
