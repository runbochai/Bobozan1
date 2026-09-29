import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Lang } from '../types';
import type { RewardOption, ShopItem } from '../logic/expedition';
import { POTION_HEAL } from '../logic/expedition';
import { EXPEDITION_RELICS } from '../data/expedition';
import { SKILL_DB } from '../data/skills';
import { Coins, Crown, Swords, CheckCircle } from './PixelIcons';
import ExpeditionArt from './ExpeditionArt';
import './ExpeditionChoices.css';

interface Choice {
  id: string;
  name: string;
  detail: string;
  badge: string;
  tone: 'gold' | 'rose' | 'mint' | 'violet' | 'blue';
  card?: boolean;
  unlocks?: string[];
}

function skillChoice(id: string, uses: number, lang: Lang): Choice {
  const card = SKILL_DB.find(c => c.id === id);
  return { id, card: true, name: card?.name[lang] ?? id, badge: `×${uses}`, tone: 'violet',
    detail: lang === 'zh'
      ? `限次秘技，可用 ${uses} 次。${card ? `每次消耗 ${card.cost} 能量。${card.description.zh}` : ''}`
      : `Limited skill: ${uses} uses.${card ? ` Costs ${card.cost} Energy per use. ${card.description.en}` : ''}` };
}

function rewardChoice(reward: RewardOption, lang: Lang): Choice {
  const zh = lang === 'zh';
  switch (reward.kind) {
    case 'temp': return skillChoice(reward.cardId, reward.uses, lang);
    case 'levelup': return { id: 'levelup', name: zh ? '升级' : 'Level up', badge: `Lv.${reward.level}`, tone: 'gold',
      detail: zh ? `本轮远征升至 Lv.${reward.level}，解锁以下技能。` : `Reach Lv.${reward.level} for this run and unlock these skills.`,
      unlocks: SKILL_DB.filter(c => c.levelRequired === reward.level).map(c => c.id) };
    case 'heal': return { id: 'heal', name: zh ? '治疗' : 'Heal', badge: `+${reward.amount} HP`, tone: 'rose',
      detail: zh ? `立即恢复 ${reward.amount} 点血量，不超过血量上限。` : `Restore ${reward.amount} HP, up to your maximum.` };
    case 'maxhp': return { id: 'maxhp', name: zh ? '体魄' : 'Vigor', badge: '+0.5 HP', tone: 'mint',
      detail: zh ? '本轮远征血量上限 +0.5，同时恢复 0.5 点血量。' : 'Gain 0.5 max HP for this run and restore 0.5 HP.' };
    case 'relic': {
      const relic = EXPEDITION_RELICS.find(r => r.id === reward.relicId)!;
      return { id: relic.id, name: relic.name[lang], tone: relic.rarity === 'rare' ? 'gold' : 'blue',
        badge: zh ? (relic.rarity === 'rare' ? '稀有遗物' : '遗物') : (relic.rarity === 'rare' ? 'Rare relic' : 'Relic'),
        detail: `${relic.desc[lang]}${zh ? '。本轮远征有效。' : '. Lasts for this run.'}` };
    }
  }
}

function shopChoice(item: ShopItem, lang: Lang): Choice {
  if (item.kind === 'tempcard') return skillChoice(item.cardId, item.uses, lang);
  if (item.kind === 'potion') return { id: 'potion', name: lang === 'zh' ? '疗伤药' : 'Potion', badge: `+${POTION_HEAL} HP`, tone: 'rose',
    detail: lang === 'zh' ? `立即恢复 ${POTION_HEAL} 点血量，不超过血量上限。` : `Restore ${POTION_HEAL} HP, up to your maximum.` };
  return { id: item.equipment.id, name: item.equipment.name[lang], badge: lang === 'zh' ? '装备' : 'Gear', tone: 'gold',
    detail: `${item.equipment.desc[lang]}${lang === 'zh' ? '。本轮远征有效。' : '. Lasts for this run.'}` };
}

function ChoiceCard({ choice, lang, price, gold = 0, onChoose }: {
  choice: Choice; lang: Lang; price?: number; gold?: number; onChoose: () => void;
}) {
  const [show, setShow] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const root = useRef<HTMLElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipId = useId();
  const isShop = price !== undefined;
  const affordable = !isShop || gold >= price;
  const close = () => { setShow(false); setPinned(false); };
  const cancelLeave = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); };
  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);
  useEffect(() => {
    if (!show) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setShow(false); setPinned(false); } };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setShow(false); setPinned(false); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [show]);
  useLayoutEffect(() => {
    if (!show) return;
    const place = () => {
      if (!root.current || !tip.current) return;
      const card = root.current.getBoundingClientRect();
      const box = tip.current.getBoundingClientRect();
      const below = card.bottom + 8;
      setPosition({ left: Math.max(12, Math.min(card.left + (card.width - box.width) / 2, window.innerWidth - box.width - 12)),
        top: Math.max(12, Math.min(below + box.height <= window.innerHeight - 12 ? below : card.top - box.height - 8, window.innerHeight - box.height - 12)) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [show]);

  return <article ref={root} className={`expedition-choice tone-${choice.tone}${affordable ? '' : ' is-unaffordable'}`} data-choice={choice.id}
    onPointerEnter={e => { if (e.pointerType === 'mouse' && window.matchMedia('(min-width: 641px)').matches) { cancelLeave(); setShow(true); } }}
    onPointerLeave={() => { if (!pinned) leaveTimer.current = setTimeout(() => setShow(false), 140); }}
    onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) close(); }}>
    <button type="button" className="expedition-choose" aria-describedby={tipId} aria-disabled={!affordable}
      aria-label={`${choice.name} · ${choice.badge}${isShop ? ` · ${price} ${lang === 'zh' ? '金币' : 'gold'}${affordable ? '' : lang === 'zh' ? '，金币不足' : ', not enough gold'}` : ''}`}
      onFocus={e => { if (e.currentTarget.matches(':focus-visible')) setShow(true); }}
      onClick={() => { if (affordable) { close(); onChoose(); } else setShow(true); }}>
      <span className="expedition-art-stage" aria-hidden="true"><span className="expedition-art-halo" /><span className="expedition-art-sparks" />
        <span className="expedition-art-float"><ExpeditionArt id={choice.id} card={choice.card} /></span>
      </span>
      <span className="expedition-choice-name">{choice.name}</span>
      <span className="expedition-choice-badge">{choice.badge}</span>
      <span className="expedition-choice-action">{isShop ? <><Coins size={18} /> {price}</> : <><CheckCircle size={16} /> {lang === 'zh' ? '选择' : 'Choose'}</>}</span>
    </button>
    <button type="button" className="expedition-info" aria-label={`${lang === 'zh' ? '查看详情：' : 'Details: '}${choice.name}`} aria-expanded={show} aria-controls={tipId}
      onClick={() => { cancelLeave(); if (pinned) close(); else { setPinned(true); setShow(true); } }}>i</button>
    <div ref={tip} id={tipId} role="tooltip" hidden={!show} className="expedition-detail" style={position}
      onPointerEnter={cancelLeave}>
      <strong>{choice.name}</strong><p>{choice.detail}</p>
      {!affordable && <p className="expedition-shortfall">{lang === 'zh' ? `还差 ${price! - gold} 金币` : `Need ${price! - gold} more gold`}</p>}
      {!!choice.unlocks?.length && <div className="expedition-unlocks">{choice.unlocks.map(id => <span key={id}>
        <ExpeditionArt id={id} card /><span>{SKILL_DB.find(c => c.id === id)?.name[lang]}</span>
      </span>)}</div>}
    </div>
  </article>;
}

function ChoicePanel({ title, subtitle, shop, gold, children, footer }: {
  title: string; subtitle: string; shop?: boolean; gold?: number; children: ReactNode; footer?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useEffect(() => {
    const modal = dialog.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal.showModal();
    titleRef.current?.focus();
    return () => { modal.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={dialog} className={`expedition-panel${shop ? ' expedition-shop' : ' expedition-rewards'}`} aria-labelledby={titleId} onCancel={e => e.preventDefault()}>
    <header className="expedition-panel-heading">
      <span className="expedition-heading-art" aria-hidden="true">{shop ? <ExpeditionArt id="treasurepot" /> : <Crown size={38} />}</span>
      <div><h2 id={titleId} ref={titleRef} tabIndex={-1}>{title}</h2><p>{subtitle}</p></div>
      {shop && <span className="expedition-wallet" aria-label={`${gold} gold`}><Coins size={22} /><span>{gold}</span></span>}
    </header>
    {children}
    {footer}
  </dialog>;
}

export function ExpeditionRewards({ rewards, lang, lesson, onChoose }: {
  rewards: RewardOption[]; lang: Lang; lesson?: number; onChoose: (reward: RewardOption) => void;
}) {
  return <ChoicePanel title={lang === 'zh' ? '选择奖励' : 'Choose a reward'}
    subtitle={lang === 'zh' ? `${lesson ? (lesson === 3 ? '新手三课完成 · ' : `第 ${lesson} 课完成 · `) : ''}${rewards.length} 选 1` : `${lesson ? `Lesson ${lesson} complete · ` : ''}Pick 1 of ${rewards.length}`}>
    <div className="expedition-choice-grid" data-count={rewards.length}>{rewards.map((reward, i) => <ChoiceCard key={i} choice={rewardChoice(reward, lang)} lang={lang} onChoose={() => onChoose(reward)} />)}</div>
  </ChoicePanel>;
}

export function ExpeditionShop({ items, gold, lang, onBuy, onContinue }: {
  items: ShopItem[]; gold: number; lang: Lang; onBuy: (item: ShopItem, index: number) => void; onContinue: () => void;
}) {
  const [acquired, setAcquired] = useState<Choice | null>(null);
  useEffect(() => { if (!acquired) return; const timer = setTimeout(() => setAcquired(null), 1800); return () => clearTimeout(timer); }, [acquired]);
  return <ChoicePanel shop title={lang === 'zh' ? '远征商城' : 'Expedition shop'} subtitle={lang === 'zh' ? '战前补给' : 'Prepare for battle'} gold={gold}
    footer={<footer className="expedition-panel-footer"><div className="expedition-acquired" role="status" aria-live="polite">{acquired && <span key={acquired.id}><CheckCircle size={20} />{lang === 'zh' ? '获得 ' : 'Got '}{acquired.name}</span>}</div>
      <button type="button" className="expedition-continue" onClick={onContinue}><Swords size={22} />{lang === 'zh' ? '继续出战' : 'Next battle'}</button></footer>}>
    <div className="expedition-choice-grid" data-count={items.length}>{items.map((item, i) => {
      const choice = shopChoice(item, lang);
      const price = item.kind === 'equipment' ? item.equipment.price : item.price;
      return <ChoiceCard key={`${choice.id}-${i}`} choice={choice} lang={lang} price={price} gold={gold} onChoose={() => {
        setAcquired(choice); onBuy(item, i);
        requestAnimationFrame(() => { if (document.activeElement === document.body) document.querySelector<HTMLButtonElement>('.expedition-continue')?.focus(); });
      }} />;
    })}</div>
  </ChoicePanel>;
}
