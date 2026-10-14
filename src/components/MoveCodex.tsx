import { acquireBodyScrollLock } from '../logic/bodyScrollLock';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import type { Card, Lang } from '../types';
import { SKILL_DB } from '../data/skills';
import { TEXT } from '../data/translations';
import PixelCardArt from './PixelCardArt';
import { X, Zap } from './PixelIcons';
import './MoveCodex.css';

interface MoveCodexProps {
  lang: Lang;
  onClose: () => void;
  onExercises?: () => void;
}

const groups = ['ALL', 'BASE', 'ATTACK', 'DEFEND', 'ULTIMATE', 'SPECIAL'] as const;
type Group = typeof groups[number];
const labels = {
  ALL: { zh: '全部', en: 'All' }, BASE: { zh: '基础', en: 'Basics' },
  ATTACK: { zh: '攻击', en: 'Attack' }, DEFEND: { zh: '防守', en: 'Defense' },
  ULTIMATE: { zh: '终极', en: 'Ultimate' }, SPECIAL: { zh: '特殊', en: 'Special' },
};
const inGroup = (card: Card, group: Group) => group === 'ALL' || (group === 'BASE' ? card.levelRequired === 0
  : group === 'SPECIAL' ? card.type === 'SPECIAL' || card.type === 'ABSORB' : card.type === group);

/** An optional reference: selecting a print only inspects it and never plays a move. */
export default function MoveCodex({ lang, onClose, onExercises }: MoveCodexProps) {
  const zh = lang === 'zh';
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const backdropPressed = useRef(false);
  const closing = useRef(false);
  const [group, setGroup] = useState<Group>('BASE');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>('charge');
  const search = query.trim().toLocaleLowerCase();
  const cards = SKILL_DB.filter(card => inGroup(card, group) && (!search
    || `${card.name[lang]} ${card.description[lang]} ${card.name[lang === 'zh' ? 'en' : 'zh']}`.toLocaleLowerCase().includes(search)));
  const selected = cards.find(card => card.id === selectedId) ?? cards[0];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (previousFocus === document.body || previousFocus === document.documentElement) previousFocus = null;
    const previousDialog = previousFocus?.closest('dialog') ??
      [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].filter(item => item !== dialog).at(-1) ?? null;
    const releaseScrollLock = acquireBodyScrollLock();
    dialog.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      releaseScrollLock();
      if (previousFocus?.isConnected && !previousFocus.matches(':disabled')) previousFocus.focus({ preventScroll: true });
      else if (previousDialog?.isConnected && previousDialog.open) {
        previousDialog.querySelector<HTMLElement>('button:not(:disabled), [tabindex="-1"]')?.focus({ preventScroll: true });
      }
    };
  }, []);

  const close = (destination?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    onClose();
    if (destination) requestAnimationFrame(destination);
  };
  const outside = (x: number, y: number) => {
    const bounds = dialogRef.current?.getBoundingClientRect();
    return !!bounds && (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom);
  };
  const resetGallery = () => {
    setSelectedId(null);
    galleryRef.current?.scrollTo({ top: 0 });
  };

  return createPortal(<dialog ref={dialogRef} className="move-codex" aria-labelledby={`${id}-title`}
    onKeyDown={event => event.stopPropagation()}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
    onPointerDown={event => {
      event.stopPropagation();
      backdropPressed.current = event.target === event.currentTarget && outside(event.clientX, event.clientY);
    }}
    onPointerCancel={() => { backdropPressed.current = false; }}
    onClick={event => {
      event.stopPropagation();
      if (backdropPressed.current && event.target === event.currentTarget && outside(event.clientX, event.clientY)) close();
      backdropPressed.current = false;
    }}>
    <header className="move-codex-header">
      <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1}><span aria-hidden="true">◆</span>{zh ? '招式图鉴' : 'Move compendium'}</h2>
      <button type="button" className="move-codex-close" onClick={() => close()} aria-label={zh ? '关闭招式图鉴' : 'Close move compendium'}><X size={18} /></button>
    </header>

    <div className="move-codex-controls">
      <label className="move-codex-search" htmlFor={`${id}-search`}>
        <Search size={17} aria-hidden="true" />
        <span className="move-codex-sr-only">{zh ? '搜索招式名称或说明' : 'Search move names or descriptions'}</span>
        <input id={`${id}-search`} type="search" value={query} maxLength={160}
          placeholder={zh ? '搜索招式' : 'Find a move'} autoComplete="off" spellCheck={false}
          onChange={event => {
            setQuery(event.currentTarget.value);
            if (group === 'BASE') setGroup('ALL');
            resetGallery();
          }} />
      </label>
      <div className="move-codex-filters" role="group" aria-label={zh ? '招式分类' : 'Move categories'}>
        {groups.map(option => <button type="button" key={option} aria-pressed={group === option}
          onClick={() => { setGroup(option); resetGallery(); }}>{labels[option][lang]}</button>)}
      </div>
    </div>

    <div className="move-codex-content" data-empty={!selected}>
      <div className="move-codex-gallery" ref={galleryRef} role="group" aria-label={zh ? '招式列表' : 'Moves'}>
        {cards.length ? <div className="move-codex-grid">{cards.map(card => <button type="button" key={card.id}
          className="move-codex-card" data-kind={card.type} aria-pressed={selected?.id === card.id}
          aria-label={zh ? `${card.name.zh}，${card.cost} 能量` : `${card.name.en}, ${card.cost} energy`}
          onClick={() => setSelectedId(card.id)}>
          <span className="move-codex-print" aria-hidden="true"><PixelCardArt id={card.id} /></span>
          <strong>{card.name[lang]}</strong>
          <span className="move-codex-card-cost"><Zap size={12} />{card.cost}</span>
        </button>)}</div> : <div className="move-codex-empty">
          <p>{zh ? '没有找到这个招式' : 'No moves found'}</p>
          <button type="button" onClick={() => { setQuery(''); setGroup('ALL'); resetGallery(); }}>{zh ? '查看全部' : 'Show all moves'}</button>
        </div>}
      </div>

      {selected && <section className="move-codex-detail" aria-live="polite" aria-atomic="true" aria-labelledby={`${id}-move`}>
        <div className="move-codex-detail-art" aria-hidden="true"><PixelCardArt id={selected.id} /></div>
        <div className="move-codex-detail-copy">
          <span className="move-codex-kind">{TEXT[lang].skillType[selected.type]}{selected.tags?.includes('combo') ? ` · ${zh ? '联合技' : 'Combo'}` : selected.levelRequired > 0 ? ` · Lv.${selected.levelRequired}` : ''}</span>
          <h3 id={`${id}-move`}>{selected.name[lang]}</h3>
          <p className="move-codex-energy"><Zap size={15} />{selected.cost} {zh ? '能量' : 'energy'}</p>
          <p className="move-codex-description">{selected.description[lang]}</p>
        </div>
      </section>}
    </div>

    <footer className="move-codex-footer">
      <span aria-live="polite">{zh ? `${cards.length} 招` : `${cards.length} moves`}</span>
      {onExercises && <button type="button" onClick={() => close(onExercises)}>{zh ? '战斗演练' : 'Combat exercises'}<span aria-hidden="true">↗</span></button>}
    </footer>
  </dialog>, document.body);
}
