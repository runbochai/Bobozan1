import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Card, GameState, HandCategory, HandViewMode, Lang, Player } from '../types';
import { TEXT } from '../data/translations';
import { SKILL_DB } from '../data/skills';
import { SKILL_EFFECTS } from '../data/skillEffects';
import { getHandCategory } from '../logic/skillLoadout';
import { isHoloCard } from '../data/cardFinish';
import { getEffectiveLevel, isOffensiveCard } from '../logic/combat';
import PixelCardArt from './PixelCardArt';
import SkillGlyph from './SkillGlyph';
import CardHolo from './CardHolo';
import UltimateAura from './UltimateAura';
import { ArrowLeft, CheckCircle, Ghost, Layers, Shield, Skull, Swords, X, Zap } from './PixelIcons';
import './BattleHand.css';

const categories = ['CHARGE', 'ATTACK', 'DEFEND', 'ULTIMATE'] as const;
const categoryArt = { CHARGE: Zap, ATTACK: Swords, DEFEND: Shield, ULTIMATE: Skull };
const categoryCaption = {
  zh: { CHARGE: '积蓄能量', ATTACK: '近身 · 远程', DEFEND: '格挡 · 身法', ULTIMATE: '必杀 · 联合' },
  en: { CHARGE: 'Gain energy', ATTACK: 'Strike', DEFEND: 'Guard · Adapt', ULTIMATE: 'Unleash' },
};

function HandArt({ id }: { id: string }) {
  return <span className="hand-art" aria-hidden="true"><span className="hand-art-sigil" />
    <PixelCardArt key={id} id={id} />
    <span className="hand-art-sparks"><i /><i /><i /></span>
  </span>;
}

function skillRankHint(card: Card, lang: Lang) {
  const level = getEffectiveLevel(card);
  const tier = isOffensiveCard(card) ? ` · ${lang === 'zh' ? '攻击档位' : 'Attack tier'} T${card.tier}` : '';
  return `${lang === 'zh' ? '技能等级' : 'Skill level'} Lv.${level}${tier}${card.tags?.includes('combo') ? ` · ${lang === 'zh' ? '联合' : 'Combo'}` : ''}${card.combatLevel !== undefined ? ` · ${lang === 'zh' ? '无尽成长' : 'Endless growth'}` : ''}`;
}

function CardDetails({ card, lang, freeCount, endless, onClose }: { card: Card; lang: Lang; freeCount: number; endless: boolean; onClose: () => void }) {
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
    <dl className="hand-detail-ranks">
      <div><dt>{lang === 'zh' ? '技能等级' : 'Skill level'}</dt><dd>Lv.{getEffectiveLevel(card)}{card.tags?.includes('combo') && <small>{lang === 'zh' ? '联合' : 'Combo'}</small>}{card.combatLevel !== undefined && <small>{lang === 'zh' ? '无尽成长' : 'Endless growth'}</small>}</dd></div>
      {isOffensiveCard(card) && <div><dt>{lang === 'zh' ? '攻击档位' : 'Attack tier'}</dt><dd>T{card.tier}</dd></div>}
    </dl>
    <p>{card.description[lang]}</p>
    <details className="hand-detail-rank-guide"><summary>{lang === 'zh' ? '等级与档位' : 'Levels and tiers'}</summary>
      <p>{card.combatLevel !== undefined ? (lang === 'zh' ? '无尽模式中，这张已保留的攻击随当前等级提升，用于同档比较。基础牌、联合技和临时吸收牌仍按原规则。等级与能量费用都不额外增加伤害。' : 'In Endless, this retained attack grows with your current level for same-tier comparisons. Basic cards, combos and temporary or absorbed skills keep their original rules. Neither level nor energy cost adds damage.') : endless ? (lang === 'zh' ? '这张牌保留原等级。无尽中只有永久保留的等级攻击随等级成长；基础牌、联合技和临时吸收牌不提升。能量费用不是伤害。' : 'This card keeps its original level. Only retained leveled attacks grow in Endless; basic cards, combos and temporary or absorbed skills do not. Energy cost is not damage.') : (lang === 'zh' ? '这里是这张牌自己的等级。角色升级解锁新招，不会让旧招变强；能量费用也不是伤害。' : 'This is the card’s own level. Character upgrades unlock new moves; they do not strengthen old moves. Energy cost is not damage.')}</p>
      {isOffensiveCard(card) && <p>{lang === 'zh' ? '对攻先比较档位，同档再按技能规则比较等级。轰轰、六克等招式有打平例外。' : 'Attack clashes compare tiers first, then apply level rules within a tier. Moves such as Double Blast and 6g have tie exceptions.'}</p>}
    </details>
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
  const handRef = useRef<HTMLElement>(null);
  const ultimateRef = useRef<HTMLButtonElement>(null);
  const keyboardCategory = useRef(false);
  const [scrollable, setScrollable] = useState({ left: false, right: false });
  const t = TEXT[lang];
  const locked = SKILL_DB.find(c => c.id === player?.selectedCardId);
  const canChoose = !!player && !player.isDead && !player.selectedCardId && !submitting && status === 'PLAYING';
  const inspected = viewMode === 'CARDS' ? cards.find(c => c.id === inspectedId) : undefined;
  const detail = knownCards.find(c => c.id === detailId);
  const isBlocked = (card: Card) => !canChoose || !!player?.disabledSkills?.includes(card.id) || (!player?.freeSkills?.includes(card.id) && (player?.energy ?? 0) < card.cost) || (!!tutorialHighlight && tutorialHighlight !== card.id);
  const ultimateReady = knownCards.some(card => getHandCategory(card) === 'ULTIMATE' && !isBlocked(card));
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

  return <section ref={handRef} className="pixel-hand-area battle-hand" aria-label={lang === 'zh' ? '手牌' : 'Your hand'} data-hand-state={status === 'SHOWDOWN' ? 'clash' : locked ? 'locked' : 'ready'}>
    <div className="hand-toolbar">
      {!player?.selectedCardId && !player?.isDead && (scrollable.left || scrollable.right) && <div className="hand-scroll-controls"><span className="hand-scroll-hint">{lang === 'zh' ? '滑动选牌' : 'Browse'}</span>
        <button type="button" aria-label={lang === 'zh' ? '向左浏览手牌' : 'Scroll hand left'} disabled={!scrollable.left} onClick={() => scrollHand(-1)}><ArrowLeft size={16} /></button>
        <button type="button" aria-label={lang === 'zh' ? '向右浏览手牌' : 'Scroll hand right'} disabled={!scrollable.right} onClick={() => scrollHand(1)}><ArrowLeft size={16} className="hand-arrow-right" /></button>
      </div>}
    </div>

    {!player || player.isDead ? <div className="hand-rest"><Ghost size={42} /><p>{t.dead}</p></div> : player.selectedCardId ? <div className="hand-committed">
      {locked && <div className="hand-locked-card" data-card-type={locked.type} data-card-id={locked.id} data-card-finish={isHoloCard(locked) ? 'gold-holo' : undefined}>
        {isHoloCard(locked) && <CardHolo />}<HandArt id={locked.id} /><strong>{locked.name[lang]}</strong></div>}
      <div className="hand-committed-copy"><CheckCircle size={26} /><strong>{status === 'SHOWDOWN' ? (lang === 'zh' ? '招式释放中' : 'CASTING') : (lang === 'zh' ? '已出牌，等待对手' : 'Locked in. Waiting…')}</strong><small>{lang === 'zh' ? '下一回合，再出新招' : 'Your hand returns next round'}</small></div>
    </div> : <>
      {viewMode === 'CARDS' && <nav className="hand-category-nav" aria-label={lang === 'zh' ? '招式分类' : 'Skill categories'}>
        <button type="button" className="pixel-hand-back" onClick={e => { keyboardCategory.current = e.detail === 0; setInspectedId(null); onBack(); }} aria-label={lang === 'zh' ? '返回全部分类' : 'Back to all categories'}><ArrowLeft size={18} /></button>
        {categories.map(cat => <button ref={cat === 'ULTIMATE' ? ultimateRef : undefined} type="button" key={cat} className="hand-category-tab" data-card-type={cat} aria-current={category === cat ? 'true' : undefined}
          data-ultimate-ready={cat === 'ULTIMATE' && ultimateReady || undefined}
          aria-label={cat === 'ULTIMATE' && ultimateReady ? `${t.categories[cat]} · ${lang === 'zh' ? '可以释放' : 'Ready to play'}` : undefined}
          onClick={() => { setInspectedId(null); onCategory(cat); }}>
          <span>{t.categories[cat]}</span>
        </button>)}
      </nav>}

      <div ref={trayRef} key={`${viewMode}-${category}`} className={`pixel-hand-tray hand-fan ${viewMode === 'CATEGORIES' ? 'hand-category-fan' : 'hand-skill-fan'}`}>
        {viewMode === 'CATEGORIES' ? categories.map(cat => {
          const Icon = categoryArt[cat];
          const charge = knownCards.find(c => c.id === 'charge');
          const disabled = cat === 'CHARGE' && (!charge || isBlocked(charge));
          const highlighted = tutorialCategory === cat;
          const count = knownCards.filter(c => getHandCategory(c) === cat).length;
          return <div className="hand-category-slot" key={cat}>
            <button ref={cat === 'ULTIMATE' ? ultimateRef : undefined} type="button" role="button" className={`hand-card hand-category-card ${highlighted ? 'tutorial-highlight' : ''}`} data-card-type={cat}
              data-tutorial-target={highlighted} data-ultimate-ready={cat === 'ULTIMATE' && ultimateReady || undefined}
              aria-label={`${t.categories[cat]}${cat === 'ULTIMATE' && ultimateReady ? ` · ${lang === 'zh' ? '可以释放' : 'Ready to play'}` : ''}`} aria-disabled={disabled} aria-describedby={tutorialHighlight ? 'tutorial-instruction' : undefined}
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
          // Cards here are already owned/available; include borrowed and combined skills too.
          const acquired = card.levelRequired > 0 || freeCount > 0 || tempCount > 0 || !!card.tags?.includes('combo');
          const holo = isHoloCard(card);
          const disabled = player.disabledSkills?.includes(card.id);
          const shortage = freeCount ? 0 : Math.max(0, card.cost - player.energy);
          const highlighted = tutorialHighlight === card.id;
          const blocked = isBlocked(card);
          const label = disabled ? (lang === 'zh' ? '已禁用' : 'Disabled') : shortage ? (lang === 'zh' ? `还需 ${shortage} 能量` : `Need ${shortage} energy`) : tutorialHighlight && !highlighted ? (lang === 'zh' ? '请跟随教学' : 'Follow the lesson') : freeCount ? `${lang === 'zh' ? '免费' : 'Free'} ×${freeCount}` : (lang === 'zh' ? '点击出招' : 'Play skill');
          return <div className="pixel-card-slot hand-skill-slot" key={card.id} onMouseEnter={() => setInspectedId(card.id)} onMouseLeave={() => setInspectedId(null)} onFocus={() => setInspectedId(card.id)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInspectedId(null); }}>
            <button type="button" role="button" className={`hand-card hand-skill-card ${highlighted ? 'tutorial-highlight' : ''}`} data-card-type={getHandCategory(card)} data-card-id={card.id} data-skill-type={card.type}
              data-combo={!!card.tags?.includes('combo')} data-card-finish={holo ? 'gold-holo' : undefined} data-acquired={acquired || undefined} data-tutorial-target={highlighted} aria-disabled={blocked} aria-label={`${card.name[lang]} · ${skillRankHint(card, lang)}${acquired ? ` · ${lang === 'zh' ? '获得技能' : 'Acquired skill'}` : ''} · ${label}`}
              aria-describedby={tutorialHighlight ? 'tutorial-instruction' : undefined} onClick={() => play(card)}>
              {holo && <CardHolo />}
              {acquired && !holo && <span className="hand-acquired-sparkles" aria-hidden="true"><i /><i /><i /></span>}
              <span className="hand-cost"><Zap size={15} />{freeCount ? 0 : card.cost}</span>
              <span className="hand-card-rank" data-combo-rank={!!card.tags?.includes('combo')} title={skillRankHint(card, lang)}>Lv.{getEffectiveLevel(card)}</span>
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
        {inspected && <><SkillGlyph effect={SKILL_EFFECTS[inspected.id] ?? SKILL_EFFECTS.charge} /><div><strong>{inspected.name[lang]}</strong><small className="hand-inspector-rank">Lv.{getEffectiveLevel(inspected)}{isOffensiveCard(inspected) ? ` · T${inspected.tier}` : ''}</small><span>{inspected.description[lang]}</span></div></>}
      </div>}
    </>}
    <UltimateAura anchor={ultimateRef} host={handRef} active={ultimateReady} layoutKey={`${viewMode}:${category}:${cards.length}:${lang}`} />
    {detail && canChoose && <CardDetails card={detail} lang={lang} freeCount={player?.freeSkills?.filter(id => id === detail.id).length ?? 0} endless={player?.endlessLevel !== undefined} onClose={() => setDetailId(null)} />}
  </section>;
}
