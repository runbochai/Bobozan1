import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { assetUrl } from '../assets';
import { AVATAR_OPTIONS } from '../data/avatars';
import { battleCharacterAtlas } from '../data/battleCharacters';
import { characterTurnTo, wrapCharacterIndex } from '../logic/characterSelection';
import type { Lang } from '../types';
import CharacterPreview from './CharacterPreview';
import { ArrowLeft, CheckCircle, Swords, X } from './PixelIcons';
import './CharacterPicker.css';

interface CharacterPickerProps {
  avatar?: string;
  lang: Lang;
  appearance?: 'current' | 'retro';
  reduceMotion?: boolean;
  onSelect: (path: string) => void;
  onClose: () => void;
}

/** A presentation-only selection draft: cancelling never changes the player's character. */
export default function CharacterPicker({ avatar, lang, appearance = 'current', reduceMotion = false, onSelect, onClose }: CharacterPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const headingId = useId();
  const instructionsId = useId();
  const [rotation, setRotation] = useState(() => Math.max(0, AVATAR_OPTIONS.findIndex(option => avatar?.endsWith(option.path))));
  const [actionToken, setActionToken] = useState(0);
  const selectedIndex = wrapCharacterIndex(rotation, AVATAR_OPTIONS.length);
  const selected = AVATAR_OPTIONS[selectedIndex];
  const zh = lang === 'zh';

  useEffect(() => {
    const dialog = dialogRef.current;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    closeButtonRef.current?.focus({ preventScroll: true });
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      if (dialog?.open) dialog.close();
      document.body.style.overflow = oldOverflow;
      returnFocus?.focus({ preventScroll: true });
    };
  }, []);

  const turn = (direction: number) => setRotation(previous => previous + direction);
  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current = null;
    if (Math.abs(dx) >= 35 && Math.abs(dx) > Math.abs(dy)) {
      dragged.current = true;
      turn(dx < 0 ? 1 : -1);
    }
  };

  return createPortal(<dialog ref={dialogRef} className="character-picker" data-appearance={appearance} data-reduced-motion={reduceMotion}
    aria-labelledby={headingId} aria-describedby={instructionsId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}
    onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        turn(event.key === 'ArrowRight' ? 1 : -1);
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        setRotation(previous => characterTurnTo(event.key === 'Home' ? 0 : AVATAR_OPTIONS.length - 1, previous, AVATAR_OPTIONS.length));
      }
    }}>
    <header className="character-picker-header">
      <div><span className="character-picker-kicker">{zh ? '你的角色' : 'YOUR CHARACTER'}</span><h2 id={headingId}>{zh ? '选择人物' : 'Choose your character'}</h2></div>
      <button ref={closeButtonRef} className="character-picker-close" type="button" aria-label={zh ? '取消选择' : 'Cancel selection'} onClick={onClose}><X size={18} /></button>
    </header>

    <div className="character-wheel-stage" role="group" aria-label={zh ? '人物轮盘' : 'Character wheel'}
      onPointerDown={event => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
        dragged.current = false;
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerUp={finishDrag}
      onPointerCancel={() => { drag.current = null; }}
      onPointerLeave={event => {
        if (event.pointerType === 'mouse' && event.buttons === 1) finishDrag(event);
      }}>
      <div className="character-wheel-sky" aria-hidden="true" />
      <svg className="character-wheel-orbit" viewBox="0 0 800 360" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="400" cy="220" rx="344" ry="98" />
        <ellipse cx="400" cy="220" rx="314" ry="86" />
        <path d="M48 220h36m632 0h36M400 114v20m0 172v20" />
      </svg>
      <div className="character-wheel-pedestal" aria-hidden="true"><span /><span /><span /></div>
      {AVATAR_OPTIONS.map((option, index) => {
        const angle = (index - rotation) * Math.PI * 2 / AVATAR_OPTIONS.length;
        const depth = (Math.cos(angle) + 1) / 2;
        const active = index === selectedIndex;
        const style = {
          left: `${50 + Math.sin(angle) * 42}%`,
          top: `${43 + depth * 47}%`,
          zIndex: Math.round(depth * 20) + (active ? 2 : 0),
          '--character-scale': active ? 1 : .28 + depth * .42,
          '--character-opacity': active ? 1 : .23 + depth * .53,
        } as CSSProperties;
        return <button key={option.path} type="button" className="character-wheel-slot" style={style} data-active={active}
          tabIndex={active ? 0 : -1} aria-pressed={active} aria-label={`${option.name[lang]}${active ? (zh ? '，正在预览' : ', previewing') : ''}`}
          onClick={event => {
            if (dragged.current && event.detail !== 0) { dragged.current = false; return; }
            setRotation(previous => characterTurnTo(index, previous, AVATAR_OPTIONS.length));
          }}>
          <span className="character-wheel-ground" aria-hidden="true" />
          <span className="character-wheel-figure">
            {active ? <CharacterPreview avatar={option.path} name={option.name[lang]} lang={lang} active reduced={reduceMotion} actionToken={actionToken} />
              : <span className="character-wheel-static" aria-hidden="true"><img src={assetUrl(battleCharacterAtlas(option.path)!)} alt="" draggable={false} /></span>}
          </span>
          {active && <span className="character-wheel-marker" aria-hidden="true" />}
        </button>;
      })}
    </div>

    <div className="character-picker-navigation">
      <button className="character-picker-arrow" type="button" aria-label={zh ? '上一个人物' : 'Previous character'} onClick={() => turn(-1)}><ArrowLeft size={22} /></button>
      <div className="character-picker-caption" role="status" aria-live="polite" aria-atomic="true">
        <span className="character-picker-count" aria-hidden="true">{String(selectedIndex + 1).padStart(2, '0')} <span>/ {String(AVATAR_OPTIONS.length).padStart(2, '0')}</span></span>
        <h3>{selected.name[lang]}</h3>
      </div>
      <button className="character-picker-arrow character-picker-next" type="button" aria-label={zh ? '下一个人物' : 'Next character'} onClick={() => turn(1)}><ArrowLeft size={22} /></button>
    </div>
    <p className="character-picker-hint" id={instructionsId}>{zh ? '左右滑动，或用方向键切换' : 'Swipe or use the arrow keys to browse'}</p>
    <footer className="character-picker-actions">
      <button className="character-picker-preview" type="button" onClick={() => setActionToken(previous => previous + 1)}><Swords size={17} />{zh ? '展示动作' : 'Show move'}</button>
      <button className="character-picker-select" type="button" onClick={() => { onSelect(selected.path); onClose(); }}><CheckCircle size={18} />{zh ? '选用人物' : 'Choose character'}</button>
    </footer>
  </dialog>, document.body);
}
