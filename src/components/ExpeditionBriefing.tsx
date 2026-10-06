import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Lang, LogEntry } from '../types';
import PixelCardArt from './PixelCardArt';
import { SKILL_DB } from '../data/skills';
import { EXPEDITION_STAGES, EXPEDITION_START_HP } from '../data/expedition';
import { MAX_HP } from '../data/constants';
import './ExpeditionBriefing.css';

export interface ExpeditionRecap {
  turn: number;
  hpBefore: number;
  hpAfter: number;
  energyBefore: number;
  energyAfter: number;
  cards: { name: string; id: string }[];
  logs: LogEntry[];
}

export default function ExpeditionBriefing({ lang, recap, onClose, onPractice, onStart }: {
  lang: Lang; recap?: ExpeditionRecap; onClose: () => void; onPractice: () => void; onStart?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const zh = lang === 'zh';
  const result = recap && (recap.hpAfter <= 0
    ? (zh ? '这次倒下了。重开会清空本轮成长，历史最佳与练习记录保留。' : 'This run ended. Restart resets run growth; your best and practice records remain.')
    : recap.hpAfter < recap.hpBefore
      ? (zh ? `生命减少 ${recap.hpBefore - recap.hpAfter}，看看哪张牌突破了你。` : `Lost ${recap.hpBefore - recap.hpAfter} HP. Check which move got through.`)
      : recap.hpAfter > recap.hpBefore
        ? (zh ? `生命恢复了 ${recap.hpAfter - recap.hpBefore}。` : `Recovered ${recap.hpAfter - recap.hpBefore} HP.`)
        : recap.energyAfter > recap.energyBefore
          ? (zh ? `生命保住了，能量增加 ${recap.energyAfter - recap.energyBefore}。` : `HP held steady; energy rose by ${recap.energyAfter - recap.energyBefore}.`)
          : (zh ? '生命没有减少；具体攻防结果可以展开查看。' : 'HP did not decrease. Open the details for the actual move interactions.'));
  const recapCards = (cards: ExpeditionRecap['cards']) => <div className="exp-recap-cards">{cards.map((card, index) => <figure key={`${card.name}-${index}`}><PixelCardArt id={card.id} /><figcaption>{card.name}<strong>{SKILL_DB.find(skill => skill.id === card.id)?.name[lang]}</strong></figcaption></figure>)}</div>;
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog ref={dialog} className="exp-briefing" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={titleId}>{recap ? (zh ? `第 ${recap.turn} 回合` : `Turn ${recap.turn}`) : (zh ? '远征速览' : 'Expedition at a glance')}</h2>
      <button type="button" onClick={onClose} aria-label={zh ? '关闭' : 'Close'}>×</button></header>
    {recap ? <>
      <p className="exp-recap-stats">♥ {recap.hpBefore} → {recap.hpAfter} <span>⚡ {recap.energyBefore} → {recap.energyAfter}</span></p>
      {recapCards(recap.cards.slice(0, 3))}
      <p className="exp-recap-result">{result}</p>
      <details className="exp-briefing-details"><summary>{zh ? '展开出牌与结算详情' : 'Show moves and resolution details'}</summary>
        {recap.cards.length > 3 && recapCards(recap.cards.slice(3))}
        <ul className="exp-recap-log">{recap.logs.map((log, index) => <li key={index}>{log.text}</li>)}</ul>
        <p className="exp-briefing-note">{zh ? '平手也扣能量；多人混战中，其他人的攻击仍会分别结算。' : 'Ties still cost energy; each other opponent can also hit you.'}</p>
      </details>
    </> : <>
      <div className="exp-briefing-rules">
        <article><PixelCardArt id="charge" /><p>{zh ? '攒能量，抓对手攒时出手。' : 'Build energy; attack when the opponent Charges.'}</p></article>
        <article><PixelCardArt id="defend" /><p>{zh ? '听台词，看出招，自己判断。' : 'Listen, watch their moves, and make your own read.'}</p></article>
        <article><PixelCardArt id="pegasus" /><p>{zh ? '过关选强化，再决定休整或挑战。' : 'Choose a reward, then rest or take a risk.'}</p></article>
      </div>
      <p className="exp-briefing-note">{zh ? '重开清空本轮成长，保留历史最佳与练习记录；退出或刷新不保存本轮。' : 'Restart clears run growth, keeping your best and practice records. Leaving or refreshing does not save this run.'}</p>
      <details className="exp-briefing-details"><summary>{zh ? '更多规则' : 'More rules'}</summary>
        <p>{zh ? `打过全部 ${EXPEDITION_STAGES.length} 关即通关。每关击败所有对手才能领奖；对手之间也会互打。` : `Clear all ${EXPEDITION_STAGES.length} stages to win. Defeat every opponent for a reward; they can hit each other too.`}</p>
        <p>{zh ? '双方同时出牌，台词不是出牌预告。攒通常获得 2 能量，受到 1 点伤害会被打断。' : 'Moves resolve together. Dialogue is not a move preview. Charge normally gains 2 energy; taking 1 damage interrupts it.'}</p>
        <p>{zh ? '本轮升级最高 Lv.5，只解锁新招，不增强旧牌。重开时等级、金币、遗物、装备和秘技清空。' : 'Levels unlock moves up to Lv.5 this run; old moves are unchanged. Restart clears levels, gold, relics, gear and limited skills.'}</p>
        <p>{zh ? `远征从 ${EXPEDITION_START_HP} 血开始，装备只在本轮有效。多人从 ${MAX_HP} 血开始：淘汰后若至少两人存活，幸存者回到 ${MAX_HP} 血，能量和层数归零；远征没有这次重置。基础攻防规则相同。` : `Expedition starts at ${EXPEDITION_START_HP} HP; gear lasts for this run. Multiplayer starts at ${MAX_HP} HP: after an elimination with at least two survivors, their HP resets to ${MAX_HP}, energy and layer to 0. Expedition has no such reset. Basic combat rules are shared.`}</p>
      </details>
    </>}
    <footer><button type="button" onClick={onPractice}>{zh ? '练习 / 查规则' : 'Practice / rules'}</button><button type="button" className="exp-briefing-primary" onClick={onStart ?? onClose}>{onStart ? (zh ? '开始远征' : 'Start expedition') : (zh ? '明白了' : 'Got it')}</button></footer>
  </dialog>, document.body);
}
