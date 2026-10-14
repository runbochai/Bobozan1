import { useLayoutEffect, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { Card, Lang, Player } from '../types';
import { getEffectiveLevel, isOffensiveCard } from '../logic/combat';
import { TEXT } from '../data/translations';
import './CardTooltip.css';

export default function CardTooltip({ id, card, anchor, lang, appearance, player, panelRef, onDismiss, onPointerEnter, onPointerLeave }: {
  id: string; card: Card; anchor: HTMLButtonElement; lang: Lang; appearance: 'current' | 'retro'; player?: Player;
  panelRef: RefObject<HTMLDivElement | null>; onDismiss: () => void; onPointerEnter: () => void; onPointerLeave: () => void;
}) {
  const zh = lang === 'zh';
  const freeCount = player?.freeSkills?.filter(value => value === card.id).length ?? 0;
  const tempCount = player?.tempSkills?.filter(value => value === card.id).length ?? 0;
  const shortage = freeCount ? 0 : Math.max(0, card.cost - (player?.energy ?? card.cost));
  const offensive = isOffensiveCard(card);

  useLayoutEffect(() => {
    let frame: number;
    const position = () => {
      const panel = panelRef.current;
      if (!panel || !anchor.isConnected) { onDismiss(); return; }
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 10;
      const topEdge = (viewport?.offsetTop ?? 0) + 10;
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 20;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 20;
      const target = anchor.getBoundingClientRect();
      const hand = anchor.closest('.battle-hand, .retro-hand, .local-practice-hand');
      const toolbar = hand?.querySelector('.hand-category-nav, .retro-hand-nav, .local-practice-hand-heading')
        ?? hand?.querySelector('.hand-toolbar');
      const toolbarBounds = toolbar?.getBoundingClientRect();
      // Keep the nearby back/category controls outside the hoverable panel.
      const upperAnchor = toolbarBounds?.height ? Math.min(target.top, toolbarBounds.top) : target.top;
      const above = upperAnchor - topEdge - 8;
      const below = bottomEdge - target.bottom - 8;
      panel.style.maxWidth = `${Math.max(0, rightEdge - leftEdge)}px`;
      panel.style.maxHeight = `${Math.max(0, Math.min(420, bottomEdge - topEdge, Math.max(100, above, below)))}px`;
      const bounds = panel.getBoundingClientRect();
      const left = Math.max(leftEdge, Math.min(target.left + target.width / 2 - bounds.width / 2, rightEdge - bounds.width));
      const top = Math.max(topEdge, Math.min(above >= bounds.height ? upperAnchor - 8 - bounds.height : target.bottom + 8, bottomEdge - bounds.height));
      panel.style.left = `${Math.round(left)}px`;
      panel.style.top = `${Math.round(top)}px`;
      panel.style.visibility = 'visible';
      // Follow the existing card lift/fan animation without moving the hand's layout.
      frame = window.requestAnimationFrame(position);
    };
    position();
    return () => window.cancelAnimationFrame(frame);
  }, [anchor, panelRef, onDismiss]);

  return createPortal(<div ref={panelRef} id={id} className="card-hover-tooltip" data-appearance={appearance}
    data-card-id={card.id} role="tooltip" onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
    <header><strong>{card.name[lang]}</strong><span>{TEXT[lang].skillType[card.type]}</span></header>
    <dl>
      <div><dt>{zh ? '费用' : 'Cost'}</dt><dd>{freeCount ? <><s>{card.cost}</s> 0 · {zh ? '免费' : 'Free'} ×{freeCount}</> : card.cost}</dd></div>
      <div><dt>{zh ? '技能等级' : 'Skill level'}</dt><dd>Lv.{getEffectiveLevel(card)}{card.tags?.includes('combo') && ` · ${zh ? '联合' : 'Combo'}`}</dd></div>
      {offensive && <div><dt>{zh ? '攻击档位' : 'Attack tier'}</dt><dd>T{card.tier}</dd></div>}
    </dl>
    <p className="card-hover-description">{card.description[lang]}</p>
    {tempCount > 0 && <p className="card-hover-note">{zh ? '临时技能，本局可用' : 'Temporary skill, available this match'} ×{tempCount}</p>}
    {(player?.disabledSkills?.includes(card.id) || shortage > 0) && <p className="card-hover-blocked">{player?.disabledSkills?.includes(card.id)
      ? (zh ? '此招式已禁用' : 'This skill is disabled') : zh ? `还需 ${shortage} 能量` : `Need ${shortage} more energy`}</p>}
    <footer>
      <p>{card.combatLevel !== undefined
        ? (zh ? '无尽成长：此永久攻击随当前等级提升，用于同档比较。基础牌、联合技、临时及吸收技能仍按原规则。' : 'Endless growth: this retained attack scales with your level for same-tier comparisons. Basic cards, combos, temporary and absorbed skills keep their original rules.')
        : player?.endlessLevel !== undefined
        ? (zh ? '此牌保持原等级。无尽中只有保留的等级攻击随等级成长，基础牌、联合技、临时及吸收技能不提升。' : 'This card keeps its original level. Only retained leveled attacks grow in Endless; basic cards, combos, temporary and absorbed skills do not.')
        : (zh ? '升级解锁新招，不会强化旧招。' : 'Upgrades unlock new moves without strengthening old moves.')}</p>
      {offensive && <p>{zh ? '对攻先比档位，再按技能规则比较等级。轰轰有打平例外。' : 'Clashes compare tiers first, then follow skill level rules. Double Blast has a tie exception.'}</p>}
      <p>{zh ? '能量费用不是伤害。' : 'Energy cost is not damage.'}</p>
    </footer>
  </div>, anchor.closest('dialog[open]') ?? document.body);
}
