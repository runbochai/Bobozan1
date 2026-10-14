import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import type { Card, Lang } from '../types';
import { SKILL_DB } from '../data/skills';
import { TEXT } from '../data/translations';
import WoodcutCardFace from './WoodcutCardFace';
import { X, Zap } from './PixelIcons';
import './MoveManual.css';

interface MoveManualProps {
  lang: Lang;
  onClose: () => void;
  onExercises?: () => void;
}

const groups = ['BASE', 'ALL', 'ATTACK', 'DEFEND', 'ULTIMATE', 'SPECIAL'] as const;
type Group = typeof groups[number];
const labels = {
  BASE: { zh: '基础', en: 'Basics' }, ALL: { zh: '全部', en: 'All' },
  ATTACK: { zh: '攻击', en: 'Attack' }, DEFEND: { zh: '防守', en: 'Guard' },
  ULTIMATE: { zh: '终极', en: 'Ultimate' }, SPECIAL: { zh: '特殊', en: 'Special' },
};
const inGroup = (card: Card, group: Group) => group === 'ALL' || (group === 'BASE' ? card.levelRequired === 0
  : group === 'SPECIAL' ? card.type === 'SPECIAL' || card.type === 'ABSORB' : card.type === group);

/** Browsing a card only inspects it; the manual never submits a move. */
export default function MoveManual({ lang, onClose, onExercises }: MoveManualProps) {
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
    || `${card.name.zh} ${card.name.en} ${card.description[lang]}`.toLocaleLowerCase().includes(search)));
  const selected = cards.find(card => card.id === selectedId) ?? cards[0];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousFocus = focused === document.body || focused === document.documentElement ? null : focused;
    const previousDialog = previousFocus?.closest('dialog') ??
      [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].filter(item => item !== dialog).at(-1) ?? null;
    const bodyStyle = document.body.style;
    const previousOverflow = bodyStyle.getPropertyValue('overflow');
    const previousPriority = bodyStyle.getPropertyPriority('overflow');
    bodyStyle.setProperty('overflow', 'hidden');
    dialog.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      // Keep a pre-existing lock owned by the screen underneath this dialog.
      if (bodyStyle.getPropertyValue('overflow') === 'hidden') {
        if (previousOverflow) bodyStyle.setProperty('overflow', previousOverflow, previousPriority);
        else bodyStyle.removeProperty('overflow');
      }
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

  return createPortal(<dialog ref={dialogRef} className="move-manual" aria-labelledby={`${id}-title`}
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
    <header className="move-manual-header">
      <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1}>{zh ? '招式手册' : 'Move manual'}</h2>
      <button type="button" className="move-manual-close" onClick={() => close()} aria-label={zh ? '关闭招式手册' : 'Close move manual'}><X size={20} /></button>
    </header>

    <div className="move-manual-controls">
      <label className="move-manual-search" htmlFor={`${id}-search`}>
        <Search size={18} aria-hidden="true" />
        <span className="move-manual-sr-only">{zh ? '搜索招式名称或说明' : 'Search move names or descriptions'}</span>
        <input id={`${id}-search`} type="search" value={query} maxLength={160}
          placeholder={zh ? '找一招…' : 'Find a move…'} autoComplete="off" spellCheck={false}
          onChange={event => {
            setQuery(event.currentTarget.value);
            if (group === 'BASE') setGroup('ALL');
            resetGallery();
          }} />
      </label>
      <div className="move-manual-filters" role="group" aria-label={zh ? '招式分类' : 'Move categories'}>
        {groups.map(option => <button type="button" key={option} aria-pressed={group === option}
          onClick={() => { setGroup(option); resetGallery(); }}>{labels[option][lang]}</button>)}
      </div>
    </div>

    <div className="move-manual-content" data-empty={!selected}>
      <div className="move-manual-gallery" ref={galleryRef} role="group" aria-label={zh ? '招式列表' : 'Moves'}>
        {cards.length ? <div className="move-manual-grid">{cards.map(card => <button type="button" key={card.id}
          className="move-manual-card" aria-pressed={selected?.id === card.id} aria-controls={`${id}-detail`}
          aria-label={zh ? `${card.name.zh}，${card.cost} 能量` : `${card.name.en}, ${card.cost} energy`}
          onClick={() => setSelectedId(card.id)}>
          <span className="move-manual-print" aria-hidden="true"><WoodcutCardFace card={card} lang={lang} /></span>
          <span className="move-manual-card-caption"><strong>{card.name[lang]}</strong><span><Zap size={12} />{card.cost}</span></span>
        </button>)}</div> : <div className="move-manual-empty">
          <p>{zh ? '没找到这招' : 'No moves found'}</p>
          <button type="button" onClick={() => { setQuery(''); setGroup('ALL'); resetGallery(); }}>{zh ? '查看全部招式' : 'Show all moves'}</button>
        </div>}
      </div>

      {selected && <section className="move-manual-detail" id={`${id}-detail`} aria-live="polite" aria-atomic="true" aria-labelledby={`${id}-move`}>
        <div className="move-manual-detail-print" aria-hidden="true"><WoodcutCardFace card={selected} lang={lang} /></div>
        <div className="move-manual-detail-copy">
          <span className="move-manual-kind">{TEXT[lang].skillType[selected.type]}{selected.tags?.includes('combo') ? ` · ${zh ? '联合技' : 'Combo'}` : selected.levelRequired > 0 ? ` · Lv.${selected.levelRequired}` : ''}</span>
          <h3 id={`${id}-move`}>{selected.name[lang]}</h3>
          <p className="move-manual-energy"><Zap size={15} />{selected.cost} {zh ? '能量' : 'energy'}</p>
          <p className="move-manual-description">{selected.description[lang]}</p>
        </div>
      </section>}
    </div>

    <footer className="move-manual-footer">
      <span aria-live="polite">{zh ? `${cards.length} 招` : `${cards.length} moves`}</span>
      {onExercises && <button type="button" onClick={() => close(onExercises)}>{zh ? '深入练习' : 'More practice'}<span aria-hidden="true">↗</span></button>}
    </footer>
  </dialog>, document.body);
}
