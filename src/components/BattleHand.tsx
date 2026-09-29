import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Card, GameState, HandCategory, HandViewMode, Lang, Player } from '../types';
import { TEXT } from '../data/translations';
import { SKILL_DB } from '../data/skills';
import { SKILL_EFFECTS } from '../data/skillEffects';
import PixelCardArt from './PixelCardArt';
import SkillGlyph from './SkillGlyph';
import { ArrowLeft, CheckCircle, Ghost, Layers, Shield, Skull, Star, Swords, X, Zap } from './PixelIcons';
import './BattleHand.css';

const categories: HandCategory[] = ['CHARGE', 'ATTACK', 'DEFEND', 'ULTIMATE', 'SPECIAL'];
const categoryArt = { CHARGE: Zap, ATTACK: Swords, DEFEND: Shield, ULTIMATE: Skull, SPECIAL: Star };
const categoryCaption = {
  zh: { CHARGE: '积蓄能量', ATTACK: '近身 · 远程', DEFEND: '格挡 · 守护', ULTIMATE: '必杀 · 联合', SPECIAL: '身法 · 秘技' },
  en: { CHARGE: 'Gain energy', ATTACK: 'Strike', DEFEND: 'Guard', ULTIMATE: 'Unleash', SPECIAL: 'Adapt' },
};
const inCategory = (card: Card, category: HandCategory) => category === 'SPECIAL' ? card.type === 'SPECIAL' || card.type === 'ABSORB' : card.type === category;

function HandArt({ id }: { id: string }) {
  return <span className="hand-art" aria-hidden="true"><span className="hand-art-sigil" />
    <PixelCardArt key={id} id={id} />
    <span className="hand-art-sparks"><i /><i /><i /></span>
  </span>;
}

function CardDetails({ card, lang, freeCount, onClose }: { card: Card; lang: Lang; freeCount: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={ref} className="hand-detail-dialog" aria-labelledby="hand-detail-name" onCancel={e => { e.preventDefault(); onClose(); }}>
    <button className="hand-detail-close" type="button" onClick={onClose} aria-label={lang === 'zh' ? '关闭详情' : 'Close details'}><X size={22} /></button>
    <HandArt id={card.id} />
    <h2 id="hand-detail-name">{card.name[lang]}</h2>
    <p className="hand-detail-type">{TEXT[lang].skillType[card.type]} · <Zap size={16} /> {freeCount ? <><s>{card.cost}</s> 0 · {lang === 'zh' ? '免费' : 'Free'} ×{freeCount}</> : card.cost}</p>
    <p>{card.description[lang]}</p>
  </dialog>, document.body);
}

interface Props {
  player?: Player;
  knownCards: Card[];
  cards: Card[];
  lang: Lang;
  category: HandCategory;
  viewMode: HandViewMode;
  status: GameState['status'];
  submitting: boolean;
  tutorialHighlight?: string;
  tutorialCategory?: HandCategory | null;
  poppingFree: Record<string, boolean>;
  onCategory: (category: HandCategory) => void;
  onBack: () => void;
  onPlay: (id: string) => void;
}

/** Presentation only: the parent retains the game's card ordering and move submission. */
export default function BattleHand({ player, knownCards, cards, lang, category, viewMode, status, submitting, tutorialHighlight, tutorialCategory, poppingFree, onCategory, onBack, onPlay }: Props) {
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const keyboardCategory = useRef(false);
  const [scrollable, setScrollable] = useState({ left: false, right: false });
  const t = TEXT[lang];
  const locked = SKILL_DB.find(c => c.id === player?.selectedCardId);
  const canChoose = !!player && !player.isDead && !player.selectedCardId && !submitting && status === 'PLAYING';
  const inspected = viewMode === 'CARDS' ? cards.find(c => c.id === inspectedId) : undefined;
  const detail = knownCards.find(c => c.id === detailId);
  const isBlocked = (card: Card) => !canChoose || !!player?.disabledSkills?.includes(card.id) || (!player?.freeSkills?.includes(card.id) && (player?.energy ?? 0) < card.cost) || (!!tutorialHighlight && tutorialHighlight !== card.id);
  const play = (card?: Card) => { if (card && !isBlocked(card)) onPlay(card.id); };
  useEffect(() => {
    const tray = trayRef.current;
    if (!tray) return;
    const update = () => setScrollable({ left: tray.scrollLeft > 2, right: tray.scrollLeft + tray.clientWidth < tray.scrollWidth - 2 });
    const observer = new ResizeObserver(update);
    observer.observe(tray);
    tray.addEventListener('scroll', update, { passive: true });
    if (keyboardCategory.current) {
      tray.querySelector<HTMLElement>(viewMode === 'CATEGORIES' ? `[data-card-type="${category}"]` : '.hand-card')?.focus({ preventScroll: true });
      keyboardCategory.current = false;
    }
    return () => { observer.disconnect(); tray.removeEventListener('scroll', update); };
  }, [viewMode, category, cards.length, player?.selectedCardId, player?.isDead]);
  const scrollHand = (direction: number) => {
    const reduce = document.documentElement.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    trayRef.current?.scrollBy({ left: direction * trayRef.current.clientWidth * .8, behavior: reduce ? 'instant' : 'smooth' });
  };

  return <section className="pixel-hand-area battle-hand" aria-label={lang === 'zh' ? '手牌' : 'Your hand'} data-hand-state={status === 'SHOWDOWN' ? 'clash' : locked ? 'locked' : 'ready'}>
    <div className="hand-toolbar">
      {!player?.selectedCardId && !player?.isDead && (scrollable.left || scrollable.right) && <div className="hand-scroll-controls"><span className="hand-scroll-hint">{lang === 'zh' ? '滑动选牌' : 'Browse'}</span>
        <button type="button" aria-label={lang === 'zh' ? '向左浏览手牌' : 'Scroll hand left'} disabled={!scrollable.left} onClick={() => scrollHand(-1)}><ArrowLeft size={16} /></button>
        <button type="button" aria-label={lang === 'zh' ? '向右浏览手牌' : 'Scroll hand right'} disabled={!scrollable.right} onClick={() => scrollHand(1)}><ArrowLeft size={16} className="hand-arrow-right" /></button>
      </div>}
    </div>

    {!player || player.isDead ? <div className="hand-rest"><Ghost size={42} /><p>{t.dead}</p></div> : player.selectedCardId ? <div className="hand-committed">
      {locked && <div className="hand-locked-card" data-card-type={locked.type}><HandArt id={locked.id} /><strong>{locked.name[lang]}</strong></div>}
      <div className="hand-committed-copy"><CheckCircle size={26} /><strong>{status === 'SHOWDOWN' ? (lang === 'zh' ? '招式释放中' : 'CASTING') : (lang === 'zh' ? '已出牌，等待对手' : 'Locked in. Waiting…')}</strong><small>{lang === 'zh' ? '下一回合，再出新招' : 'Your hand returns next round'}</small></div>
    </div> : <>
      {viewMode === 'CARDS' && <nav className="hand-category-nav" aria-label={lang === 'zh' ? '招式分类' : 'Skill categories'}>
        <button type="button" className="pixel-hand-back" onClick={e => { keyboardCategory.current = e.detail === 0; setInspectedId(null); onBack(); }} aria-label={lang === 'zh' ? '返回全部分类' : 'Back to all categories'}><ArrowLeft size={18} /></button>
        {categories.map(cat => <button type="button" key={cat} className="hand-category-tab" data-card-type={cat} aria-current={category === cat ? 'true' : undefined}
          onClick={() => { setInspectedId(null); onCategory(cat); }}>{t.categories[cat]}</button>)}
      </nav>}

      <div ref={trayRef} key={`${viewMode}-${category}`} className={`pixel-hand-tray hand-fan ${viewMode === 'CATEGORIES' ? 'hand-category-fan' : 'hand-skill-fan'}`}>
        {viewMode === 'CATEGORIES' ? categories.map(cat => {
          const Icon = categoryArt[cat];
          const charge = knownCards.find(c => c.id === 'charge');
          const disabled = cat === 'CHARGE' && (!charge || isBlocked(charge));
          const highlighted = tutorialCategory === cat;
          const count = knownCards.filter(c => inCategory(c, cat)).length;
          return <div className="hand-category-slot" key={cat}>
            <button type="button" role="button" className={`hand-card hand-category-card ${highlighted ? 'tutorial-highlight' : ''}`} data-card-type={cat}
              data-tutorial-target={highlighted} aria-label={t.categories[cat]} aria-disabled={disabled} aria-describedby={tutorialHighlight ? 'tutorial-instruction' : undefined}
              onClick={e => { if (cat === 'CHARGE') play(charge); else { keyboardCategory.current = e.detail === 0; onCategory(cat); } }}>
              <span className="hand-card-eyebrow">{cat === 'CHARGE' ? <Zap size={15} /> : <Layers size={15} />}<span>{cat === 'CHARGE' ? (lang === 'zh' ? '积蓄' : 'ENERGY') : `${count} ${lang === 'zh' ? '招' : 'SKILLS'}`}</span></span>
              <span className="hand-category-icon" aria-hidden="true"><Icon size={56} /></span>
              <strong className="hand-card-name">{t.categories[cat]}</strong>
              <small className="hand-category-caption">{categoryCaption[lang][cat]}</small>
            </button>
          </div>;
        }) : cards.length === 0 ? <div className="hand-rest"><Layers size={38} /><p>{lang === 'zh' ? '还没有这一类招式' : 'No skills in this category yet'}</p></div> : cards.map(card => {
          const freeCount = player.freeSkills?.filter(id => id === card.id).length ?? 0;
          const tempCount = player.tempSkills?.filter(id => id === card.id).length ?? 0;
          const disabled = player.disabledSkills?.includes(card.id);
          const shortage = freeCount ? 0 : Math.max(0, card.cost - player.energy);
          const highlighted = tutorialHighlight === card.id;
          const blocked = isBlocked(card);
          const label = disabled ? (lang === 'zh' ? '已禁用' : 'Disabled') : shortage ? (lang === 'zh' ? `还需 ${shortage} 能量` : `Need ${shortage} energy`) : tutorialHighlight && !highlighted ? (lang === 'zh' ? '请跟随教学' : 'Follow the lesson') : freeCount ? `${lang === 'zh' ? '免费' : 'Free'} ×${freeCount}` : (lang === 'zh' ? '点击出招' : 'Play skill');
          return <div className="pixel-card-slot hand-skill-slot" key={card.id} onMouseEnter={() => setInspectedId(card.id)} onMouseLeave={() => setInspectedId(null)} onFocus={() => setInspectedId(card.id)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInspectedId(null); }}>
            <button type="button" role="button" className={`hand-card hand-skill-card ${highlighted ? 'tutorial-highlight' : ''}`} data-card-type={card.type} data-card-id={card.id}
              data-combo={!!card.tags?.includes('combo')} data-tutorial-target={highlighted} aria-disabled={blocked} aria-label={`${card.name[lang]} · ${label}`}
              aria-describedby={tutorialHighlight ? 'tutorial-instruction' : undefined} onClick={() => play(card)}>
              <span className="hand-cost"><Zap size={15} />{freeCount ? 0 : card.cost}</span>
              <span className="hand-card-rank">{card.tags?.includes('combo') ? (lang === 'zh' ? '联合' : 'COMBO') : card.levelRequired > 0 && card.levelRequired < 100 ? `Lv.${card.levelRequired}` : ''}</span>
              <HandArt id={card.id} />
              <strong className="hand-card-name">{card.name[lang]}</strong>
              <span className="hand-card-action" data-free-pop={!!poppingFree[card.id]}>{label}</span>
              {tempCount > 0 && <span className="hand-temp">{lang === 'zh' ? '限次' : 'Temp'} ×{tempCount}</span>}
            </button>
            <button className="hand-info" type="button" aria-label={`${lang === 'zh' ? '查看' : 'Details:'} ${card.name[lang]}${lang === 'zh' ? '详情' : ''}`} aria-haspopup="dialog" onClick={() => setDetailId(card.id)}>i</button>
          </div>;
        })}
      </div>
      {viewMode === 'CARDS' && <div className="hand-inspector">
        {inspected && <><SkillGlyph effect={SKILL_EFFECTS[inspected.id] ?? SKILL_EFFECTS.charge} /><div><strong>{inspected.name[lang]}</strong><span>{inspected.description[lang]}</span></div></>}
      </div>}
    </>}
    {detail && canChoose && <CardDetails card={detail} lang={lang} freeCount={player?.freeSkills?.filter(id => id === detail.id).length ?? 0} onClose={() => setDetailId(null)} />}
  </section>;
}
