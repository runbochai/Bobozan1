import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import type { Card, Lang } from '../types';
import { SKILL_DB } from '../data/skills';
import { TEXT } from '../data/translations';
import WoodcutCardFace from './WoodcutCardFace';
import { RetroSkillIcon } from './RetroCard';
import { X, Zap } from './PixelIcons';
import './MoveManual.css';

interface MoveManualProps {
  appearance?: 'current' | 'retro';
  lang: Lang;
  onClose: () => void;
  onExercises?: () => void;
}

interface ManualSection { key: string; level: number | null; cards: Card[] }
const levelLabel = (level: number | null, zh: boolean) => level === null
  ? (zh ? '联合技' : 'Combinations')
  : level === 0 ? (zh ? '基础招式' : 'Basic moves')
    : zh ? `第 ${level} 级` : `Level ${level}`;
const levelOf = (card: Card) => card.tags?.includes('combo') ? null : card.levelRequired;
const catalogSections = [...new Set(SKILL_DB.filter(card => levelOf(card) !== null).map(card => card.levelRequired))]
  .sort((a, b) => a - b)
  .map<ManualSection>(level => ({ key: `level-${level}`, level, cards: SKILL_DB.filter(card => levelOf(card) === level) }));
const combinations = SKILL_DB.filter(card => levelOf(card) === null);
if (combinations.length) catalogSections.push({ key: 'combinations', level: null, cards: combinations });

/** Browsing a card only inspects it; the manual never submits a move. */
export default function MoveManual({ appearance = 'current', lang, onClose, onExercises }: MoveManualProps) {
  const zh = lang === 'zh';
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const backdropPressed = useRef(false);
  const closing = useRef(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>('charge');
  const search = query.trim().toLocaleLowerCase();
  const sections = catalogSections.map(section => ({ ...section, cards: section.cards.filter(card => !search
    || `${card.name.zh} ${card.name.en} ${card.description[lang]} ${levelLabel(section.level, zh)}`
      .toLocaleLowerCase().includes(search)) })).filter(section => section.cards.length > 0);
  const cards = sections.flatMap(section => section.cards);
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
  const jumpToSection = (key: string) => {
    const section = sections.find(item => item.key === key);
    const heading = document.getElementById(`${id}-${key}`);
    const gallery = galleryRef.current;
    if (!section || !heading || !gallery) return;
    setSelectedId(section.cards[0].id);
    gallery.scrollTo({ top: gallery.scrollTop + heading.getBoundingClientRect().top - gallery.getBoundingClientRect().top - 12 });
    heading.focus({ preventScroll: true });
  };

  return createPortal(<dialog ref={dialogRef} className={`move-manual${appearance === 'retro' ? ' retro-overlay move-manual-retro' : ''}`} aria-labelledby={`${id}-title`}
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
            resetGallery();
          }} />
      </label>
      <label className="move-manual-level-picker" htmlFor={`${id}-level`}>
        <span>{zh ? '按等级查看' : 'Browse levels'}</span>
        <select id={`${id}-level`} aria-label={zh ? '快速定位等级' : 'Jump to a level'} value="" disabled={!sections.length}
          onChange={event => jumpToSection(event.currentTarget.value)}>
          <option value="" disabled>{zh ? '跳到…' : 'Jump to…'}</option>
          {sections.map(section => <option key={section.key} value={section.key}>
            {levelLabel(section.level, zh)}{section.level === 0 ? (zh ? ' · 开局可用' : ' · Available at start') : ''}
            {section.level !== 0 ? ` · ${section.cards.map(card => card.name[lang]).join(zh ? '、' : ', ')}` : ''}
          </option>)}
        </select>
      </label>
    </div>

    <div className="move-manual-content" data-empty={!selected}>
      <div className="move-manual-gallery" ref={galleryRef} role="group" aria-label={zh ? '招式列表' : 'Moves'}>
        {cards.length ? sections.map(section => <section className="move-manual-level-section" key={section.key}
          data-level={section.level ?? 'combo'} aria-labelledby={`${id}-${section.key}`}>
          <div className="move-manual-level-heading">
            <h3 id={`${id}-${section.key}`} tabIndex={-1}>{levelLabel(section.level, zh)}</h3>
            <span>{section.level === 0 ? (zh ? '开局可用' : 'Available at start')
              : section.level === null ? (zh ? '集齐对应招式后可用' : 'Requires the matching moves')
                : zh ? `${section.cards.length} 招` : `${section.cards.length} moves`}</span>
          </div>
          <div className="move-manual-grid">{section.cards.map(card => <button type="button" key={card.id}
          className="move-manual-card" data-card-type={card.type} aria-pressed={selected?.id === card.id} aria-controls={`${id}-detail`}
          aria-label={zh ? `${levelLabel(section.level, zh)}，${card.name.zh}，${card.cost} 能量` : `${levelLabel(section.level, zh)}, ${card.name.en}, ${card.cost} energy`}
          onClick={() => setSelectedId(card.id)}>
          <span className="move-manual-print" aria-hidden="true">{appearance === 'retro' ? <RetroSkillIcon id={card.id} size={76} /> : <WoodcutCardFace card={card} lang={lang} />}</span>
          <span className="move-manual-card-caption"><strong>{card.name[lang]}</strong><span><Zap size={12} />{card.cost}</span></span>
        </button>)}</div></section>) : <div className="move-manual-empty">
          <p>{zh ? '没找到这招' : 'No moves found'}</p>
          <button type="button" onClick={() => { setQuery(''); resetGallery(); }}>{zh ? '查看全部招式' : 'Show all moves'}</button>
        </div>}
      </div>

      {selected && <section className="move-manual-detail" data-card-type={selected.type} id={`${id}-detail`} aria-live="polite" aria-atomic="true" aria-labelledby={`${id}-move`}>
        <div className="move-manual-detail-print" aria-hidden="true">{appearance === 'retro' ? <RetroSkillIcon id={selected.id} size={120} /> : <WoodcutCardFace card={selected} lang={lang} />}</div>
        <div className="move-manual-detail-copy">
          <span className="move-manual-detail-level">{levelLabel(levelOf(selected), zh)}{selected.levelRequired === 0 ? (zh ? ' · 开局可用' : ' · Available at start') : ''}</span>
          <span className="move-manual-kind">{TEXT[lang].skillType[selected.type]}</span>
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
