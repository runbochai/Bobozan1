import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Card, GameState, HandCategory, HandViewMode, Lang, Player } from '../types';
import { TEXT } from '../data/translations';
import { getHandCategory, sortHandCards } from '../logic/skillLoadout';
import { isHoloCard } from '../data/cardFinish';
import { getEffectiveLevel, getPlayerCard, isOffensiveCard } from '../logic/combat';
import WoodcutCardFace from './WoodcutCardFace';
import CardHolo from './CardHolo';
import UltimateAura from './UltimateAura';
import { useEdgeScroll } from './useEdgeScroll';
import { useCardTooltip } from './useCardTooltip';
import { ArrowLeft, CheckCircle, Ghost, Layers } from './PixelIcons';
import './BattleHand.css';
import './CardFan.css';
import './WoodcutCard.css';
import './SoloHand.css';

const categories = ['CHARGE', 'ATTACK', 'DEFEND', 'ULTIMATE'] as const;
const categoryFinish = { CHARGE: 'gilded', ATTACK: 'copper', DEFEND: 'frost', ULTIMATE: 'amethyst' } as const;
const quickKeys = ['charge', 'hong', 'defend'];

function fanPosition(index: number, count: number): CSSProperties {
  const position = count < 2 ? 0 : (index / (count - 1) - .5) * 2;
  return {
    '--fan-angle': `${position * 7}deg`,
    '--fan-offset': `${Math.pow(Math.abs(position), 1.7) * 12 - 6}px`,
    '--fan-spread': `${position * 4}px`,
    '--fan-order': index + 1,
  } as CSSProperties;
}

function UltimateFolderFinish() {
  return <span className="hand-ultimate-finish" aria-hidden="true">
    <span className="hand-ultimate-facets" />
    <span className="hand-ultimate-sheen" />
    <span className="hand-ultimate-glints"><i /><i /><i /></span>
  </span>;
}

function FolderFinish({ category }: { category: HandCategory }) {
  if (category === 'ULTIMATE') return <UltimateFolderFinish />;
  return <span className="hand-folder-finish" aria-hidden="true">
    <span className="hand-folder-facets" />
    <span className="hand-folder-sheen" />
    <span className="hand-folder-motif"><i /><i /><i /></span>
  </span>;
}

function skillRankHint(card: Card, lang: Lang) {
  const level = getEffectiveLevel(card);
  const tier = isOffensiveCard(card) ? ` · ${lang === 'zh' ? '攻击档位' : 'Attack tier'} T${card.tier}` : '';
  return `${lang === 'zh' ? '技能等级' : 'Skill level'} Lv.${level}${tier}${card.tags?.includes('combo') ? ` · ${lang === 'zh' ? '联合' : 'Combo'}` : ''}${card.combatLevel !== undefined ? ` · ${lang === 'zh' ? '无尽成长' : 'Endless growth'}` : ''}`;
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
  quickPlay?: boolean;
  folders?: boolean;
  tutorialHighlight?: string;
  tutorialCategory?: HandCategory | null;
  poppingFree: Record<string, boolean>;
  onCategory: (category: HandCategory) => void;
  onBack: () => void;
  onPlay: (id: string) => void;
}

/** Presentation only: the parent retains the game's card ordering and move submission. */
export default function BattleHand({ player, knownCards, cards, lang, category, viewMode, status, submitting, quickPlay = false, folders = false, tutorialHighlight, tutorialCategory, poppingFree, onCategory, onBack, onPlay }: Props) {
  const trayRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLElement>(null);
  const keyboardCategory = useRef(false);
  const [scrollable, setScrollable] = useState({ left: false, right: false });
  const t = TEXT[lang];
  const locked = player ? getPlayerCard(player, player.selectedCardId) : undefined;
  const canChoose = !!player && !player.isDead && !player.selectedCardId && !submitting && status === 'PLAYING';
  const quickHand = quickPlay && !tutorialHighlight && !tutorialCategory;
  const quickFolders = quickHand && folders;
  const showFolders = !quickHand || quickFolders;
  const categoryView = showFolders && viewMode === 'CATEGORIES';
  // Keep common moves in the same place while earned, borrowed and combined moves follow.
  const visibleCards = quickHand && !quickFolders ? [
    ...quickKeys.flatMap(id => knownCards.filter(card => card.id === id)),
    ...(player ? sortHandCards(player, knownCards) : knownCards).filter(card => !quickKeys.includes(card.id)),
  ] : cards;
  const { bind, tooltip, dismiss, isRepeatedMouseClick } = useCardTooltip({ cards: knownCards, player, lang, appearance: 'current', enabled: canChoose,
    scope: `${viewMode}:${category}:${quickHand}:${quickFolders}:${tutorialHighlight ?? ''}:${tutorialCategory ?? ''}` });
  const isBlocked = (card: Card) => !canChoose || !!player?.disabledSkills?.includes(card.id) || (!player?.freeSkills?.includes(card.id) && (player?.energy ?? 0) < card.cost) || (!!tutorialHighlight && tutorialHighlight !== card.id);
  const ultimateReady = knownCards.some(card => getHandCategory(card) === 'ULTIMATE' && !isBlocked(card));
  const play = (card?: Card) => { if (card && !isBlocked(card)) { dismiss(); onPlay(card.id); } };
  useEdgeScroll(trayRef, quickHand && canChoose);
  useEffect(() => {
    if (!quickHand || !canChoose) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || document.hidden
        || document.querySelector('dialog:modal')) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const id = quickKeys[Number(event.key) - 1];
      const card = knownCards.find(candidate => candidate.id === id);
      if (!card) return;
      event.preventDefault();
      if (!player?.disabledSkills?.includes(card.id)
        && (player?.freeSkills?.includes(card.id) || (player?.energy ?? 0) >= card.cost)) { dismiss(); onPlay(card.id); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [quickHand, canChoose, knownCards, player, onPlay, dismiss]);
  useEffect(() => {
    const tray = trayRef.current;
    if (!tray) return;
    const update = () => setScrollable({ left: tray.scrollLeft > 2, right: tray.scrollLeft + tray.clientWidth < tray.scrollWidth - 2 });
    const observer = new ResizeObserver(update);
    observer.observe(tray);
    tray.addEventListener('scroll', update, { passive: true });
    if (showFolders && keyboardCategory.current) {
      tray.querySelector<HTMLElement>(viewMode === 'CATEGORIES' ? `[data-card-type="${category}"]` : '.hand-card')?.focus({ preventScroll: true });
      keyboardCategory.current = false;
    }
    return () => { observer.disconnect(); tray.removeEventListener('scroll', update); };
  }, [showFolders, viewMode, category, visibleCards.length, player?.selectedCardId, player?.isDead]);
  const scrollHand = (direction: number) => {
    const reduce = document.documentElement.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    trayRef.current?.scrollBy({ left: direction * trayRef.current.clientWidth * .8, behavior: reduce ? 'instant' : 'smooth' });
  };

  return <section ref={handRef} className={`pixel-hand-area battle-hand${quickHand ? ' solo-quick-hand' : ''}${quickFolders ? ' solo-folder-hand' : ''}`} aria-label={lang === 'zh' ? '手牌' : 'Your hand'} aria-busy={quickHand && !canChoose && !player?.isDead || undefined} data-hand-state={status === 'SHOWDOWN' ? 'clash' : locked ? 'locked' : 'ready'}>
    <div className="hand-toolbar">
      {!player?.isDead && (quickHand || !player?.selectedCardId && (scrollable.left || scrollable.right)) && <div className="hand-scroll-controls"><span className="hand-scroll-hint">{lang === 'zh' ? '滑动选牌' : 'Browse'}</span>
        <button type="button" aria-label={lang === 'zh' ? '向左浏览手牌' : 'Scroll hand left'} disabled={!scrollable.left} onClick={() => scrollHand(-1)}><ArrowLeft size={16} /></button>
        <button type="button" aria-label={lang === 'zh' ? '向右浏览手牌' : 'Scroll hand right'} disabled={!scrollable.right} onClick={() => scrollHand(1)}><ArrowLeft size={16} className="hand-arrow-right" /></button>
      </div>}
    </div>

    {!player || player.isDead ? <div className="hand-rest"><Ghost size={42} /><p>{t.dead}</p></div> : player.selectedCardId && !quickHand ? <div className="hand-committed">
      {locked && <div className="hand-locked-card" data-card-type={locked.type} data-card-id={locked.id} data-card-finish={isHoloCard(locked) ? 'gold-holo' : undefined}>
        {isHoloCard(locked) && <CardHolo />}<WoodcutCardFace card={locked} lang={lang} free={player.freeSkills?.includes(locked.id)}
          freeCount={player.freeSkills?.filter(id => id === locked.id).length} tempCount={player.tempSkills?.filter(id => id === locked.id).length} /></div>}
      <div className="hand-committed-copy"><CheckCircle size={26} /><strong>{status === 'SHOWDOWN' ? (lang === 'zh' ? '招式释放中' : 'CASTING') : (lang === 'zh' ? '已出牌，等待对手' : 'Locked in. Waiting…')}</strong><small>{lang === 'zh' ? '下一回合，再出新招' : 'Your hand returns next round'}</small></div>
    </div> : <>
      {showFolders && viewMode === 'CARDS' && <nav className="hand-category-nav" aria-label={lang === 'zh' ? '招式分类' : 'Skill categories'}>
        <button type="button" className="pixel-hand-back" onClick={e => { keyboardCategory.current = e.detail === 0; onBack(); }} aria-label={lang === 'zh' ? '返回全部分类' : 'Back to all categories'}><ArrowLeft size={18} /></button>
        {categories.map(cat => <button type="button" key={cat} className="hand-category-tab" data-card-type={cat} aria-current={category === cat ? 'true' : undefined}
          data-folder-finish={categoryFinish[cat]}
          data-ultimate-finish={cat === 'ULTIMATE' ? 'amethyst' : undefined}
          data-ultimate-ready={cat === 'ULTIMATE' && ultimateReady || undefined}
          aria-label={cat === 'ULTIMATE' && ultimateReady ? `${t.categories[cat]} · ${lang === 'zh' ? '可以释放' : 'Ready to play'}` : undefined}
          onClick={() => onCategory(cat)}>
          <FolderFinish category={cat} />
          <span>{t.categories[cat]}</span>
        </button>)}
      </nav>}

      <div ref={trayRef} key={quickHand ? 'quick-play' : `${viewMode}-${category}`} className={`pixel-hand-tray${quickHand ? ' solo-quick-tray' : ''}${showFolders ? ` hand-fan ${categoryView ? 'hand-category-fan' : 'hand-skill-fan'}` : ''}`}>
        {categoryView ? categories.map((cat, index) => {

          const charge = knownCards.find(c => c.id === 'charge');
          const disabled = cat === 'CHARGE' && (!charge || isBlocked(charge)) || quickHand && !canChoose;
          const highlighted = tutorialCategory === cat;
          const tooltipProps = cat === 'CHARGE' && charge ? bind(charge) : undefined;
          const describedBy = [tooltipProps?.['aria-describedby'], tutorialHighlight ? 'tutorial-instruction' : undefined].filter(Boolean).join(' ') || undefined;
          return <div className="hand-category-slot" key={cat} style={fanPosition(index, categories.length)}>
            <div className="hand-card-lift">
            <button {...tooltipProps} type="button" role="button" className={`hand-card hand-category-card ${highlighted ? 'tutorial-highlight' : ''}`} data-card-type={cat}
              data-card-id={cat === 'CHARGE' ? 'charge' : undefined} data-selected={quickHand && cat === 'CHARGE' && player.selectedCardId === 'charge' || undefined}
              data-folder-finish={categoryFinish[cat]}
              data-ultimate-finish={cat === 'ULTIMATE' ? 'amethyst' : undefined}
              data-tutorial-target={highlighted} data-ultimate-ready={cat === 'ULTIMATE' && ultimateReady || undefined}
              aria-label={`${t.categories[cat]}${cat === 'ULTIMATE' && ultimateReady ? ` · ${lang === 'zh' ? '可以释放' : 'Ready to play'}` : ''}`} aria-disabled={disabled} aria-keyshortcuts={quickHand && cat === 'CHARGE' ? '1' : undefined} aria-describedby={describedBy}
              onClick={e => { if (quickHand && (!canChoose || isRepeatedMouseClick(e))) return; if (cat === 'CHARGE') play(charge); else { keyboardCategory.current = e.detail === 0; onCategory(cat); } }}>
              <FolderFinish category={cat} />
              <WoodcutCardFace folder={cat} lang={lang} />
            </button>
            </div>
          </div>;
        }) : visibleCards.length === 0 ? <div className="hand-rest"><Layers size={38} /><p>{lang === 'zh' ? '还没有这一类招式' : 'No skills in this category yet'}</p></div> : visibleCards.map((card, index) => {
          const freeCount = player.freeSkills?.filter(id => id === card.id).length ?? 0;
          const tempCount = player.tempSkills?.filter(id => id === card.id).length ?? 0;
          // Cards here are already owned/available; include borrowed and combined skills too.
          const acquired = card.levelRequired > 0 || freeCount > 0 || tempCount > 0 || !!card.tags?.includes('combo');
          const holo = isHoloCard(card);
          const disabled = player.disabledSkills?.includes(card.id);
          const shortage = freeCount ? 0 : Math.max(0, card.cost - player.energy);
          const highlighted = tutorialHighlight === card.id;
          const blocked = isBlocked(card);
          const label = disabled ? (lang === 'zh' ? '已禁用' : 'Disabled') : shortage ? (lang === 'zh' ? `还需 ${shortage} 能量` : `Need ${shortage} energy`) : tutorialHighlight && !highlighted ? (lang === 'zh' ? '请跟随教学' : 'Follow the lesson') : freeCount ? `${lang === 'zh' ? '免费' : 'Free'} ×${freeCount}` : quickHand && !canChoose ? '' : (lang === 'zh' ? '点击出牌' : 'Play card');
          const shortcut = quickHand ? quickKeys.indexOf(card.id) + 1 : 0;
          const tooltipProps = bind(card);
          const describedBy = [tooltipProps['aria-describedby'], tutorialHighlight ? 'tutorial-instruction' : undefined].filter(Boolean).join(' ') || undefined;
          return <div className="pixel-card-slot hand-skill-slot" key={card.id} style={showFolders ? fanPosition(index, visibleCards.length) : undefined}>
            <div className="hand-card-lift">
            <button {...tooltipProps} type="button" role="button" className={`hand-card hand-skill-card ${highlighted ? 'tutorial-highlight' : ''}`} data-card-type={getHandCategory(card)} data-card-id={card.id} data-skill-type={card.type}
              data-combo={!!card.tags?.includes('combo')} data-card-finish={holo ? 'gold-holo' : undefined} data-acquired={acquired || undefined} data-tutorial-target={highlighted} data-selected={quickHand && player.selectedCardId === card.id || undefined} aria-disabled={blocked} aria-keyshortcuts={shortcut ? String(shortcut) : undefined} aria-label={`${card.name[lang]} · ${lang === 'zh' ? '费用' : 'Cost'} ${freeCount ? 0 : card.cost} · ${skillRankHint(card, lang)}${acquired ? ` · ${lang === 'zh' ? '获得技能' : 'Acquired skill'}` : ''} · ${label}`}
              aria-describedby={describedBy} onClick={event => { if (!quickHand || !isRepeatedMouseClick(event)) play(card); }}>
              {holo && <CardHolo />}
              {acquired && !holo && <span className="hand-acquired-sparkles" aria-hidden="true"><i /><i /><i /></span>}
              <WoodcutCardFace card={card} lang={lang} free={freeCount > 0} freeCount={freeCount} tempCount={tempCount} />
              <span className="hand-card-action" data-free-pop={!!poppingFree[card.id]}>{blocked ? label : ''}</span>
            </button>
            </div>
            {!!shortcut && <kbd className="solo-quick-key" aria-hidden="true">{shortcut}</kbd>}
          </div>;
        })}
      </div>
    </>}
    {categoryView && <UltimateAura selector='.hand-category-card[data-card-type="ULTIMATE"]' host={handRef} active={ultimateReady}
      layoutKey={lang} face={<WoodcutCardFace folder="ULTIMATE" lang={lang} />} />}
    {!categoryView && visibleCards.filter(card => card.type === 'ULTIMATE').map(card => <UltimateAura key={card.id}
      selector={'.hand-skill-card[data-card-id="' + card.id + '"]'} host={handRef} active={!isBlocked(card)} holo={isHoloCard(card)}
      layoutKey={(quickHand && !quickFolders ? 'quick-play' : category) + ':' + visibleCards.length + ':' + lang} face={<WoodcutCardFace card={card} lang={lang} free={player?.freeSkills?.includes(card.id)}
        freeCount={player?.freeSkills?.filter(id => id === card.id).length} tempCount={player?.tempSkills?.filter(id => id === card.id).length} />} />)}
    {tooltip}
  </section>;
}
