import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Lang } from '../types';
import './SoloBattleMenu.css';

interface Props {
  lang: Lang;
  stageName: string;
  turn: number;
  onClose: () => void;
  onManual: () => void;
  onStory?: () => void;
  onRecap?: () => void;
  onLog: () => void;
}

/** Optional tools stay off the table until the player opens the menu. */
export default function SoloBattleMenu({ lang, stageName, turn, onClose, onManual, onStory, onRecap, onLog }: Props) {
  const zh = lang === 'zh';
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointer = useRef<number | null>(null);
  const backdropClickReady = useRef(false);
  const dismissed = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const ownsScrollLock = previousOverflow !== 'hidden';
    if (ownsScrollLock) document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    dialog.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (ownsScrollLock) document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && !previousFocus.matches(':disabled')) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  const close = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    onClose();
  };

  return createPortal(<dialog ref={dialogRef} className="solo-battle-menu" tabIndex={-1} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    }}
    onKeyUp={event => event.stopPropagation()}
    onClick={event => {
      event.stopPropagation();
      const closeFromBackdrop = backdropClickReady.current && event.target === event.currentTarget;
      backdropClickReady.current = false;
      if (closeFromBackdrop) { event.preventDefault(); close(); }
    }}
    onPointerDown={event => {
      event.stopPropagation();
      backdropClickReady.current = false;
      backdropPointer.current = event.target === event.currentTarget ? event.pointerId : null;
    }}
    onPointerUp={event => {
      event.stopPropagation();
      backdropClickReady.current = backdropPointer.current === event.pointerId && event.target === event.currentTarget;
      backdropPointer.current = null;
    }}
    onPointerCancel={() => { backdropPointer.current = null; backdropClickReady.current = false; }}>
    <section className="solo-battle-menu-panel">
      <header>
        <h2 id={titleId}>{zh ? '对局菜单' : 'Battle menu'}</h2>
        <p>{stageName}<span>{zh ? `第 ${turn} 回合` : `Turn ${turn}`}</span></p>
      </header>
      <nav className="solo-battle-menu-tools" aria-label={zh ? '对局工具' : 'Battle tools'}>
        {onStory && <button type="button" onClick={onStory}>{zh ? '剧情' : 'Story'}<span aria-hidden="true">›</span></button>}
        <button type="button" onClick={onManual}>{zh ? '招式手册' : 'Move guide'}<span aria-hidden="true">›</span></button>
        {onRecap && <button type="button" onClick={onRecap}>{zh ? '复盘' : 'Round recap'}<span aria-hidden="true">›</span></button>}
        <button type="button" onClick={onLog}>{zh ? '战报' : 'Battle log'}<span aria-hidden="true">›</span></button>
      </nav>
      <button type="button" className="solo-battle-menu-return" onClick={close}>{zh ? '返回对局' : 'Back to battle'}</button>
    </section>
  </dialog>, document.body);
}
